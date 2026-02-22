import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

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
              Non-skier activities importance
            </label>
            <Slider
              min={0}
              max={100}
              step={10}
              value={[data.nonSkierImportance]}
              onValueChange={([v]) => onChange({ nonSkierImportance: v })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not important</span>
              <span>Very important</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default StepSkills;
