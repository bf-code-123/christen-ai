import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const flexOptions = [
  { value: 1, label: "± 1 day" },
  { value: 2, label: "± 2 days" },
  { value: 3, label: "± 3 days" },
  { value: 5, label: "± 5 days" },
  { value: 7, label: "± 1 week" },
];

const geographies = ["North America", "Europe", "Japan/Asia", "No Preference"];

const vibeSliders = [
  { key: "vibeEnergy" as const, left: "🧘 Relaxed", right: "🎉 Party" },
  { key: "vibeBudget" as const, left: "💰 Value", right: "✨ Luxury" },
  { key: "vibeSkill" as const, left: "🟢 Beginner Friendly", right: "🏆 Experts Only" },
];

interface StepBasicsProps {
  data: {
    tripName: string;
    dateRange: DateRange | undefined;
    groupSize: number;
    geography: string[];
    vibeEnergy: number;
    vibeBudget: number;
    vibeSkill: number;
    skiInOut: boolean;
    datesFlexible: boolean;
    flexDays: number;
  };
  onChange: (data: Partial<StepBasicsProps["data"]>) => void;
}

const StepBasics = ({ data, onChange }: StepBasicsProps) => {
  const toggleGeo = (geo: string) => {
    if (geo === "No Preference") {
      onChange({ geography: data.geography.includes(geo) ? [] : ["No Preference"] });
    } else {
      const filtered = data.geography.filter((g) => g !== "No Preference");
      onChange({
        geography: filtered.includes(geo)
          ? filtered.filter((g) => g !== geo)
          : [...filtered, geo],
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-1">Trip Basics</h2>
        <p className="text-muted-foreground text-sm">Let's start with the essentials.</p>
      </div>

      {/* Trip Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Trip Name</label>
        <Input
          placeholder="e.g. Tahoe Send 2027"
          value={data.tripName}
          onChange={(e) => onChange({ tripName: e.target.value })}
          className="glass h-12 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Travel Dates</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left glass",
                !data.dateRange?.from && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {data.dateRange?.from ? (
                data.dateRange.to ? (
                  `${format(data.dateRange.from, "MMM d, yyyy")} – ${format(data.dateRange.to, "MMM d, yyyy")}`
                ) : (
                  format(data.dateRange.from, "MMM d, yyyy")
                )
              ) : (
                "Select dates (Dec – Apr)"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glass-strong" align="start">
            <CalendarComponent
              mode="range"
              selected={data.dateRange}
              onSelect={(range) => onChange({ dateRange: range })}
              disabled={(date) => {
                const m = date.getMonth();
                return m > 3 && m < 11; // only Dec-Apr
              }}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Flexible Dates Toggle */}
        <div className="flex items-center gap-3 mt-3">
          <Switch
            checked={data.datesFlexible}
            onCheckedChange={(checked) => onChange({ datesFlexible: checked })}
          />
          <span className="text-sm text-muted-foreground">Travel dates are flexible</span>
        </div>

        <AnimatePresence>
          {data.datesFlexible && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 mt-3">
                {flexOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ flexDays: opt.value })}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      data.flexDays === opt.value
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "glass text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Group Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Group Size</label>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="glass h-10 w-10"
            onClick={() => onChange({ groupSize: Math.max(2, data.groupSize - 1) })}
            disabled={data.groupSize <= 2}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-3xl font-bold min-w-[3ch] text-center text-foreground">
            {data.groupSize}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="glass h-10 w-10"
            onClick={() => onChange({ groupSize: Math.min(30, data.groupSize + 1) })}
            disabled={data.groupSize >= 30}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-sm">people</span>
        </div>
      </div>

      {/* Geography */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Geography Preference</label>
        <div className="flex flex-wrap gap-2">
          {geographies.map((geo) => (
            <button
              key={geo}
              onClick={() => toggleGeo(geo)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                data.geography.includes(geo)
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              {geo}
            </button>
          ))}
        </div>
      </div>

      {/* Trip Vibe Sliders */}
      <div className="space-y-5">
        <label className="text-sm font-medium text-foreground">Trip Vibe</label>
        {vibeSliders.map((s) => (
          <div key={s.key} className="glass rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">{s.left}</span>
              <span className="text-muted-foreground">{s.right}</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[data[s.key]]}
              onValueChange={([v]) => onChange({ [s.key]: v })}
            />
          </div>
        ))}

        {/* Ski-In/Ski-Out Toggle */}
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏔️</span>
            <div>
              <div className="text-sm font-medium text-foreground">Ski-In / Ski-Out</div>
              <div className="text-xs text-muted-foreground">Pure mountain access preferred</div>
            </div>
          </div>
          <Switch
            checked={data.skiInOut}
            onCheckedChange={(checked) => onChange({ skiInOut: checked })}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default StepBasics;
