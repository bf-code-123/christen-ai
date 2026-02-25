import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Plus, UserPlus, Plane, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Guest {
  id: string;
  name: string;
  airport_code: string | null;
  status: string | null;
}

interface StepInvitesProps {
  tripId: string | null;
  groupSize: number;
}

const StepInvites = ({ tripId, groupSize }: StepInvitesProps) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [copied, setCopied] = useState(false);
  const [newName, setNewName] = useState("");
  const [airports, setAirports] = useState<string[]>([""]);
  const { toast } = useToast();

  const inviteUrl = tripId
    ? `${window.location.origin}/invite/${tripId}`
    : "";

  useEffect(() => {
    if (!tripId) return;

    const fetchGuests = async () => {
      const { data } = await supabase
        .from("guests")
        .select("id, name, airport_code, status")
        .eq("trip_id", tripId);
      if (data) setGuests(data);
    };
    fetchGuests();

    const channel = supabase
      .channel("guests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guests", filter: `trip_id=eq.${tripId}` },
        () => fetchGuests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const addGuest = async () => {
    if (!newName.trim() || !tripId) return;

    const validAirports = airports
      .map((a) => a.trim().toUpperCase())
      .filter((a) => /^[A-Z]{3,4}$/.test(a));

    await supabase.from("guests").insert({
      trip_id: tripId,
      name: newName.trim(),
      airport_code: validAirports.length > 0 ? validAirports.join(",") : null,
      origin_city: null,
      status: "done",
    });

    setNewName("");
    setAirports([""]);
    toast({ title: "Guest added!" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-1">Guest Invites</h2>
        <p className="text-muted-foreground text-sm">
          Add your crew and their departure airports — we'll find the cheapest flights for everyone.
        </p>
      </div>

      {/* Add Guest */}
      <div className="glass-strong rounded-xl p-5 space-y-4 ring-1 ring-primary/30">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <label className="text-sm font-semibold text-foreground">Add Guest</label>
        </div>

        <Input
          placeholder="Guest name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="glass h-11 text-foreground placeholder:text-muted-foreground"
        />

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Departure Airport(s)
          </label>
          {airports.map((airport, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input
                  placeholder={i === 0 ? "e.g. SFO" : i === 1 ? "e.g. OAK" : "e.g. SJC"}
                  value={airport}
                  onChange={(e) => updateAirport(i, e.target.value)}
                  className="glass h-11 pl-9 text-foreground placeholder:text-muted-foreground font-mono tracking-widest"
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
          onClick={addGuest}
          disabled={!newName.trim()}
          className="w-full gap-1"
        >
          <Plus className="h-4 w-4" /> Add Guest
        </Button>
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Guests ({guests.length}/{groupSize})
        </label>

        <div className="space-y-2">
          {guests.map((g) => (
            <div
              key={g.id}
              className="glass rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{g.name}</div>
                {g.airport_code ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Plane className="h-3 w-3" />
                    <span className="font-mono">{g.airport_code.split(",").join(" · ")}</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Plane className="h-3 w-3" /> No airport added
                  </div>
                )}
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  g.status === "done"
                    ? "bg-success/20 text-success"
                    : "bg-warning/20 text-warning"
                }`}
              >
                {g.status === "done" ? "Submitted" : "Pending"}
              </span>
            </div>
          ))}

          {guests.length === 0 && (
            <div className="glass rounded-lg px-4 py-8 text-center text-muted-foreground text-sm">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No guests yet. Add them above or share the invite link below.
            </div>
          )}
        </div>
      </div>

      {/* Invite Link */}
      {tripId && (
        <div className="glass rounded-xl p-5 space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Or share this invite link
          </label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={inviteUrl}
              className="glass text-sm text-foreground font-mono"
            />
            <Button onClick={copyLink} variant="outline" className="glass shrink-0">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StepInvites;
