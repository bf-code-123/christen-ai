console.log("fetch-flights: module loading");

import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  outbound: FlightLeg;
  return: FlightLeg;
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

async function searchFlights(
  token: string,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string
): Promise<FlightOption[] | null> {
  const url = new URL(
    "https://test.api.amadeus.com/v2/shopping/flight-offers"
  );
  url.searchParams.set("originLocationCode", origin);
  url.searchParams.set("destinationLocationCode", destination);
  url.searchParams.set("departureDate", departureDate);
  url.searchParams.set("returnDate", returnDate);
  url.searchParams.set("adults", "1");
  url.searchParams.set("nonStop", "false");
  url.searchParams.set("currencyCode", "USD");
  url.searchParams.set("max", "3");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`Flight search failed ${origin}->${destination}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    return null;
  }

  // Parse up to 3 offers, sorted by price (Amadeus returns sorted by default)
  const options: FlightOption[] = data.data.slice(0, 3).map((offer: any) => {
    const itineraries = offer.itineraries || [];

    // Collect all unique carrier codes
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
      outbound,
      return: returnLeg,
    };
  });

  // Sort by price ascending
  options.sort((a, b) => a.price - b.price);

  return options;
}

console.log("fetch-flights: module ready, registering handler");

Deno.serve(async (req) => {
  console.log("fetch-flights: handler invoked, method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Build all origin->destination pairs
    const destinationAirports = [
      ...new Set(resorts.map((r) => RESORT_AIRPORTS[r]).filter(Boolean)),
    ];
    console.log("fetch-flights: destination airports:", destinationAirports);

    const results: Record<string, Record<string, FlightOption[] | null>> = {};

    let amadeusToken: string;
    try {
      amadeusToken = await getAmadeusToken();
    } catch (e) {
      console.error("fetch-flights: Amadeus auth error:", e);
      // Return empty results — generate-recommendations handles missing flight data gracefully
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
          const options = await searchFlights(amadeusToken, origin, dest, departureDate, returnDate);
          results[origin][dest] = options;
        } catch (err) {
          console.error(`fetch-flights: flight search error ${origin}->${dest}:`, err);
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
