import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 40 resorts with comprehensive data
const RESORTS = [
  // North America
  { name: "Whistler Blackcomb", country: "Canada", region: "North America", lat: 50.1163, lng: -122.9574, nearestAirport: "YVR", pass: ["epic"], terrain: { beginner: 20, intermediate: 55, advanced: 15, expert: 10 }, liftTicket: 230, vibeTags: ["party", "family", "luxury"], nonSkierScore: 9, apresScore: 9, lodgingRange: [200, 800], skiInOut: true },
  { name: "Vail", country: "USA", region: "North America", lat: 39.6403, lng: -106.3742, nearestAirport: "EGE", pass: ["epic"], terrain: { beginner: 18, intermediate: 29, advanced: 36, expert: 17 }, liftTicket: 250, vibeTags: ["luxury", "party"], nonSkierScore: 8, apresScore: 9, lodgingRange: [250, 1000], skiInOut: true },
  { name: "Park City", country: "USA", region: "North America", lat: 40.6461, lng: -111.498, nearestAirport: "SLC", pass: ["epic"], terrain: { beginner: 17, intermediate: 52, advanced: 19, expert: 12 }, liftTicket: 220, vibeTags: ["family", "luxury", "party"], nonSkierScore: 9, apresScore: 8, lodgingRange: [180, 700], skiInOut: true },
  { name: "Jackson Hole", country: "USA", region: "North America", lat: 43.5877, lng: -110.828, nearestAirport: "JAC", pass: ["ikon"], terrain: { beginner: 10, intermediate: 40, advanced: 30, expert: 20 }, liftTicket: 210, vibeTags: ["expert", "scenic"], nonSkierScore: 7, apresScore: 7, lodgingRange: [200, 800], skiInOut: true },
  { name: "Telluride", country: "USA", region: "North America", lat: 37.9375, lng: -107.8123, nearestAirport: "MTJ", pass: ["epic"], terrain: { beginner: 23, intermediate: 36, advanced: 23, expert: 18 }, liftTicket: 215, vibeTags: ["scenic", "luxury", "relaxed"], nonSkierScore: 8, apresScore: 7, lodgingRange: [200, 900], skiInOut: true },
  { name: "Mammoth Mountain", country: "USA", region: "North America", lat: 37.6308, lng: -119.0326, nearestAirport: "MMH", pass: ["ikon"], terrain: { beginner: 25, intermediate: 40, advanced: 20, expert: 15 }, liftTicket: 185, vibeTags: ["party", "value"], nonSkierScore: 5, apresScore: 7, lodgingRange: [120, 400], skiInOut: false },
  { name: "Steamboat", country: "USA", region: "North America", lat: 40.457, lng: -106.8045, nearestAirport: "HDN", pass: ["ikon"], terrain: { beginner: 14, intermediate: 42, advanced: 30, expert: 14 }, liftTicket: 195, vibeTags: ["family", "relaxed"], nonSkierScore: 7, apresScore: 6, lodgingRange: [150, 500], skiInOut: true },
  { name: "Stowe", country: "USA", region: "North America", lat: 44.5303, lng: -72.7815, nearestAirport: "BTV", pass: ["epic"], terrain: { beginner: 16, intermediate: 59, advanced: 17, expert: 8 }, liftTicket: 180, vibeTags: ["scenic", "relaxed", "luxury"], nonSkierScore: 8, apresScore: 7, lodgingRange: [150, 600], skiInOut: false },
  { name: "Sunday River", country: "USA", region: "North America", lat: 44.4734, lng: -70.8564, nearestAirport: "PWM", pass: ["ikon"], terrain: { beginner: 30, intermediate: 36, advanced: 22, expert: 12 }, liftTicket: 135, vibeTags: ["family", "value"], nonSkierScore: 5, apresScore: 5, lodgingRange: [100, 300], skiInOut: true },
  { name: "Killington", country: "USA", region: "North America", lat: 43.6045, lng: -72.8201, nearestAirport: "BTV", pass: ["ikon"], terrain: { beginner: 28, intermediate: 33, advanced: 21, expert: 18 }, liftTicket: 155, vibeTags: ["party", "value"], nonSkierScore: 5, apresScore: 8, lodgingRange: [100, 350], skiInOut: false },
  { name: "Big Sky", country: "USA", region: "North America", lat: 45.2838, lng: -111.4014, nearestAirport: "BZN", pass: ["ikon"], terrain: { beginner: 15, intermediate: 25, advanced: 35, expert: 25 }, liftTicket: 200, vibeTags: ["expert", "scenic", "relaxed"], nonSkierScore: 5, apresScore: 5, lodgingRange: [150, 600], skiInOut: true },
  { name: "Taos Ski Valley", country: "USA", region: "North America", lat: 36.5964, lng: -105.4544, nearestAirport: "ABQ", pass: ["ikon"], terrain: { beginner: 24, intermediate: 25, advanced: 25, expert: 26 }, liftTicket: 145, vibeTags: ["expert", "value", "relaxed"], nonSkierScore: 6, apresScore: 5, lodgingRange: [100, 350], skiInOut: true },
  { name: "Alta", country: "USA", region: "North America", lat: 40.5884, lng: -111.6386, nearestAirport: "SLC", pass: ["ikon"], terrain: { beginner: 25, intermediate: 40, advanced: 20, expert: 15 }, liftTicket: 150, vibeTags: ["expert", "value", "relaxed"], nonSkierScore: 2, apresScore: 3, lodgingRange: [120, 400], skiInOut: true },
  { name: "Snowbird", country: "USA", region: "North America", lat: 40.5830, lng: -111.6508, nearestAirport: "SLC", pass: ["ikon"], terrain: { beginner: 27, intermediate: 38, advanced: 20, expert: 15 }, liftTicket: 170, vibeTags: ["expert", "scenic"], nonSkierScore: 4, apresScore: 5, lodgingRange: [150, 500], skiInOut: true },
  { name: "Arapahoe Basin", country: "USA", region: "North America", lat: 39.6426, lng: -105.8718, nearestAirport: "DEN", pass: ["ikon"], terrain: { beginner: 10, intermediate: 30, advanced: 37, expert: 23 }, liftTicket: 120, vibeTags: ["expert", "value"], nonSkierScore: 2, apresScore: 4, lodgingRange: [80, 200], skiInOut: false },
  { name: "Banff Sunshine", country: "Canada", region: "North America", lat: 51.0783, lng: -115.7731, nearestAirport: "YYC", pass: ["ikon"], terrain: { beginner: 20, intermediate: 55, advanced: 15, expert: 10 }, liftTicket: 140, vibeTags: ["scenic", "value", "family"], nonSkierScore: 7, apresScore: 6, lodgingRange: [120, 400], skiInOut: false },
  { name: "Lake Louise", country: "Canada", region: "North America", lat: 51.4254, lng: -116.1773, nearestAirport: "YYC", pass: ["ikon"], terrain: { beginner: 25, intermediate: 45, advanced: 20, expert: 10 }, liftTicket: 135, vibeTags: ["scenic", "relaxed", "luxury"], nonSkierScore: 8, apresScore: 5, lodgingRange: [150, 600], skiInOut: false },
  { name: "Mont-Tremblant", country: "Canada", region: "North America", lat: 46.2149, lng: -74.5853, nearestAirport: "YUL", pass: ["ikon"], terrain: { beginner: 26, intermediate: 32, advanced: 28, expert: 14 }, liftTicket: 115, vibeTags: ["party", "family", "value"], nonSkierScore: 8, apresScore: 8, lodgingRange: [100, 400], skiInOut: true },
  { name: "Revelstoke", country: "Canada", region: "North America", lat: 51.0285, lng: -118.1690, nearestAirport: "YLW", pass: ["ikon"], terrain: { beginner: 7, intermediate: 38, advanced: 30, expert: 25 }, liftTicket: 130, vibeTags: ["expert", "scenic"], nonSkierScore: 4, apresScore: 4, lodgingRange: [100, 350], skiInOut: false },
  // Europe
  { name: "Chamonix", country: "France", region: "Europe", lat: 45.9237, lng: 6.8694, nearestAirport: "GVA", pass: ["none"], terrain: { beginner: 15, intermediate: 30, advanced: 30, expert: 25 }, liftTicket: 70, vibeTags: ["expert", "party", "scenic"], nonSkierScore: 8, apresScore: 8, lodgingRange: [100, 500], skiInOut: false },
  { name: "Verbier", country: "Switzerland", region: "Europe", lat: 46.0967, lng: 7.2286, nearestAirport: "GVA", pass: ["none"], terrain: { beginner: 15, intermediate: 35, advanced: 30, expert: 20 }, liftTicket: 85, vibeTags: ["expert", "party", "luxury"], nonSkierScore: 7, apresScore: 9, lodgingRange: [180, 800], skiInOut: false },
  { name: "Zermatt", country: "Switzerland", region: "Europe", lat: 46.0207, lng: 7.7491, nearestAirport: "GVA", pass: ["none"], terrain: { beginner: 20, intermediate: 45, advanced: 25, expert: 10 }, liftTicket: 90, vibeTags: ["scenic", "luxury", "relaxed"], nonSkierScore: 8, apresScore: 7, lodgingRange: [200, 900], skiInOut: false },
  { name: "Val d'Isère", country: "France", region: "Europe", lat: 45.4486, lng: 6.9797, nearestAirport: "GVA", pass: ["none"], terrain: { beginner: 16, intermediate: 40, advanced: 28, expert: 16 }, liftTicket: 65, vibeTags: ["party", "expert"], nonSkierScore: 6, apresScore: 9, lodgingRange: [150, 600], skiInOut: true },
  { name: "Courchevel", country: "France", region: "Europe", lat: 45.4153, lng: 6.6346, nearestAirport: "GVA", pass: ["none"], terrain: { beginner: 25, intermediate: 40, advanced: 25, expert: 10 }, liftTicket: 70, vibeTags: ["luxury", "family"], nonSkierScore: 9, apresScore: 8, lodgingRange: [250, 1200], skiInOut: true },
  { name: "St. Anton", country: "Austria", region: "Europe", lat: 47.1275, lng: 10.2636, nearestAirport: "INN", pass: ["none"], terrain: { beginner: 15, intermediate: 40, advanced: 30, expert: 15 }, liftTicket: 65, vibeTags: ["party", "expert"], nonSkierScore: 6, apresScore: 10, lodgingRange: [120, 500], skiInOut: true },
  { name: "Kitzbühel", country: "Austria", region: "Europe", lat: 47.4492, lng: 12.3925, nearestAirport: "INN", pass: ["none"], terrain: { beginner: 25, intermediate: 45, advanced: 20, expert: 10 }, liftTicket: 60, vibeTags: ["scenic", "luxury", "party"], nonSkierScore: 8, apresScore: 9, lodgingRange: [130, 500], skiInOut: false },
  { name: "Axamer Lizum", country: "Austria", region: "Europe", lat: 47.1911, lng: 11.2895, nearestAirport: "INN", pass: ["none"], terrain: { beginner: 30, intermediate: 40, advanced: 20, expert: 10 }, liftTicket: 50, vibeTags: ["value", "family"], nonSkierScore: 6, apresScore: 5, lodgingRange: [80, 250], skiInOut: false },
  { name: "Les Arcs", country: "France", region: "Europe", lat: 45.5728, lng: 6.8039, nearestAirport: "GVA", pass: ["none"], terrain: { beginner: 22, intermediate: 43, advanced: 25, expert: 10 }, liftTicket: 55, vibeTags: ["family", "value"], nonSkierScore: 6, apresScore: 6, lodgingRange: [100, 400], skiInOut: true },
  { name: "Tignes", country: "France", region: "Europe", lat: 45.4685, lng: 6.9063, nearestAirport: "GVA", pass: ["none"], terrain: { beginner: 20, intermediate: 42, advanced: 26, expert: 12 }, liftTicket: 60, vibeTags: ["party", "value"], nonSkierScore: 5, apresScore: 7, lodgingRange: [100, 400], skiInOut: true },
  // Japan
  { name: "Niseko", country: "Japan", region: "Japan/Asia", lat: 42.8625, lng: 140.6987, nearestAirport: "CTS", pass: ["ikon"], terrain: { beginner: 30, intermediate: 40, advanced: 20, expert: 10 }, liftTicket: 65, vibeTags: ["party", "family", "scenic"], nonSkierScore: 9, apresScore: 8, lodgingRange: [80, 400], skiInOut: false },
  { name: "Hakuba", country: "Japan", region: "Japan/Asia", lat: 36.6983, lng: 137.8321, nearestAirport: "NRT", pass: ["epic"], terrain: { beginner: 30, intermediate: 40, advanced: 20, expert: 10 }, liftTicket: 50, vibeTags: ["value", "scenic", "family"], nonSkierScore: 8, apresScore: 6, lodgingRange: [60, 250], skiInOut: false },
  { name: "Furano", country: "Japan", region: "Japan/Asia", lat: 43.3389, lng: 142.3832, nearestAirport: "CTS", pass: ["none"], terrain: { beginner: 40, intermediate: 40, advanced: 15, expert: 5 }, liftTicket: 45, vibeTags: ["relaxed", "value", "scenic"], nonSkierScore: 7, apresScore: 5, lodgingRange: [50, 200], skiInOut: false },
  { name: "Nozawa Onsen", country: "Japan", region: "Japan/Asia", lat: 36.9270, lng: 138.6252, nearestAirport: "NRT", pass: ["none"], terrain: { beginner: 30, intermediate: 40, advanced: 20, expert: 10 }, liftTicket: 45, vibeTags: ["relaxed", "scenic", "value"], nonSkierScore: 8, apresScore: 6, lodgingRange: [50, 200], skiInOut: false },
  // Additional to hit ~40
  { name: "Aspen Snowmass", country: "USA", region: "North America", lat: 39.2084, lng: -106.9490, nearestAirport: "ASE", pass: ["ikon"], terrain: { beginner: 20, intermediate: 35, advanced: 28, expert: 17 }, liftTicket: 230, vibeTags: ["luxury", "party", "scenic"], nonSkierScore: 9, apresScore: 9, lodgingRange: [250, 1200], skiInOut: true },
  { name: "Deer Valley", country: "USA", region: "North America", lat: 40.6374, lng: -111.4783, nearestAirport: "SLC", pass: ["ikon"], terrain: { beginner: 27, intermediate: 41, advanced: 24, expert: 8 }, liftTicket: 240, vibeTags: ["luxury", "family", "relaxed"], nonSkierScore: 8, apresScore: 7, lodgingRange: [300, 1000], skiInOut: true },
  { name: "Breckenridge", country: "USA", region: "North America", lat: 39.4817, lng: -106.0384, nearestAirport: "DEN", pass: ["epic"], terrain: { beginner: 15, intermediate: 33, advanced: 33, expert: 19 }, liftTicket: 210, vibeTags: ["party", "family"], nonSkierScore: 7, apresScore: 8, lodgingRange: [150, 600], skiInOut: true },
  { name: "Copper Mountain", country: "USA", region: "North America", lat: 39.5022, lng: -106.1497, nearestAirport: "DEN", pass: ["ikon"], terrain: { beginner: 21, intermediate: 25, advanced: 36, expert: 18 }, liftTicket: 165, vibeTags: ["value", "family"], nonSkierScore: 5, apresScore: 5, lodgingRange: [100, 350], skiInOut: true },
  { name: "Squaw Valley / Palisades", country: "USA", region: "North America", lat: 39.1968, lng: -120.2354, nearestAirport: "RNO", pass: ["ikon"], terrain: { beginner: 25, intermediate: 40, advanced: 20, expert: 15 }, liftTicket: 195, vibeTags: ["party", "expert", "scenic"], nonSkierScore: 7, apresScore: 8, lodgingRange: [150, 600], skiInOut: false },
  { name: "Sun Valley", country: "USA", region: "North America", lat: 43.6972, lng: -114.3514, nearestAirport: "SUN", pass: ["epic"], terrain: { beginner: 36, intermediate: 42, advanced: 14, expert: 8 }, liftTicket: 175, vibeTags: ["luxury", "scenic", "relaxed"], nonSkierScore: 7, apresScore: 6, lodgingRange: [150, 600], skiInOut: false },
  { name: "Winter Park", country: "USA", region: "North America", lat: 39.8868, lng: -105.7625, nearestAirport: "DEN", pass: ["ikon"], terrain: { beginner: 8, intermediate: 17, advanced: 42, expert: 33 }, liftTicket: 170, vibeTags: ["value", "expert"], nonSkierScore: 4, apresScore: 5, lodgingRange: [100, 350], skiInOut: false },
];

async function fetchSnowData(resorts: typeof RESORTS) {
  // Batch fetch snow data from Open-Meteo for all resorts
  const snowData: Record<string, { snowDepth: number; recentSnowfall: number }> = {};
  
  // Fetch in parallel batches of 10
  const batchSize = 10;
  for (let i = 0; i < resorts.length; i += batchSize) {
    const batch = resorts.slice(i, i + batchSize);
    const promises = batch.map(async (resort) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${resort.lat}&longitude=${resort.lng}&daily=snowfall_sum&hourly=snow_depth&timezone=auto&forecast_days=7`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
        const data = await res.json();
        
        const dailySnowfall = data.daily?.snowfall_sum || [];
        const hourlySnowDepths = data.hourly?.snow_depth || [];
        
        const recentSnowfall = dailySnowfall.reduce((a: number, b: number) => a + (b || 0), 0);
        // Get latest non-null snow depth from hourly data
        let currentSnowDepth = 0;
        for (let j = hourlySnowDepths.length - 1; j >= 0; j--) {
          if (hourlySnowDepths[j] != null && hourlySnowDepths[j] > 0) {
            currentSnowDepth = hourlySnowDepths[j];
            break;
          }
        }
        
        snowData[resort.name] = {
          snowDepth: Math.round(currentSnowDepth * 10) / 10,
          recentSnowfall: Math.round(recentSnowfall * 10) / 10,
        };
      } catch {
        snowData[resort.name] = { snowDepth: 0, recentSnowfall: 0 };
      }
    });
    await Promise.all(promises);
  }
  
  return snowData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regions } = await req.json().catch(() => ({ regions: null }));
    
    // Filter resorts by region if specified
    let filteredResorts = RESORTS;
    if (regions && Array.isArray(regions) && regions.length > 0 && !regions.includes("No Preference")) {
      filteredResorts = RESORTS.filter(r => regions.includes(r.region));
    }
    
    // Fetch live snow data
    const snowData = await fetchSnowData(filteredResorts);
    
    // Combine resort data with snow conditions
    const enrichedResorts = filteredResorts.map(resort => ({
      ...resort,
      snow: snowData[resort.name] || { snowDepth: 0, recentSnowfall: 0 },
    }));

    return new Response(JSON.stringify({ resorts: enrichedResorts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
