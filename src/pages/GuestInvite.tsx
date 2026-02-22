import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mountain, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const skillLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];

const GuestInvite = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    originCity: "",
    airportCode: "",
    skillLevel: 1,
    budgetMin: 1000,
    budgetMax: 3000,
    notes: "",
  });

  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) return;
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();
      setTrip(data);
      setLoading(false);
    };
    fetchTrip();
  }, [tripId]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !tripId) return;
    await supabase.from("guests").insert({
      trip_id: tripId,
      name: form.name.trim(),
      origin_city: form.originCity.trim() || null,
      airport_code: form.airportCode.trim() || null,
      skill_level: skillLevels[form.skillLevel].toLowerCase(),
      budget_min: form.budgetMin,
      budget_max: form.budgetMax,
      notes: form.notes.trim() || null,
      status: "done",
    });
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen snow-gradient flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen snow-gradient flex items-center justify-center">
        <div className="text-center">
          <Mountain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Trip not found</h1>
          <p className="text-muted-foreground mt-2">This invite link may be invalid.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen snow-gradient flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">You're in!</h1>
          <p className="text-muted-foreground">
            The organizer will share results once everyone's submitted. Get stoked! 🎿
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen snow-gradient">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="text-sm font-bold tracking-wider text-primary uppercase">PowderPlan</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{trip.trip_name}</h1>
          {trip.organizer_name && (
            <p className="text-muted-foreground text-sm">Organized by {trip.organizer_name}</p>
          )}
          {trip.date_start && (
            <p className="text-muted-foreground text-sm mt-1">
              {format(new Date(trip.date_start), "MMM d")}
              {trip.date_end ? ` – ${format(new Date(trip.date_end), "MMM d, yyyy")}` : ""}
            </p>
          )}
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-6 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Name</label>
            <Input
              placeholder="Enter your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="glass h-12 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Origin City</label>
              <Input
                placeholder="e.g. San Francisco"
                value={form.originCity}
                onChange={(e) => setForm({ ...form, originCity: e.target.value })}
                className="glass text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Airport Code</label>
              <Input
                placeholder="e.g. SFO"
                value={form.airportCode}
                onChange={(e) => setForm({ ...form, airportCode: e.target.value.toUpperCase() })}
                className="glass text-foreground placeholder:text-muted-foreground"
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Skill Level</label>
            <Slider
              min={0}
              max={3}
              step={1}
              value={[form.skillLevel]}
              onValueChange={([v]) => setForm({ ...form, skillLevel: v })}
            />
            <div className="flex justify-between">
              {skillLevels.map((l, i) => (
                <span
                  key={l}
                  className={cn(
                    "text-xs font-medium",
                    i === form.skillLevel ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Personal Budget Range
            </label>
            <Slider
              min={500}
              max={10000}
              step={250}
              value={[form.budgetMin, form.budgetMax]}
              onValueChange={([min, max]) => setForm({ ...form, budgetMin: min, budgetMax: max })}
            />
            <div className="text-center text-sm text-primary font-medium">
              ${form.budgetMin.toLocaleString()} – ${form.budgetMax.toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <Textarea
              placeholder="Any dietary restrictions, must-haves, etc."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="glass text-foreground placeholder:text-muted-foreground resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!form.name.trim()}
            size="lg"
            className="w-full h-12 font-semibold"
          >
            Submit My Info
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default GuestInvite;
