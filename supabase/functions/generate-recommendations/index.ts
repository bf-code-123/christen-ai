import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY'))!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;
    console.log('Auth ok, userId:', userId);

    // 2. Parse request
    const body = await req.json();
    const tripId = body?.tripId;
    if (!tripId || typeof tripId !== 'string') {
      return new Response(JSON.stringify({ error: 'tripId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch trip + guests from DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const [{ data: trip, error: tripError }, { data: guests }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('guests').select('*').eq('trip_id', tripId),
    ]);

    if (tripError || !trip) throw new Error('Trip not found');
    if (trip.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Trip:', trip.trip_name, '| Guests:', (guests || []).length);

    const nights = (trip.date_start && trip.date_end)
      ? Math.max(1, Math.round((new Date(trip.date_end).getTime() - new Date(trip.date_start).getTime()) / 86400000))
      : 5;

    // 4. Resort data (snow conditions)
    console.log('Fetching resort data...');
    const resortRes = await fetch(`${SUPABASE_URL}/functions/v1/fetch-resort-data`, {
      method: 'POST',
      signal: AbortSignal.timeout(35000),
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ regions: trip.geography, dateStart: trip.date_start, dateEnd: trip.date_end }),
    });
    if (!resortRes.ok) throw new Error(`fetch-resort-data failed: ${resortRes.status}`);
    const { resorts } = await resortRes.json();
    console.log('Resorts:', resorts.length);

    // 5. Lodging options (needs resort list from step 4)
    console.log('Fetching lodging...');
    let lodgingByResort: Record<string, any> = {};
    try {
      const lodgingRes = await fetch(`${SUPABASE_URL}/functions/v1/fetch-lodging`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          resorts: resorts.map((r: any) => ({ name: r.name, lodgingRange: r.lodgingRange })),
          groupSize: trip.group_size,
          lodgingPreference: trip.lodging_preference || 'Hotel',
          nights,
        }),
      });
      if (lodgingRes.ok) {
        const lodgingData = await lodgingRes.json();
        lodgingByResort = lodgingData.lodging || {};
      }
    } catch (e) {
      console.error('Lodging fetch failed (non-fatal):', e);
    }
    console.log('Lodging keys:', Object.keys(lodgingByResort).length);

    // 6. Build prompt
    const vibeObj: Record<string, string> = {};
    if (trip.vibe) {
      trip.vibe.split(',').forEach((part: string) => {
        const [key, val] = part.split(':');
        if (key && val) vibeObj[key.trim()] = val.trim();
      });
    }

    const systemPrompt = `You are an expert ski trip planner. Given a group's preferences, budget, skill levels, origin cities, pass types, vibe, and real-time resort snow data and lodging options, recommend the top 3 ski resorts.

For each resort provide:
1. matchScore (0-100)
2. summary: 2-sentence summary for this group
3. whyThisResort: 3-5 sentence explanation
4. costBreakdown per person: flights_avg (estimate from origin cities), lodging_per_person, lift_tickets (with pass discounts), misc ($50-100/day), total
5. vibeMatchTags: array of emoji+label strings (e.g. "🎉 Après Scene ✓")
6. itinerary: 5-day sample
7. warnings: array of strings
8. snowConditions from provided data
9. lodgingRecommendation: best option for the group
10. flightDetailsPerGuest: estimated flights per guest based on their origin city

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "resortName": "string",
      "matchScore": number,
      "summary": "string",
      "whyThisResort": "string",
      "costBreakdown": { "flights_avg": number, "lodging_per_person": number, "lift_tickets": number, "misc": number, "total": number },
      "vibeMatchTags": ["string"],
      "itinerary": [{ "day": 1, "morning": "string", "afternoon": "string", "evening": "string" }],
      "warnings": ["string"],
      "snowConditions": { "currentSnowDepth": number, "last24hrSnowfall": number, "last7daysSnowfall": number, "seasonTotalSnowfall": number, "isHistorical": boolean, "historicalSnowDepth": number, "historicalSnowfall": number },
      "lodgingRecommendation": { "name": "string", "type": "string", "units": number, "pricePerNight": number, "costPerPerson": number },
      "flightDetailsPerGuest": [{ "guestName": "string", "origin": "string", "destinationAirport": "string", "estimatedCost": number, "airline": "string", "stops": number, "duration": "string" }]
    }
  ]
}`;

    const resortLines = resorts.map((r: any) => {
      const snow = r.snow || {};
      const depth = snow.currentSnowDepth ?? snow.historicalSnowDepth ?? 0;
      const recent = snow.last7daysSnowfall ?? snow.historicalSnowfall ?? 0;
      const historical = snow.isHistorical ? ' (historical)' : '';
      return `- ${r.name} (${r.country}): Pass: ${r.pass.join('/')}, Terrain: ${r.terrain.beginner}%beg/${r.terrain.intermediate}%int/${r.terrain.advanced}%adv/${r.terrain.expert}%exp, Lift: $${r.liftTicket}, Snow depth: ${depth}cm, 7-day snowfall: ${recent}cm${historical}, Après: ${r.apresScore}/10, Non-skier: ${r.nonSkierScore}/10, Ski-in/out: ${r.skiInOut}, Vibes: ${r.vibeTags.join(', ')}`;
    }).join('\n');

    const lodgingLines = Object.entries(lodgingByResort).map(([name, data]: [string, any]) => {
      const best = data.bestSplits?.[0];
      return best
        ? `- ${name}: ${best.option.name} (${best.option.type}, $${best.option.pricePerNight}/night, ${best.units} units needed, $${best.costPerPerson}/person total)`
        : `- ${name}: no lodging data`;
    }).join('\n') || 'No lodging data available — please estimate.';

    const guestLines = (guests || []).map((g: any) =>
      `- ${g.name}: from ${g.origin_city || 'unknown'} (airport: ${g.airport_code || 'unknown'}), skill: ${g.skill_level}, budget: $${g.budget_min ?? '?'}-$${g.budget_max ?? '?'}`
    ).join('\n') || 'No guests submitted yet.';

    const userMessage = `## Trip Details
- Name: ${trip.trip_name}
- Dates: ${trip.date_start || 'flexible'} to ${trip.date_end || 'flexible'} (${nights} nights)
- Group size: ${trip.group_size}
- Geography preference: ${(trip.geography || []).join(', ') || 'No preference'}
- Vibe: Energy ${vibeObj.energy || '50'}/100 (0=relaxed, 100=party), Budget ${vibeObj.budget || '50'}/100 (0=value, 100=luxury), Skill ${vibeObj.skill || '50'}/100, Ski-in/out: ${vibeObj['ski-in-out'] || 'false'}
- Skill range: ${trip.skill_min} to ${trip.skill_max}
- Budget: $${trip.budget_amount} ${trip.budget_type === 'per_person' ? 'per person' : 'total'}
- Pass types: ${(trip.pass_types || []).join(', ') || 'None'}
- Lodging preference: ${trip.lodging_preference || 'No preference'}

## Guests
${guestLines}

## Available Resorts with Snow Data
${resortLines}

## Lodging Options
${lodgingLines}

Please recommend the top 3 resorts for this group.`;

    // 7. Call Gemini
    console.log('Calling Gemini, prompt chars:', systemPrompt.length + userMessage.length);
    const aiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      signal: AbortSignal.timeout(40000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    });
    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Gemini failed [${aiRes.status}]: ${err.substring(0, 300)}`);
    }
    const aiData = await aiRes.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty Gemini response');
    console.log('Gemini ok, content length:', content.length);

    // 8. Parse + enrich
    let recommendations: any;
    try {
      recommendations = JSON.parse(content);
    } catch {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) recommendations = JSON.parse(match[1]);
      else throw new Error('Could not parse Gemini JSON response');
    }

    const resortLookup: Record<string, any> = {};
    resorts.forEach((r: any) => { resortLookup[r.name] = r; });

    if (recommendations.recommendations) {
      recommendations.recommendations = recommendations.recommendations.map((rec: any) => {
        const meta = resortLookup[rec.resortName];
        if (meta) {
          rec.passCoverage = ['Ikon', 'Epic'].map(p => ({
            pass: `${p} Pass`,
            covered: meta.pass.includes(p.toLowerCase()),
          }));
          rec.terrainBreakdown = meta.terrain;
          rec.country = meta.country;
          rec.region = meta.region;
          rec.skiInOut = meta.skiInOut;
        }
        return rec;
      });

      const flightSummary: Record<string, Record<string, number | null>> = {};
      recommendations.recommendations.forEach((rec: any) => {
        rec.flightDetailsPerGuest?.forEach((fd: any) => {
          const key = `${fd.guestName} (${fd.origin})`;
          if (!flightSummary[key]) flightSummary[key] = {};
          flightSummary[key][rec.resortName] = fd.estimatedCost;
        });
      });
      recommendations.flightSummary = flightSummary;
    }

    // 9. Store
    const { error: insertError } = await supabase.from('recommendations').insert({
      trip_id: tripId,
      results: recommendations,
    });
    if (insertError) console.error('DB insert failed (non-fatal):', insertError);

    console.log('Done.');
    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('generate-recommendations error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate recommendations. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
