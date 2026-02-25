import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mountain, CheckCircle2, Plane, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const GuestInvite = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [airports, setAirports] = useState<string[]>([""]);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) return;
      const { data } = await supabase.rpc("get_public_trip", { p_trip_id: tripId });
      setTrip(data?.[0] || null);
      setLoading(false);
    };
    fetchTrip();
  }, [tripId]);

  const updateAirport = (i: number, val: string) => {
    const updated = [...airports];
    updated[i] = val.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    setAirports(updated);
  };

  const addAirport = () => {
    if (airports.length < 3) setAirports([...airports, ""]);
  };

  const removeAirport = (i: number) => {
    setAirports(airports.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!tripId || !name.trim()) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId)) return;

    const validAirports = airports
      .map((a) => a.trim().toUpperCase())
      .filter((a) => /^[A-Z]{3,4}$/.test(a));

    await supabase.from("guests").insert({
      trip_id: tripId,
      name: name.trim().slice(0, 100),
      airport_code: validAirports.length > 0 ? validAirports.join(",") : null,
      origin_city: null,
      status: "done",
    });
    setSubmitted(true);
  };

  const canSubmit = name.trim().length > 0 && airports.some((a) => /^[A-Z]{3,4}$/.test(a));

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
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Name</label>
            <Input
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass h-12 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Airports */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Departure Airport(s)</label>
              <p className="text-xs text-muted-foreground mt-1">
                Add up to 3 airports — we'll find the cheapest flights from any of them.
              </p>
            </div>

            <div className="space-y-2">
              {airports.map((airport, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      placeholder={i === 0 ? "e.g. SFO" : i === 1 ? "e.g. OAK" : "e.g. SJC"}
                      value={airport}
                      onChange={(e) => updateAirport(i, e.target.value)}
                      className="glass h-11 pl-9 text-foreground placeholder:text-muted-foreground font-mono tracking-widest uppercase"
                      maxLength={4}
                    />
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() => removeAirport(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {airports.length < 3 && (
              <button
                onClick={addAirport}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add alternate airport
              </button>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
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
