import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Step 0: Starting generate-recommendations...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase config missing');

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    console.log('Step 0.5: Validating JWT claims...');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Step 0.5 failed: JWT claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;
    console.log('Step 0.5: JWT validated, userId:', userId);

    // Use service role for data access (RLS is now owner-only)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const RequestSchema = z.object({
      tripId: z.string().uuid('Invalid trip ID format'),
    });
    const parseResult = RequestSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid request: trip ID must be a valid UUID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { tripId } = parseResult.data;
    console.log('Step 0.9: tripId parsed:', tripId);

    // 1. Fetch trip data and verify ownership
    console.log('Step 1: Fetching trip data...');
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    if (tripError || !trip) {
      console.error('Step 1 failed: Trip not found:', tripError);
      throw new Error(`Trip not found: ${tripError?.message}`);
    }
    console.log('Step 1: Trip fetched:', trip.trip_name);

    if (trip.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden: you do not own this trip' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch guests
    console.log('Step 2: Fetching guests...');
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('trip_id', tripId);
    if (guestsError) console.error('Step 2 warning: guests fetch error:', guestsError);
    console.log('Step 2: Guests fetched:', (guests || []).length, 'guests');

    // 3. Fetch resort data
    console.log('Step 3: Calling fetch-resort-data...');
    const resortRes = await fetch(`${SUPABASE_URL}/functions/v1/fetch-resort-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ regions: trip.geography, dateStart: trip.date_start, dateEnd: trip.date_end }),
    });
    if (!resortRes.ok) {
      const resortErrBody = await resortRes.text();
      console.error('Step 3 failed: fetch-resort-data returned', resortRes.status, resortErrBody);
      throw new Error(`Failed to fetch resort data: ${resortRes.status}`);
    }
    const resortData = await resortRes.json();
    if (!resortData.resorts) {
      console.error('Step 3 failed: No resorts in response:', JSON.stringify(resortData).substring(0, 500));
      throw new Error('Failed to fetch resort data');
    }
    console.log('Step 3: Resort data fetched:', resortData.resorts.length, 'resorts');

    // Build resort lookup for enrichment
    const resortLookup: Record<string, any> = {};
    resortData.resorts.forEach((r: any) => { resortLookup[r.name] = r; });

    // 4. Calculate trip duration
    let nights = 5;
    if (trip.date_start && trip.date_end) {
      const start = new Date(trip.date_start);
      const end = new Date(trip.date_end);
      nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    console.log('Step 4: Trip duration:', nights, 'nights');

    // 5. Fetch lodging data
    console.log('Step 5: Calling fetch-lodging...');
    const lodgingRes = await fetch(`${SUPABASE_URL}/functions/v1/fetch-lodging`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        resorts: resortData.resorts,
        groupSize: trip.group_size,
        lodgingPreference: trip.lodging_preference || 'Hotel',
        nights,
      }),
    });
    if (!lodgingRes.ok) {
      const lodgingErrBody = await lodgingRes.text();
      console.error('Step 5 failed: fetch-lodging returned', lodgingRes.status, lodgingErrBody);
    }
    const lodgingData = await lodgingRes.json();
    console.log('Step 5: Lodging data fetched, keys:', Object.keys(lodgingData.lodging || {}).length);

    // 6. Attempt to fetch flight data
    console.log('Step 6: Preparing flight data fetch...');
    let flightData: any = null;
    try {
      const origins = (guests || [])
        .filter((g: any) => g.airport_code && /^[A-Z]{3,4}$/.test(g.airport_code))
        .map((g: any) => ({ airport: g.airport_code, guestName: g.name }));

      console.log('Step 6: Valid origins:', JSON.stringify(origins));

      if (origins.length > 0 && trip.date_start && trip.date_end) {
        console.log('Step 6: Calling fetch-flights...');
        const flightRes = await fetch(`${SUPABASE_URL}/functions/v1/fetch-flights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            origins,
            departureDate: trip.date_start,
            returnDate: trip.date_end,
            resorts: resortData.resorts.map((r: any) => r.name),
          }),
        });
        console.log('Step 6: fetch-flights response status:', flightRes.status);
        if (flightRes.ok) {
          flightData = await flightRes.json();
          console.log('Step 6: Flight data received, origins in data:', Object.keys(flightData.flights || {}).length);
        } else {
          const flightErrBody = await flightRes.text();
          console.error('Step 6 failed: fetch-flights returned', flightRes.status, flightErrBody);
        }
      } else {
        console.log('Step 6: Skipping flights - no valid origins or missing dates');
      }
    } catch (flightErr) {
      console.error('Step 6 failed with exception:', flightErr);
    }

    // 7. Parse vibe string
    const vibeObj: Record<string, string> = {};
    if (trip.vibe) {
      trip.vibe.split(',').forEach((part: string) => {
        const [key, val] = part.split(':');
        if (key && val) vibeObj[key.trim()] = val.trim();
      });
    }

    // 8. Build AI prompt with enriched output schema
    console.log('Step 8: Building AI prompt...');
    const systemPrompt = `You are an expert ski trip planner. Given a group's preferences, budget, skill levels, origin cities, pass types, vibe preferences, and real-time resort data including snow conditions, flight prices, and lodging options, recommend the top 3 ski resorts.

For each resort, provide:
1. A match score (0-100) reflecting how well it fits THIS specific group
2. A 2-sentence "summary" tailored to this group
3. A longer "whyThisResort" paragraph (3-5 sentences) explaining in detail why this resort is perfect for this group
4. Estimated total cost per person broken down:
   - flights_avg: average round-trip flight cost
   - lodging_per_person: based on the best lodging split for the group
   - lift_tickets: total lift ticket cost for the trip, accounting for pass discounts
   - misc: estimated food/transport/gear rental ($50-100/day)
   - total: sum of all above
5. Vibe match tags: array of emoji+label strings showing which vibes match (e.g. "🏔️ Ski-In/Ski-Out ✓", "🎉 Après Scene ✓", "✨ Luxury ✓")
6. A 5-day sample itinerary
7. Any warnings (e.g. "Long travel day from Boston", "Limited beginner terrain")
8. Snow conditions from the provided data
9. Per-guest estimated flight costs as "flightDetailsPerGuest": array of { guestName, origin, destinationAirport, estimatedCost, airline, stops, duration }. Use the actual flight data provided when available.

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "resortName": "string",
      "matchScore": number,
      "summary": "string",
      "whyThisResort": "string",
      "costBreakdown": {
        "flights_avg": number,
        "lodging_per_person": number,
        "lift_tickets": number,
        "misc": number,
        "total": number
      },
      "vibeMatchTags": ["string"],
      "itinerary": [
        { "day": 1, "morning": "string", "afternoon": "string", "evening": "string" }
      ],
      "warnings": ["string"],
      "snowConditions": { "currentSnowDepth": number, "last24hrSnowfall": number, "last7daysSnowfall": number, "seasonTotalSnowfall": number, "isHistorical": boolean, "historicalSnowDepth": number, "historicalSnowfall": number },
      "lodgingRecommendation": {
        "name": "string",
        "type": "string",
        "units": number,
        "pricePerNight": number,
        "costPerPerson": number
      },
      "flightDetailsPerGuest": [
        { "guestName": "string", "origin": "string", "destinationAirport": "string", "estimatedCost": number, "airline": "string", "stops": number, "duration": "string" }
      ]
    }
  ]
}`;

    const userMessage = `
## Trip Details
- Trip Name: ${trip.trip_name}
- Dates: ${trip.date_start || 'flexible'} to ${trip.date_end || 'flexible'} (${nights} nights)
- Group Size: ${trip.group_size} people
- Geography Preference: ${(trip.geography || []).join(', ') || 'No preference'}
- Vibe: Energy ${vibeObj.energy || '50'}/100 (0=relaxed, 100=party), Budget ${vibeObj.budget || '50'}/100 (0=value, 100=luxury), Skill ${vibeObj.skill || '50'}/100 (0=beginner, 100=expert), Ski-In/Out: ${vibeObj['ski-in-out'] || 'false'}
- Skill Range: ${trip.skill_min} to ${trip.skill_max}
- Budget: $${trip.budget_amount} ${trip.budget_type === 'per_person' ? 'per person' : 'total for group'}
- Pass Types: ${(trip.pass_types || []).join(', ') || 'None'}
- Lodging Preference: ${trip.lodging_preference || 'No preference'}

## Guests (${(guests || []).length} submitted)
${(guests || []).map((g: any) => `- ${g.name}: from ${g.origin_city || 'unknown'} (${g.airport_code || 'no airport'}), skill: ${g.skill_level}, budget: $${g.budget_min || '?'}-$${g.budget_max || '?'}`).join('\n')}

## Available Resorts with Snow Data
${resortData.resorts.map((r: any) => `- ${r.name} (${r.country}, ${r.region}): Pass: ${r.pass.join('/')}, Terrain: ${r.terrain.beginner}%beg/${r.terrain.intermediate}%int/${r.terrain.advanced}%adv/${r.terrain.expert}%exp, Lift ticket: $${r.liftTicket}, Snow: depth ${r.snow?.currentSnowDepth || r.snow?.historicalSnowDepth || 0}cm, 24hr ${r.snow?.last24hrSnowfall ?? 'N/A'}cm, 7day ${r.snow?.last7daysSnowfall ?? 'N/A'}cm, season total ${r.snow?.seasonTotalSnowfall ?? 'N/A'}cm${r.snow?.isHistorical ? ' (historical proxy from last season)' : ''}, Après: ${r.apresScore}/10, Non-skier: ${r.nonSkierScore}/10, Ski-in/out: ${r.skiInOut}, Vibes: ${r.vibeTags.join(', ')}`).join('\n')}

## Lodging Options
${Object.entries(lodgingData.lodging || {}).map(([name, data]: [string, any]) => {
  const best = data.bestSplits?.[0];
  return best ? `- ${name}: Best option: ${best.option.name} (${best.option.type}, $${best.option.pricePerNight}/night, ${best.units} units, $${best.costPerPerson}/person total)` : `- ${name}: No lodging data`;
}).join('\n')}

${flightData ? `## Flight Options\n${Object.entries(flightData.flights || {}).map(([origin, dests]: [string, any]) => 
  Object.entries(dests).map(([dest, options]: [string, any]) => {
    if (!options || !options.length) return `${origin} → ${dest}: No flights found`;
    return `${origin} → ${dest}:\n${options.map((o: any, i: number) => 
      `  Option ${i+1}: $${o.price} ${o.currency || 'USD'} — ${(o.airlines || []).join('/')} — Outbound: ${o.outbound?.stops ?? '?'} stop(s), ${o.outbound?.duration || 'N/A'} — Return: ${o.return?.stops ?? '?'} stop(s), ${o.return?.duration || 'N/A'}`
    ).join('\n')}`;
  }).join('\n')
).join('\n')}` : '## Flights: No flight price data available. Please estimate based on origin cities and resort locations.'}

Please recommend the top 3 resorts that best match this group's needs.`;

    // 9. Call AI
    console.log('Step 9: Calling AI gateway...');
    console.log('Step 9: Prompt length - system:', systemPrompt.length, 'user:', userMessage.length);
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error('Step 9 failed: AI API returned', aiResponse.status, errBody.substring(0, 500));
      throw new Error(`AI API call failed [${aiResponse.status}]: ${errBody}`);
    }
    console.log('Step 9: AI response received, status:', aiResponse.status);

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Step 9 failed: No content in AI response. Full response:', JSON.stringify(aiData).substring(0, 500));
      throw new Error('No content in AI response');
    }
    console.log('Step 9: AI content length:', content.length);

    // 10. Parse AI response
    console.log('Step 10: Parsing AI response...');
    let recommendations;
    try {
      recommendations = JSON.parse(content);
    } catch (parseErr) {
      console.error('Step 10: Direct JSON parse failed, trying markdown extraction...');
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[1]);
      } else {
        console.error('Step 10 failed: Could not parse AI response. First 500 chars:', content.substring(0, 500));
        throw new Error('Failed to parse AI response as JSON');
      }
    }
    console.log('Step 10: Parsed successfully, recommendations count:', recommendations.recommendations?.length);

    // 11. Enrich recommendations with resort metadata
    console.log('Step 11: Enriching recommendations...');
    const passTypes = trip.pass_types || [];
    if (recommendations.recommendations) {
      recommendations.recommendations = recommendations.recommendations.map((rec: any) => {
        const resortMeta = resortLookup[rec.resortName];
        if (resortMeta) {
          const allPasses = ['Ikon', 'Epic'];
          rec.passCoverage = allPasses.map(p => ({
            pass: `${p} Pass`,
            covered: resortMeta.pass.includes(p.toLowerCase()),
          }));
          rec.terrainBreakdown = resortMeta.terrain;
          rec.country = resortMeta.country;
          rec.region = resortMeta.region;
          rec.skiInOut = resortMeta.skiInOut;
        }
        return rec;
      });

      // Build flight summary for per-guest table
      const flightSummary: Record<string, Record<string, number | null>> = {};
      recommendations.recommendations.forEach((rec: any) => {
        if (rec.flightDetailsPerGuest) {
          rec.flightDetailsPerGuest.forEach((fd: any) => {
            const key = `${fd.guestName} (${fd.origin})`;
            if (!flightSummary[key]) flightSummary[key] = {};
            flightSummary[key][rec.resortName] = fd.estimatedCost;
          });
        }
      });
      recommendations.flightSummary = flightSummary;
    }
    console.log('Step 11: Enrichment complete');

    // 12. Store in database
    console.log('Step 12: Storing recommendations in database...');
    const { error: insertError } = await supabase
      .from('recommendations')
      .insert({
        trip_id: tripId,
        results: recommendations,
      });
    if (insertError) {
      console.error('Step 12 failed: Failed to store recommendations:', insertError);
    } else {
      console.log('Step 12: Recommendations stored successfully');
    }

    console.log('Step 13: Returning response');
    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-recommendations FULL error:', error, error instanceof Error ? error.stack : '(no stack)');
    const msg = error instanceof Error ? error.message : '';
    const safeMessages: Record<string, string> = {
      'tripId is required': 'Trip ID is required',
      'Forbidden: you do not own this trip': 'Access denied',
    };
    const safeMsg = safeMessages[msg] || 'Failed to generate recommendations. Please try again.';
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
