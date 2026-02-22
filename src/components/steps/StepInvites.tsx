import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Plus, UserPlus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Guest {
  id: string;
  name: string;
  origin_city: string | null;
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
  const [newCity, setNewCity] = useState("");
  const [cityError, setCityError] = useState(false);
  const { toast } = useToast();

  const inviteUrl = tripId
    ? `${window.location.origin}/invite/${tripId}`
    : "";

  useEffect(() => {
    if (!tripId) return;

    const fetchGuests = async () => {
      const { data } = await supabase
        .from("guests")
        .select("id, name, origin_city, status")
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

  const addGuest = async () => {
    if (!newName.trim() || !tripId) return;
    if (!newCity.trim()) {
      setCityError(true);
      return;
    }
    setCityError(false);
    await supabase.from("guests").insert({
      trip_id: tripId,
      name: newName.trim(),
      origin_city: newCity.trim(),
      status: "done",
    });
    setNewName("");
    setNewCity("");
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
          Add your crew and where they're flying from — this directly affects flight costs and resort options.
        </p>
      </div>

      {/* Add Guest — prominent section first */}
      <div className="glass-strong rounded-xl p-5 space-y-4 ring-1 ring-primary/30">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-4 w-4 text-primary" />
          <label className="text-sm font-semibold text-foreground">Add Guest</label>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Guest name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="glass h-11 text-foreground placeholder:text-muted-foreground"
          />
          <div className="space-y-1">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                placeholder="Origin city & airport (e.g. Denver, DEN)"
                value={newCity}
                onChange={(e) => {
                  setNewCity(e.target.value);
                  if (e.target.value.trim()) setCityError(false);
                }}
                className={`glass h-11 pl-9 text-foreground placeholder:text-muted-foreground ${
                  cityError ? "ring-2 ring-destructive" : ""
                }`}
              />
            </div>
            {cityError && (
              <p className="text-xs text-destructive font-medium">
                Origin city is required — it determines flight costs and options.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              ✈️ Required — flight costs are a major part of the budget calculation.
            </p>
          </div>
          <Button onClick={addGuest} className="w-full gap-1">
            <Plus className="h-4 w-4" /> Add Guest
          </Button>
        </div>
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Guests ({guests.length}/{groupSize})
          </label>
        </div>

        <div className="space-y-2">
          {guests.map((g) => (
            <div
              key={g.id}
              className="glass rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{g.name}</div>
                {g.origin_city ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {g.origin_city}
                  </div>
                ) : (
                  <div className="text-xs text-destructive font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Missing origin city
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

      {/* Invite Link — moved to bottom */}
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
