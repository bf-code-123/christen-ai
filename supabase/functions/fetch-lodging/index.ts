import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lodging dataset per resort (subset for key resorts, others get generated estimates)
const LODGING_DATA: Record<string, Array<{
  name: string;
  type: "hotel" | "airbnb";
  slopeside: boolean;
  pricePerNight: number;
  sleeps: number;
  url: string;
  imageUrl: string;
}>> = {
  "Whistler Blackcomb": [
    { name: "Fairmont Chateau Whistler", type: "hotel", slopeside: true, pricePerNight: 450, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400" },
    { name: "Hilton Whistler Resort", type: "hotel", slopeside: true, pricePerNight: 320, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
    { name: "Creekside Chalet 8BR", type: "airbnb", slopeside: false, pricePerNight: 800, sleeps: 12, url: "#", imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
    { name: "Village Condo 3BR", type: "airbnb", slopeside: true, pricePerNight: 350, sleeps: 6, url: "#", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
  ],
  "Vail": [
    { name: "Four Seasons Vail", type: "hotel", slopeside: true, pricePerNight: 600, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400" },
    { name: "Lodge at Vail", type: "hotel", slopeside: true, pricePerNight: 380, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
    { name: "Vail Mountain Lodge 6BR", type: "airbnb", slopeside: false, pricePerNight: 900, sleeps: 10, url: "#", imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
    { name: "Lionshead Village 2BR", type: "airbnb", slopeside: true, pricePerNight: 400, sleeps: 4, url: "#", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
  ],
  "Park City": [
    { name: "Montage Deer Valley", type: "hotel", slopeside: true, pricePerNight: 500, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400" },
    { name: "Marriott Mountainside", type: "hotel", slopeside: true, pricePerNight: 280, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
    { name: "Canyons Village 5BR", type: "airbnb", slopeside: false, pricePerNight: 650, sleeps: 10, url: "#", imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
    { name: "Main St Townhouse 3BR", type: "airbnb", slopeside: false, pricePerNight: 320, sleeps: 6, url: "#", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
  ],
  "Jackson Hole": [
    { name: "Four Seasons Jackson Hole", type: "hotel", slopeside: true, pricePerNight: 550, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400" },
    { name: "Snow King Resort", type: "hotel", slopeside: false, pricePerNight: 200, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
    { name: "Teton Village Cabin 4BR", type: "airbnb", slopeside: true, pricePerNight: 600, sleeps: 8, url: "#", imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
    { name: "Town Square Loft 2BR", type: "airbnb", slopeside: false, pricePerNight: 250, sleeps: 4, url: "#", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
  ],
  "Chamonix": [
    { name: "Grand Hotel des Alpes", type: "hotel", slopeside: false, pricePerNight: 250, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400" },
    { name: "Hotel Mont-Blanc", type: "hotel", slopeside: false, pricePerNight: 350, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
    { name: "Chalet Les Praz 5BR", type: "airbnb", slopeside: false, pricePerNight: 500, sleeps: 10, url: "#", imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
    { name: "Centre Ville Apartment 2BR", type: "airbnb", slopeside: false, pricePerNight: 180, sleeps: 4, url: "#", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
  ],
  "Niseko": [
    { name: "Hilton Niseko Village", type: "hotel", slopeside: true, pricePerNight: 250, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400" },
    { name: "Ki Niseko", type: "hotel", slopeside: true, pricePerNight: 300, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
    { name: "Hirafu Lodge 6BR", type: "airbnb", slopeside: false, pricePerNight: 400, sleeps: 10, url: "#", imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
    { name: "Annupuri Chalet 3BR", type: "airbnb", slopeside: false, pricePerNight: 200, sleeps: 6, url: "#", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
  ],
};

function generateLodging(resortName: string, lodgingRange: [number, number]) {
  const [low, high] = lodgingRange;
  const mid = Math.round((low + high) / 2);
  return [
    { name: `${resortName} Slopeside Hotel`, type: "hotel" as const, slopeside: true, pricePerNight: high, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400" },
    { name: `${resortName} Town Hotel`, type: "hotel" as const, slopeside: false, pricePerNight: mid, sleeps: 2, url: "#", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
    { name: `${resortName} Large Chalet`, type: "airbnb" as const, slopeside: false, pricePerNight: Math.round(high * 1.5), sleeps: 10, url: "#", imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
    { name: `${resortName} Condo 3BR`, type: "airbnb" as const, slopeside: false, pricePerNight: mid, sleeps: 6, url: "#", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
  ];
}

function calculateOptimalSplit(
  lodgingOptions: Array<{ name: string; type: string; slopeside: boolean; pricePerNight: number; sleeps: number }>,
  groupSize: number,
  preference: string,
  nights: number
) {
  const preferred = preference === "Hotel" ? "hotel" : preference === "Airbnb" ? "airbnb" : null;
  const options = preferred ? lodgingOptions.filter(o => o.type === preferred) : lodgingOptions;
  
  if (options.length === 0) return [];

  const results: Array<{
    option: typeof options[0];
    units: number;
    totalCost: number;
    costPerPerson: number;
  }> = [];

  for (const opt of options) {
    const units = Math.ceil(groupSize / opt.sleeps);
    const totalCost = units * opt.pricePerNight * nights;
    const costPerPerson = Math.round(totalCost / groupSize);
    results.push({ option: opt, units, totalCost, costPerPerson });
  }

  results.sort((a, b) => a.costPerPerson - b.costPerPerson);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LodgingRequestSchema = z.object({
      resorts: z.array(z.object({
        name: z.string().max(100),
        lodgingRange: z.array(z.number()).length(2).optional(),
      })).min(1, 'At least one resort required').max(50, 'Too many resorts'),
      groupSize: z.number().int().min(1).max(100).default(4),
      lodgingPreference: z.string().max(50).default("Hotel"),
      nights: z.number().int().min(1).max(30).default(5),
    });

    const parseResult = LodgingRequestSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { resorts, groupSize, lodgingPreference, nights } = parseResult.data;

    const result: Record<string, {
      options: typeof LODGING_DATA[string];
      bestSplits: ReturnType<typeof calculateOptimalSplit>;
    }> = {};

    for (const resort of resorts) {
      const name = resort.name;
      const lodgingRange = resort.lodgingRange || [100, 400];
      const options = LODGING_DATA[name] || generateLodging(name, lodgingRange);
      const bestSplits = calculateOptimalSplit(options, groupSize, lodgingPreference, nights);
      result[name] = { options, bestSplits };
    }

    return new Response(JSON.stringify({ lodging: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-lodging error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch lodging data. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
