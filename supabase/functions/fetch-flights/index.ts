import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  "Killington": "BTV", "Big Sky": "BZN", "Taos": "ABQ",
  "Alta": "SLC", "Snowbird": "SLC", "Arapahoe Basin": "DEN",
  "Banff Sunshine": "YYC", "Lake Louise": "YYC",
  "Mont-Tremblant": "YUL", "Revelstoke": "YLW",
  "Aspen Snowmass": "ASE", "Deer Valley": "SLC",
  // Europe
  "Chamonix": "GVA", "Verbier": "GVA", "Zermatt": "GVA",
  "Val d'Isere": "GVA", "Courchevel": "GVA", "St. Anton": "INN",
  "Kitzbühel": "INN", "Innsbruck/Axamer Lizum": "INN",
  "Les Arcs": "GVA", "Tignes": "GVA",
  // Japan
  "Niseko": "CTS", "Hakuba": "NRT", "Furano": "CTS", "Nozawa Onsen": "NRT",
};

interface FlightRequest {
  origins: { airport: string; guestName?: string }[];
  departureDate: string;
  returnDate: string;
  resorts: string[];
}

async function getAmadeusToken(): Promise<string> {
  const clientId = Deno.env.get("AMADEUS_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AMADEUS_CLIENT_SECRET")!;

  const res = await fetch(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amadeus auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function searchFlights(
  token: string,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string
): Promise<number | null> {
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
  url.searchParams.set("max", "1");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`Flight search failed ${origin}->${destination}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  if (data.data && data.data.length > 0) {
    return parseFloat(data.data[0].price.total);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { origins, departureDate, returnDate, resorts } = parseResult.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build all origin->destination pairs
    const destinationAirports = [
      ...new Set(resorts.map((r) => RESORT_AIRPORTS[r]).filter(Boolean)),
    ];
    
    const results: Record<string, Record<string, { price: number | null; currency: string }>> = {};
    const pairsToFetch: { origin: string; dest: string }[] = [];

    // Check cache first
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    for (const { airport: origin } of origins) {
      results[origin] = {};
      for (const dest of destinationAirports) {
        // Check cache
        const { data: cached } = await supabase
          .from("flight_cache")
          .select("price, currency")
          .eq("origin_airport", origin)
          .eq("destination_airport", dest)
          .eq("departure_date", departureDate)
          .eq("return_date", returnDate)
          .gt("cached_at", sixHoursAgo)
          .limit(1)
          .maybeSingle();

        if (cached) {
          results[origin][dest] = { price: cached.price, currency: cached.currency || "USD" };
        } else {
          pairsToFetch.push({ origin, dest });
        }
      }
    }

    // Fetch missing pairs from Amadeus
    if (pairsToFetch.length > 0) {
      let token: string;
      try {
        token = await getAmadeusToken();
      } catch (e) {
        console.error("Amadeus auth error:", e);
        // Return what we have from cache + nulls for the rest
        for (const { origin, dest } of pairsToFetch) {
          results[origin][dest] = { price: null, currency: "USD" };
        }
        return new Response(
          JSON.stringify({ flights: results, resortAirports: RESORT_AIRPORTS }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate-limit: fetch sequentially with small delay
      for (const { origin, dest } of pairsToFetch) {
        const price = await searchFlights(token, origin, dest, departureDate, returnDate);
        results[origin][dest] = { price, currency: "USD" };

        // Cache the result
        await supabase.from("flight_cache").upsert(
          {
            origin_airport: origin,
            destination_airport: dest,
            departure_date: departureDate,
            return_date: returnDate,
            price,
            currency: "USD",
            cached_at: new Date().toISOString(),
          },
          { onConflict: "origin_airport,destination_airport,departure_date,return_date" }
        );

        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return new Response(
      JSON.stringify({ flights: results, resortAirports: RESORT_AIRPORTS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-flights error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch flight data. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
