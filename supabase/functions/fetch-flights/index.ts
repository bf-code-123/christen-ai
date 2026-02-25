console.log("fetch-flights: module loading");

import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Airline alliance membership
const ALLIANCE_CARRIERS: Record<string, string[]> = {
  oneworld:      ["AA", "BA", "IB", "CX", "QF", "JL", "AY", "MH", "QR", "RJ", "S7", "UL", "AT", "AS"],
  star_alliance: ["UA", "LH", "SQ", "AC", "TK", "LX", "OS", "SK", "SN", "OZ", "NH", "CA", "ET", "EW", "G3", "MS", "NZ", "OU", "SA", "YM"],
  skyteam:       ["DL", "AF", "KL", "KE", "MU", "CZ", "AM", "AR", "AZ", "CI", "CX", "GA", "MF", "ME", "OK", "RO", "SV", "VN", "VY", "WS", "XL"],
};
const ALL_ALLIANCE_CARRIERS = new Set(Object.values(ALLIANCE_CARRIERS).flat());

// Map resorts to nearest major airports
const RESORT_AIRPORTS: Record<string, string> = {
  // North America
  "Whistler Blackcomb": "YVR", "Vail": "DEN", "Park City": "SLC",
  "Jackson Hole": "JAC", "Telluride": "MTJ", "Mammoth Mountain": "MMH",
  "Steamboat": "HDN", "Stowe": "BTV", "Sunday River": "PWM",
  "Killington": "BTV", "Big Sky": "BZN", "Taos Ski Valley": "ABQ",
  "Alta": "SLC", "Snowbird": "SLC", "Arapahoe Basin": "DEN",
  "Banff Sunshine": "YYC", "Lake Louise": "YYC",
  "Mont-Tremblant": "YUL", "Revelstoke": "YLW",
  "Aspen Snowmass": "ASE", "Deer Valley": "SLC",
  "Breckenridge": "DEN", "Copper Mountain": "DEN",
  "Squaw Valley / Palisades": "RNO", "Sun Valley": "SUN",
  "Winter Park": "DEN",
  // Europe
  "Chamonix": "GVA", "Verbier": "GVA", "Zermatt": "GVA",
  "Val d'Isère": "GVA", "Courchevel": "GVA", "St. Anton": "INN",
  "Kitzbühel": "INN", "Innsbruck/Axamer Lizum": "INN",
  "Axamer Lizum": "INN",
  "Les Arcs": "GVA", "Tignes": "GVA",
  // Japan
  "Niseko": "CTS", "Hakuba": "NRT", "Furano": "CTS", "Nozawa Onsen": "NRT",
};

interface FlightSegment {
  carrierCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
}

interface FlightLeg {
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  segments: FlightSegment[];
}

interface FlightOption {
  price: number;
  currency: string;
  airlines: string[];
  originAirport: string;
  outbound: FlightLeg;
  return: FlightLeg;
}

interface FlightPicks {
  cheapest: FlightOption | null;
  mostDirect: FlightOption | null;
}

async function getAmadeusToken(): Promise<string> {
  const clientId = Deno.env.get("AMADEUS_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AMADEUS_CLIENT_SECRET")!;

  console.log("fetch-flights: requesting Amadeus token, clientId present:", !!clientId);

  const res = await fetch(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amadeus auth failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  console.log("fetch-flights: Amadeus token obtained");
  return data.access_token;
}

function parseItinerary(itinerary: any): FlightLeg {
  const segments = itinerary.segments || [];
  const parsedSegments: FlightSegment[] = segments.map((seg: any) => ({
    carrierCode: seg.carrierCode || "",
    flightNumber: `${seg.carrierCode || ""}${seg.number || ""}`,
    departureAirport: seg.departure?.iataCode || "",
    arrivalAirport: seg.arrival?.iataCode || "",
    departureTime: seg.departure?.at || "",
    arrivalTime: seg.arrival?.at || "",
  }));

  return {
    departure: segments[0]?.departure?.at || "",
    arrival: segments[segments.length - 1]?.arrival?.at || "",
    duration: itinerary.duration || "",
    stops: Math.max(0, segments.length - 1),
    segments: parsedSegments,
  };
}

function pickBestFlights(options: FlightOption[]): FlightPicks {
  if (options.length === 0) return { cheapest: null, mostDirect: null };

  // Cheapest by price
  const cheapest = options.reduce((a, b) => a.price < b.price ? a : b);

  // Most direct: fewest total stops, then lowest price
  const sorted = [...options].sort((a, b) => {
    const stopsA = a.outbound.stops + a.return.stops;
    const stopsB = b.outbound.stops + b.return.stops;
    if (stopsA !== stopsB) return stopsA - stopsB;
    return a.price - b.price;
  });

  let mostDirect = sorted[0];
  // If mostDirect is the same object as cheapest, pick next-best
  if (mostDirect === cheapest && sorted.length > 1) {
    mostDirect = sorted[1];
  } else if (mostDirect === cheapest) {
    // Only one option — mostDirect and cheapest are the same, return null for mostDirect
    // so UI can show "Best Option" instead of duplicating
    return { cheapest, mostDirect: null };
  }

  return { cheapest, mostDirect };
}

async function searchAndPickFlights(
  token: string,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<FlightPicks> {
  // Check cache (6-hour TTL on result_json)
  const cacheKey = `${origin}-${destination}-${departureDate}-${returnDate}`;
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  try {
    const { data: cached } = await supabaseClient
      .from("flight_cache")
      .select("result_json, updated_at")
      .eq("origin", origin)
      .eq("destination", destination)
      .eq("departure_date", departureDate)
      .eq("return_date", returnDate)
      .gte("updated_at", sixHoursAgo)
      .single();

    if (cached?.result_json) {
      console.log(`fetch-flights: cache hit for ${cacheKey}`);
      return cached.result_json as FlightPicks;
    }
  } catch (_) {
    // Cache miss — proceed to fetch
  }

  // Fetch from Amadeus
  const url = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
  url.searchParams.set("originLocationCode", origin);
  url.searchParams.set("destinationLocationCode", destination);
  url.searchParams.set("departureDate", departureDate);
  url.searchParams.set("returnDate", returnDate);
  url.searchParams.set("adults", "1");
  url.searchParams.set("nonStop", "false");
  url.searchParams.set("currencyCode", "USD");
  url.searchParams.set("max", "10");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`Flight search failed ${origin}->${destination}: ${res.status}`);
    return { cheapest: null, mostDirect: null };
  }

  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    return { cheapest: null, mostDirect: null };
  }

  // Parse all offers
  let options: FlightOption[] = data.data.map((offer: any) => {
    const itineraries = offer.itineraries || [];

    const allCarriers = new Set<string>();
    for (const itin of itineraries) {
      for (const seg of (itin.segments || [])) {
        if (seg.carrierCode) allCarriers.add(seg.carrierCode);
      }
    }

    const outbound = itineraries[0] ? parseItinerary(itineraries[0]) : {
      departure: "", arrival: "", duration: "", stops: 0, segments: [],
    };
    const returnLeg = itineraries[1] ? parseItinerary(itineraries[1]) : {
      departure: "", arrival: "", duration: "", stops: 0, segments: [],
    };

    return {
      price: parseFloat(offer.price?.total || "0"),
      currency: offer.price?.currency || "USD",
      airlines: [...allCarriers],
      originAirport: origin,
      outbound,
      return: returnLeg,
    };
  });

  // Filter to alliance carriers; fall back to all if none qualify
  const allianceOptions = options.filter((o) =>
    o.airlines.some((a) => ALL_ALLIANCE_CARRIERS.has(a))
  );
  if (allianceOptions.length > 0) {
    options = allianceOptions;
  } else {
    console.log(`fetch-flights: no alliance carriers for ${origin}->${destination}, using all options`);
  }

  const picks = pickBestFlights(options);

  // Write to cache
  try {
    await supabaseClient
      .from("flight_cache")
      .upsert(
        {
          origin,
          destination,
          departure_date: departureDate,
          return_date: returnDate,
          price: picks.cheapest?.price ?? null,
          result_json: picks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "origin,destination,departure_date,return_date" }
      );
  } catch (e) {
    console.error("fetch-flights: cache write failed:", e);
  }

  return picks;
}

console.log("fetch-flights: module ready, registering handler");

Deno.serve(async (req) => {
  console.log("fetch-flights: handler invoked, method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const FlightRequestSchema = z.object({
      origins: z.array(z.object({
        airport: z.string().regex(/^[A-Z]{3,4}$/, 'Invalid airport code'),
        guestName: z.string().max(100).optional(),
      })).min(1, 'At least one origin required').max(20, 'Too many origins'),
      departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      resorts: z.array(z.string().max(100)).min(1, 'At least one resort required').max(50, 'Too many resorts'),
    });

    const parseResult = FlightRequestSchema.safeParse(await req.json());
    if (!parseResult.success) {
      console.error("fetch-flights: invalid request", parseResult.error.flatten());
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { origins, departureDate, returnDate, resorts } = parseResult.data;
    console.log("fetch-flights: request valid, origins:", origins.length, "resorts:", resorts.length);

    // Build all unique destination airports
    const destinationAirports = [
      ...new Set(resorts.map((r) => RESORT_AIRPORTS[r]).filter(Boolean)),
    ];
    console.log("fetch-flights: destination airports:", destinationAirports);

    const results: Record<string, Record<string, FlightPicks | null>> = {};

    let amadeusToken: string;
    try {
      amadeusToken = await getAmadeusToken();
    } catch (e) {
      console.error("fetch-flights: Amadeus auth error:", e);
      for (const { airport: origin } of origins) {
        results[origin] = {};
        for (const dest of destinationAirports) {
          results[origin][dest] = null;
        }
      }
      return new Response(
        JSON.stringify({ flights: results, resortAirports: RESORT_AIRPORTS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all pairs sequentially with small delay for rate limiting
    for (const { airport: origin } of origins) {
      if (!results[origin]) results[origin] = {};
      for (const dest of destinationAirports) {
        if (origin === dest) {
          results[origin][dest] = null;
          continue;
        }
        try {
          const picks = await searchAndPickFlights(
            amadeusToken, origin, dest, departureDate, returnDate, supabaseClient
          );
          results[origin][dest] = picks;
        } catch (err) {
          console.error(`fetch-flights: error ${origin}->${dest}:`, err);
          results[origin][dest] = null;
        }

        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    console.log("fetch-flights: done, returning results");
    return new Response(
      JSON.stringify({ flights: results, resortAirports: RESORT_AIRPORTS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-flights: unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch flight data. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
