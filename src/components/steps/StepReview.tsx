import { motion } from "framer-motion";
import { Edit2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface StepReviewProps {
  basics: {
    tripName: string;
    dateRange: DateRange | undefined;
    groupSize: number;
    geography: string[];
    vibeEnergy: number;
    vibeBudget: number;
    vibeSkill: number;
    skiInOut: boolean;
  };
  budget: {
    budgetType: "per_person" | "total";
    budgetAmount: number;
    passTypes: string[];
    lodging: string;
  };
  guestCount: number;
  onGoToStep: (step: number) => void;
  onGenerate: () => void;
}

const Section = ({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (s: number) => void;
  children: React.ReactNode;
}) => (
  <div className="glass rounded-xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <button
        onClick={() => onEdit(step)}
        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
      >
        <Edit2 className="h-3 w-3" /> Edit
      </button>
    </div>
    <div className="space-y-1 text-sm text-muted-foreground">{children}</div>
  </div>
);

const vibeLabel = (value: number, left: string, right: string) => {
  if (value <= 25) return left;
  if (value >= 75) return right;
  return "Balanced";
};

const StepReview = ({ basics, budget, guestCount, onGoToStep, onGenerate }: StepReviewProps) => {
  const allSubmitted = guestCount >= basics.groupSize;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-1">Review Your Trip</h2>
        <p className="text-muted-foreground text-sm">Everything look good? Let's find your perfect resort.</p>
      </div>

      <Section title="Trip Basics" step={1} onEdit={onGoToStep}>
        <p><strong className="text-foreground">{basics.tripName || "Unnamed Trip"}</strong></p>
        {basics.dateRange?.from && (
          <p>
            {format(basics.dateRange.from, "MMM d")}
            {basics.dateRange.to ? ` – ${format(basics.dateRange.to, "MMM d, yyyy")}` : ""}
          </p>
        )}
        <p>{basics.groupSize} people</p>
        <p>{basics.geography.length > 0 ? basics.geography.join(", ") : "No preference"}</p>
        <p>Vibe: {vibeLabel(basics.vibeEnergy, "Relaxed", "Party")} · {vibeLabel(basics.vibeBudget, "Value", "Luxury")} · {vibeLabel(basics.vibeSkill, "Beginner Friendly", "Experts Only")}</p>
        {basics.skiInOut && <p>🏔️ Ski-In/Ski-Out preferred</p>}
      </Section>

      <Section title="Budget" step={2} onEdit={onGoToStep}>
        <p>
          ${budget.budgetAmount.toLocaleString()}
          {budget.budgetAmount >= 10000 ? "+" : ""}{" "}
          {budget.budgetType === "per_person" ? "per person" : "total"}
        </p>
        <p>{budget.passTypes.length > 0 ? budget.passTypes.join(", ") : "No pass selected"}</p>
        <p>Lodging: {budget.lodging}</p>
      </Section>

      <Section title="Guests" step={3} onEdit={onGoToStep}>
        <p>
          {guestCount} of {basics.groupSize} submitted
        </p>
      </Section>

      {!allSubmitted && (
        <div className="flex items-start gap-3 rounded-xl bg-warning/10 border border-warning/20 p-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning">Not all guests have submitted</p>
            <p className="text-muted-foreground mt-1">
              {basics.groupSize - guestCount} guests haven't responded yet. You can still proceed.
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={onGenerate}
        size="lg"
        className="w-full h-14 text-base font-semibold gap-2 animate-pulse-glow"
      >
        <Sparkles className="h-5 w-5" />
        Generate Resort Recommendations
      </Button>
    </motion.div>
  );
};

export default StepReview;
