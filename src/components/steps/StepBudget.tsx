import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const passTypes = ["Ikon Pass", "Epic Pass", "Indy Pass", "No Pass / Lift Tickets"];
const lodgingOptions = ["Slopeside Hotel", "Vacation Rental", "No Preference"];

interface StepBudgetProps {
  data: {
    budgetType: "per_person" | "total";
    budgetAmount: number;
    passTypes: string[];
    lodging: string;
  };
  onChange: (data: Partial<StepBudgetProps["data"]>) => void;
}

const StepBudget = ({ data, onChange }: StepBudgetProps) => {
  const formatBudget = (v: number) => {
    if (v >= 10000) return "$10,000+";
    return `$${v.toLocaleString()}`;
  };

  const togglePass = (pass: string) => {
    onChange({
      passTypes: data.passTypes.includes(pass)
        ? data.passTypes.filter((p) => p !== pass)
        : [...data.passTypes, pass],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-1">Budget</h2>
        <p className="text-muted-foreground text-sm">How much are you looking to spend?</p>
      </div>

      {/* Budget Type Toggle */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Budget Type</label>
        <div className="flex gap-2">
          {(["per_person", "total"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ budgetType: type })}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-medium transition-all",
                data.budgetType === type
                  ? "bg-primary text-primary-foreground"
                  : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              {type === "per_person" ? "Per Person Total" : "Total Group Budget"}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Slider */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-baseline">
          <label className="text-sm font-medium text-foreground">
            {data.budgetType === "per_person" ? "Per person" : "Total group"} budget
          </label>
          <span className="text-2xl font-bold text-primary">{formatBudget(data.budgetAmount)}</span>
        </div>
        <Slider
          min={500}
          max={10000}
          step={250}
          value={[data.budgetAmount]}
          onValueChange={([v]) => onChange({ budgetAmount: v })}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$500</span>
          <span>$10,000+</span>
        </div>
      </div>

      {/* Pass Types */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Season Pass</label>
        <div className="flex flex-wrap gap-2">
          {passTypes.map((pass) => (
            <button
              key={pass}
              onClick={() => togglePass(pass)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                data.passTypes.includes(pass)
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              {pass}
            </button>
          ))}
        </div>
      </div>

      {/* Lodging */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Lodging Preference</label>
        <div className="grid grid-cols-3 gap-2">
          {lodgingOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange({ lodging: opt })}
              className={cn(
                "py-3 px-3 rounded-xl text-xs font-medium transition-all text-center",
                data.lodging === opt
                  ? "bg-primary text-primary-foreground"
                  : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default StepBudget;
