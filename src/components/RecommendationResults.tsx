import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Mountain, Snowflake, DollarSign, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Recommendation {
  resortName: string;
  matchScore: number;
  summary: string;
  costBreakdown: {
    flights_avg: number;
    lodging_per_person: number;
    lift_tickets: number;
    misc: number;
    total: number;
  };
  itinerary: Array<{ day: number; morning: string; afternoon: string; evening: string }>;
  warnings: string[];
  snowConditions: { snowDepth: number; recentSnowfall: number };
  lodgingRecommendation?: {
    name: string;
    type: string;
    units: number;
    pricePerNight: number;
    costPerPerson: number;
  };
}

interface RecommendationResultsProps {
  data: { recommendations: Recommendation[] } | null;
  tripName: string;
  onBack: () => void;
}

const ScoreBadge = ({ score }: { score: number }) => {
  const color =
    score >= 80 ? "bg-success/20 text-success" :
    score >= 60 ? "bg-primary/20 text-primary" :
    "bg-warning/20 text-warning";
  return (
    <span className={`text-lg font-bold px-3 py-1 rounded-full ${color}`}>
      {score}
    </span>
  );
};

const RecommendationResults = ({ data, tripName, onBack }: RecommendationResultsProps) => {
  const recs = data?.recommendations || [];

  if (recs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No recommendations generated. Please try again.</p>
        <Button onClick={onBack} variant="outline" className="mt-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-black gradient-text mb-2">
          Top Picks for "{tripName || 'Your Trip'}"
        </h2>
        <p className="text-muted-foreground">
          Based on your group's preferences, budget, and current conditions
        </p>
      </div>

      {recs.map((rec, i) => (
        <motion.div
          key={rec.resortName}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          className="glass-strong rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-primary">#{i + 1}</span>
                  <h3 className="text-xl font-bold text-foreground">{rec.resortName}</h3>
                  <ScoreBadge score={rec.matchScore} />
                </div>
                <p className="text-sm text-muted-foreground">{rec.summary}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Snow Conditions */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Snow depth:</span>
                <span className="text-sm font-semibold text-foreground">{rec.snowConditions?.snowDepth || 0} cm</span>
              </div>
              <div className="flex items-center gap-2">
                <Mountain className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Recent snowfall:</span>
                <span className="text-sm font-semibold text-foreground">{rec.snowConditions?.recentSnowfall || 0} cm</span>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Cost Per Person</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Flights", value: rec.costBreakdown.flights_avg },
                  { label: "Lodging", value: rec.costBreakdown.lodging_per_person },
                  { label: "Lift Tickets", value: rec.costBreakdown.lift_tickets },
                  { label: "Misc", value: rec.costBreakdown.misc },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="text-sm font-semibold text-foreground">${item.value?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/30 pt-2 text-center">
                <span className="text-xs text-muted-foreground">Estimated Total: </span>
                <span className="text-lg font-bold text-primary">
                  ${rec.costBreakdown.total?.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground"> /person</span>
              </div>
            </div>

            {/* Lodging Recommendation */}
            {rec.lodgingRecommendation && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Recommended Lodging</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {rec.lodgingRecommendation.units}× {rec.lodgingRecommendation.name} ({rec.lodgingRecommendation.type}) — ${rec.lodgingRecommendation.pricePerNight}/night
                </p>
              </div>
            )}

            {/* Itinerary */}
            {rec.itinerary && rec.itinerary.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Sample Itinerary</h4>
                </div>
                <div className="space-y-2">
                  {rec.itinerary.map((day) => (
                    <div key={day.day} className="glass rounded-lg p-3">
                      <div className="text-xs font-semibold text-primary mb-1">Day {day.day}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div><span className="text-foreground font-medium">AM:</span> {day.morning}</div>
                        <div><span className="text-foreground font-medium">PM:</span> {day.afternoon}</div>
                        <div><span className="text-foreground font-medium">Eve:</span> {day.evening}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {rec.warnings && rec.warnings.length > 0 && (
              <div className="space-y-2">
                {rec.warnings.map((warning, wi) => (
                  <div key={wi} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ))}

      <div className="text-center pt-4">
        <Button onClick={onBack} variant="outline" className="glass gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Review
        </Button>
      </div>
    </motion.div>
  );
};

export default RecommendationResults;
