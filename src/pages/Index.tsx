import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mountain, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ProgressBar from "@/components/ProgressBar";
import StepBasics from "@/components/steps/StepBasics";
import StepSkills from "@/components/steps/StepSkills";
import StepBudget from "@/components/steps/StepBudget";
import StepInvites from "@/components/steps/StepInvites";
import StepReview from "@/components/steps/StepReview";
import type { DateRange } from "react-day-picker";

const Index = () => {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [tripId, setTripId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const { toast } = useToast();

  const [basics, setBasics] = useState({
    tripName: "",
    dateRange: undefined as DateRange | undefined,
    groupSize: 4,
    geography: [] as string[],
    vibe: "",
    datesFlexible: false,
    flexDays: 2,
  });

  const [skills, setSkills] = useState({
    skillRange: [1, 2] as [number, number],
    hasNonSkiers: false,
    nonSkierImportance: 50,
  });

  const [budget, setBudget] = useState({
    budgetType: "per_person" as "per_person" | "total",
    budgetAmount: 2000,
    passTypes: [] as string[],
    lodging: "No Preference",
  });

  // Fetch guest count for review
  useEffect(() => {
    if (!tripId) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("trip_id", tripId);
      setGuestCount(count || 0);
    };
    fetchCount();

    const channel = supabase
      .channel("guest-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests", filter: `trip_id=eq.${tripId}` }, () => fetchCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  const skillLabels = ["beginner", "intermediate", "advanced", "expert"];

  const saveTrip = async () => {
    const tripData = {
      trip_name: basics.tripName || "Untitled Trip",
      date_start: basics.dateRange?.from?.toISOString().split("T")[0] || null,
      date_end: basics.dateRange?.to?.toISOString().split("T")[0] || null,
      group_size: basics.groupSize,
      geography: basics.geography,
      vibe: basics.vibe,
      skill_min: skillLabels[skills.skillRange[0]],
      skill_max: skillLabels[skills.skillRange[1]],
      has_non_skiers: skills.hasNonSkiers,
      non_skier_importance: skills.nonSkierImportance,
      budget_type: budget.budgetType,
      budget_amount: budget.budgetAmount,
      pass_types: budget.passTypes,
      lodging_preference: budget.lodging,
    };

    if (tripId) {
      await supabase.from("trips").update(tripData).eq("id", tripId);
    } else {
      const { data } = await supabase.from("trips").insert(tripData).select("id").single();
      if (data) setTripId(data.id);
    }
  };

  const nextStep = async () => {
    if (step === 3 && !tripId) {
      // Save trip before going to invites
      await saveTrip();
    } else if (step <= 3) {
      await saveTrip();
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleGenerate = () => {
    toast({
      title: "🎿 Generating recommendations...",
      description: "This feature is coming soon! Your trip data has been saved.",
    });
  };

  if (!started) {
    return (
      <div className="min-h-screen snow-gradient flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-8"
          >
            <Mountain className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-5xl font-black tracking-tight gradient-text mb-3">
              PowderPlan
            </h1>
            <p className="text-muted-foreground text-lg">
              Plan the perfect ski trip with your crew.
            </p>
          </motion.div>

          <Button
            size="lg"
            className="h-14 px-8 text-base font-semibold gap-2 animate-pulse-glow"
            onClick={() => setStarted(true)}
          >
            Start Planning
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen snow-gradient">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Mountain className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold tracking-wider text-primary uppercase">
            PowderPlan
          </span>
        </div>

        <ProgressBar currentStep={step} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepBasics
              key="basics"
              data={basics}
              onChange={(d) => setBasics((p) => ({ ...p, ...d }))}
            />
          )}
          {step === 2 && (
            <StepSkills
              key="skills"
              data={skills}
              onChange={(d) => setSkills((p) => ({ ...p, ...d }))}
            />
          )}
          {step === 3 && (
            <StepBudget
              key="budget"
              data={budget}
              onChange={(d) => setBudget((p) => ({ ...p, ...d }))}
            />
          )}
          {step === 4 && (
            <StepInvites key="invites" tripId={tripId} groupSize={basics.groupSize} />
          )}
          {step === 5 && (
            <StepReview
              key="review"
              basics={basics}
              skills={skills}
              budget={budget}
              guestCount={guestCount}
              onGoToStep={setStep}
              onGenerate={handleGenerate}
            />
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
            className="glass gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < 5 && (
            <Button onClick={nextStep} className="gap-2">
              {step === 3 ? "Save & Continue" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
