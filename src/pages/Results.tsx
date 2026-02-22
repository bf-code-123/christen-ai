import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mountain, Share2, RefreshCw, ArrowLeft, Users, Calendar, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import ResortCard from "@/components/ResortCard";
import FlightSummaryTable from "@/components/FlightSummaryTable";
import LoadingAnimation from "@/components/LoadingAnimation";

const Results = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const confettiFired = useRef(false);

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
      if (recsRes.data) {
        setResults(recsRes.data.results as any);
      }
      setLoading(false);
    };
    loadData();
  }, [tripId]);

  // Confetti burst on first load
  useEffect(() => {
    if (results && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ["#3b82f6", "#60a5fa", "#93c5fd", "#ffffff", "#e2e8f0"] });
      }, 400);
    }
  }, [results]);

  const handleRegenerate = async () => {
    if (!tripId) return;
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recommendations", {
        body: { tripId },
      });
      if (error) throw error;
      setResults(data);
      confettiFired.current = false;
    } catch (err) {
      console.error("Regeneration error:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const shareUrl = `${window.location.origin}/share/${tripId}`;
  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingAnimation />;
  if (regenerating) return <LoadingAnimation />;

  if (!results || !trip) {
    return (
      <div className="min-h-screen snow-gradient flex items-center justify-center px-4">
        <div className="text-center">
          <Mountain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">No results found</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This trip doesn't have recommendations yet.
          </p>
          <Button onClick={() => navigate("/")} variant="outline" className="mt-6 glass gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Planner
          </Button>
        </div>
      </div>
    );
  }

  const recs = results.recommendations || [];
  const flightSummary = results.flightSummary || {};
  const resortNames = recs.map((r: any) => r.resortName);
  const bestPick = recs[0];

  return (
    <div className="min-h-screen snow-gradient">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <Mountain className="h-5 w-5 text-primary" />
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              PowderPlan
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black gradient-text mb-3">
            {trip.trip_name}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {trip.date_start && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(trip.date_start), "MMM d")}
                {trip.date_end ? ` – ${format(new Date(trip.date_end), "MMM d, yyyy")}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {trip.group_size} people
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-3">Recommended by PowderPlan</p>
        </motion.div>

        {/* Best Overall Pick Banner */}
        {bestPick && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 bg-primary/10 border border-primary/30 rounded-2xl p-5 text-center"
          >
            <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1">🏆 Best Overall Pick</div>
            <h2 className="text-2xl font-black text-foreground">{bestPick.resortName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {bestPick.matchScore}% match · Est. ${bestPick.costBreakdown?.total?.toLocaleString()}/person
            </p>
          </motion.div>
        )}

        {/* Resort Cards */}
        <div className="space-y-6 mb-10">
          {recs.map((rec: any, i: number) => (
            <ResortCard key={rec.resortName} resort={rec} rank={i + 1} isBestPick={i === 0} />
          ))}
        </div>

        {/* Flight Summary Table */}
        <div className="mb-10">
          <FlightSummaryTable flightSummary={flightSummary} resortNames={resortNames} />
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-12"
        >
          <Button onClick={handleRegenerate} variant="outline" className="glass gap-2">
            <RefreshCw className="h-4 w-4" /> Regenerate
          </Button>
          <Button onClick={copyShareLink} variant="outline" className="glass gap-2">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Share Link"}
          </Button>
          <Button onClick={() => navigate("/")} variant="ghost" className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> New Trip
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Results;
