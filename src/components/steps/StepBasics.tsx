import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
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
const vibes = [
  { id: "party", emoji: "🎉", label: "Party Town", desc: "Nightlife, big resort towns" },
  { id: "ski-in", emoji: "🏔️", label: "Ski-In/Ski-Out", desc: "Pure mountain access" },
  { id: "budget", emoji: "💰", label: "Budget Trip", desc: "Max value, less frills" },
  { id: "relaxed", emoji: "🧘", label: "Relaxed & Scenic", desc: "Cozy, quieter resorts" },
  { id: "expert", emoji: "🏆", label: "Expert Terrain", desc: "Gnarly runs, backcountry" },
];

interface StepBasicsProps {
  data: {
    tripName: string;
    dateRange: DateRange | undefined;
    groupSize: number;
    geography: string[];
    vibe: string;
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

      {/* Vibe */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Trip Vibe</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vibes.map((v) => (
            <button
              key={v.id}
              onClick={() => onChange({ vibe: v.id })}
              className={cn(
                "p-4 rounded-xl text-left transition-all",
                data.vibe === v.id
                  ? "glass-strong glow-border ring-1 ring-primary/50"
                  : "glass hover:bg-card/80"
              )}
            >
              <div className="text-2xl mb-2">{v.emoji}</div>
              <div className="font-semibold text-sm text-foreground">{v.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{v.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default StepBasics;
