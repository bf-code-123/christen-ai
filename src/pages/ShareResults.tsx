import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mountain, Users, Calendar, Copy, Check, MessageCircle, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ResortCard from "@/components/ResortCard";

const ShareResults = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    const loadData = async () => {
      const [tripRes, guestsRes, recsRes] = await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).single(),
        supabase.from("guests").select("*").eq("trip_id", tripId),
        supabase.from("recommendations").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }).limit(1).single(),
      ]);
      setTrip(tripRes.data);
      setGuests(guestsRes.data || []);
      if (recsRes.data) setResults(recsRes.data.results as any);
      setLoading(false);
    };
    loadData();
  }, [tripId]);

  const shareUrl = window.location.href;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `Check out our ski trip plan: ${trip?.trip_name || "Ski Trip"} 🎿\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareiMessage = () => {
    const text = `Check out our ski trip plan: ${trip?.trip_name || "Ski Trip"} 🎿 ${shareUrl}`;
    window.open(`sms:&body=${encodeURIComponent(text)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen snow-gradient flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading trip results...</div>
      </div>
    );
  }

  if (!results || !trip) {
    return (
      <div className="min-h-screen snow-gradient flex items-center justify-center px-4">
        <div className="text-center">
          <Mountain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Trip not found</h1>
          <p className="text-muted-foreground mt-2 text-sm">This share link may be invalid.</p>
        </div>
      </div>
    );
  }

  const recs = results.recommendations || [];

  return (
    <div className="min-h-screen snow-gradient">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* CTA Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-2">
            <Mountain className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold tracking-widest text-primary uppercase">PowderPlan</span>
          </div>
          <a href="/" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
            Plan your own trip <ArrowRight className="h-3 w-3" />
          </a>
        </motion.div>

        {/* Trip Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-black gradient-text mb-2">{trip.trip_name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            {trip.date_start && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(trip.date_start), "MMM d")}
                {trip.date_end ? ` – ${format(new Date(trip.date_end), "MMM d, yyyy")}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {trip.group_size} people
            </span>
          </div>
        </motion.div>

        {/* Guest Avatars */}
        {guests.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-8"
          >
            {guests.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {g.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-foreground font-medium">{g.name}</span>
                {g.origin_city && (
                  <span className="text-[10px] text-muted-foreground">({g.origin_city})</span>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Resort Cards */}
        <div className="space-y-5 mb-8">
          {recs.map((rec: any, i: number) => (
            <ResortCard key={rec.resortName} resort={rec} rank={i + 1} isBestPick={i === 0} />
          ))}
        </div>

        {/* Share Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-strong rounded-2xl p-5 space-y-3"
        >
          <p className="text-xs font-semibold text-foreground text-center">Share this trip</p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={copyLink} variant="outline" size="sm" className="glass gap-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <Button onClick={shareWhatsApp} variant="outline" size="sm" className="glass gap-1.5 text-xs">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </Button>
            <Button onClick={shareiMessage} variant="outline" size="sm" className="glass gap-1.5 text-xs">
              <Share2 className="h-3.5 w-3.5" /> iMessage
            </Button>
          </div>
        </motion.div>

        {/* Footer CTA */}
        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-muted-foreground mb-2">Planning your own ski trip?</p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80"
          >
            Try PowderPlan <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ShareResults;
