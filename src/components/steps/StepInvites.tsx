import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Plus, UserPlus } from "lucide-react";
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
  const { toast } = useToast();

  const inviteUrl = tripId
    ? `${window.location.origin}/invite/${tripId}`
    : "";

  useEffect(() => {
    if (!tripId) return;

    // Initial fetch
    const fetchGuests = async () => {
      const { data } = await supabase
        .from("guests")
        .select("id, name, origin_city, status")
        .eq("trip_id", tripId);
      if (data) setGuests(data);
    };
    fetchGuests();

    // Realtime subscription
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
    await supabase.from("guests").insert({
      trip_id: tripId,
      name: newName.trim(),
      origin_city: newCity.trim() || null,
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
          Share the link below so your crew can submit their info.
        </p>
      </div>

      {/* Invite Link */}
      {tripId && (
        <div className="glass rounded-xl p-5 space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Shareable Invite Link
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
                {g.origin_city && (
                  <div className="text-xs text-muted-foreground">{g.origin_city}</div>
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
              No guests yet. Share the link or add them manually below.
            </div>
          )}
        </div>
      </div>

      {/* Add Guest Manually */}
      <div className="glass rounded-xl p-5 space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Add Guest Manually
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="glass text-foreground placeholder:text-muted-foreground"
          />
          <Input
            placeholder="City (optional)"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            className="glass text-foreground placeholder:text-muted-foreground"
          />
          <Button onClick={addGuest} className="shrink-0 gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default StepInvites;
