import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const nonSkierOptions = [
  { value: 0, label: "Not at all" },
  { value: 25, label: "Minor" },
  { value: 50, label: "Matters" },
  { value: 75, label: "Important" },
  { value: 100, label: "Top Priority" },
];

const levels = ["Beginner", "Intermediate", "Advanced", "Expert"];

interface StepSkillsProps {
  data: {
    skillRange: [number, number];
    hasNonSkiers: boolean;
    nonSkierImportance: number;
  };
  onChange: (data: Partial<StepSkillsProps["data"]>) => void;
}

const StepSkills = ({ data, onChange }: StepSkillsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-1">Group Skill Mix</h2>
        <p className="text-muted-foreground text-sm">What's the range of ability in your group?</p>
      </div>

      {/* Skill Range Slider */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-foreground">Ability Range</label>
        <div className="glass rounded-xl p-6 space-y-6">
          <Slider
            min={0}
            max={3}
            step={1}
            value={data.skillRange}
            onValueChange={(val) => onChange({ skillRange: val as [number, number] })}
            className="w-full"
          />
          <div className="flex justify-between">
            {levels.map((level, i) => (
              <span
                key={level}
                className={`text-xs font-medium ${
                  i >= data.skillRange[0] && i <= data.skillRange[1]
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {level}
              </span>
            ))}
          </div>
          <div className="text-center">
            <span className="text-sm text-foreground font-medium">
              {levels[data.skillRange[0]]} → {levels[data.skillRange[1]]}
            </span>
          </div>
        </div>
      </div>

      {/* Non-skiers toggle */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Non-skiers in the group?</div>
            <div className="text-xs text-muted-foreground mt-1">
              Some people won't be hitting the slopes
            </div>
          </div>
          <Switch
            checked={data.hasNonSkiers}
            onCheckedChange={(v) => onChange({ hasNonSkiers: v })}
          />
        </div>

        {data.hasNonSkiers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3 pt-4 border-t border-border"
          >
            <label className="text-xs font-medium text-muted-foreground">
              How important are non-skier activities?
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {nonSkierOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ nonSkierImportance: opt.value })}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium transition-all text-center leading-tight",
                    data.nonSkierImportance === opt.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "glass text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default StepSkills;
