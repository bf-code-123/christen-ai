import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Snowflake, DollarSign, AlertTriangle, Calendar, ChevronDown,
  Plane, Hotel, Ticket, Coffee, MapPin, Mountain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MatchScoreRing from "@/components/MatchScoreRing";

interface ResortCardProps {
  resort: any;
  rank: number;
  isBestPick?: boolean;
}

const TerrainBar = ({ terrain }: { terrain: any }) => {
  if (!terrain) return null;
  const segments = [
    { key: "beginner", label: "Beg", pct: terrain.beginner, color: "bg-green-500" },
    { key: "intermediate", label: "Int", pct: terrain.intermediate, color: "bg-blue-500" },
    { key: "advanced", label: "Adv", pct: terrain.advanced, color: "bg-orange-500" },
    { key: "expert", label: "Exp", pct: terrain.expert, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden">
        {segments.map((s) => (
          <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
        {segments.map((s) => (
          <span key={s.key}>{s.label} {s.pct}%</span>
        ))}
      </div>
    </div>
  );
};

const ResortCard = ({ resort, rank, isBestPick }: ResortCardProps) => {
  const [showItinerary, setShowItinerary] = useState(false);
  const [showCosts, setShowCosts] = useState(false);

  const cost = resort.costBreakdown;
  const snow = resort.snowConditions;
  const passes = resort.passCoverage || [];
  const vibeTags = resort.vibeMatchTags || [];
  const terrain = resort.terrainBreakdown || resort.terrain;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.15 }}
      className={`glass-strong rounded-2xl overflow-hidden ${isBestPick ? "ring-2 ring-primary glow-border" : ""}`}
    >
      {/* Hero */}
      <div className="relative h-44 sm:h-52 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary to-muted" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/30 to-transparent" />

        {isBestPick && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10">
            <Mountain className="h-3.5 w-3.5" /> Best Overall Pick
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold text-primary mb-1">#{rank}</div>
            <h3 className="text-2xl font-black text-foreground">{resort.resortName}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {resort.country || ""}{resort.region ? `, ${resort.region}` : ""}
            </p>
          </div>
          <MatchScoreRing score={resort.matchScore} />
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Snow Conditions Badge */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <Snowflake className="h-3.5 w-3.5" /> {snow?.snowDepth || 0}cm base
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <Snowflake className="h-3.5 w-3.5" /> +{snow?.recentSnowfall || 0}cm / 7d
          </div>
        </div>

        {/* Pass Coverage */}
        {passes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {passes.map((p: any) => (
              <span
                key={p.pass}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  p.covered
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.covered ? "✓" : "✗"} {p.pass}
              </span>
            ))}
          </div>
        )}

        {/* Estimated Cost */}
        <div className="space-y-2">
          <button
            onClick={() => setShowCosts(!showCosts)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Est. ${cost?.total?.toLocaleString()} /person
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCosts ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showCosts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="glass rounded-xl p-4 space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Plane, label: "Flights (avg)", value: cost?.flights_avg },
                      { icon: Hotel, label: "Lodging /person", value: cost?.lodging_per_person },
                      { icon: Ticket, label: "Lift Tickets", value: cost?.lift_tickets },
                      { icon: Coffee, label: "Food & Misc", value: cost?.misc },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <div className="text-[10px] text-muted-foreground">{item.label}</div>
                          <div className="text-sm font-semibold text-foreground">
                            ${item.value?.toLocaleString() || "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Vibe Match Tags */}
        {vibeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vibeTags.map((tag: string) => (
              <span key={tag} className="text-xs bg-accent/10 text-accent-foreground/80 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Terrain Breakdown */}
        {terrain && <TerrainBar terrain={terrain} />}

        {/* Why This Resort (AI paragraph) */}
        {(resort.whyThisResort || resort.summary) && (
          <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-3">
            {resort.whyThisResort || resort.summary}
          </p>
        )}

        {/* Lodging Recommendation */}
        {resort.lodgingRecommendation && (
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <Hotel className="h-4 w-4 text-primary shrink-0" />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {resort.lodgingRecommendation.units}× {resort.lodgingRecommendation.name}
              </span>
              {" "}({resort.lodgingRecommendation.type}) — ${resort.lodgingRecommendation.pricePerNight}/night,{" "}
              ${resort.lodgingRecommendation.costPerPerson}/person total
            </div>
          </div>
        )}

        {/* Itinerary */}
        {resort.itinerary?.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowItinerary(!showItinerary)}
              className="w-full justify-between text-sm font-medium gap-2 h-9"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> View Sample Itinerary
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showItinerary ? "rotate-180" : ""}`} />
            </Button>

            <AnimatePresence>
              {showItinerary && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 mt-2">
                    {resort.itinerary.map((day: any) => (
                      <div key={day.day} className="glass rounded-lg p-3">
                        <div className="text-xs font-semibold text-primary mb-1">Day {day.day}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-muted-foreground">
                          <div><span className="text-foreground font-medium">AM:</span> {day.morning}</div>
                          <div><span className="text-foreground font-medium">PM:</span> {day.afternoon}</div>
                          <div><span className="text-foreground font-medium">Eve:</span> {day.evening}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Warnings */}
        {resort.warnings?.length > 0 && (
          <div className="space-y-1.5">
            {resort.warnings.map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <span className="text-xs text-warning">{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ResortCard;
