import { motion } from "framer-motion";

const steps = ["Trip Basics", "Budget", "Invites", "Review"];

interface ProgressBarProps {
  currentStep: number;
}

const ProgressBar = ({ currentStep }: ProgressBarProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
        {/* Active line */}
        <motion.div
          className="absolute top-4 left-0 h-0.5 bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          return (
            <div key={label} className="relative flex flex-col items-center z-10">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary text-primary-foreground animate-pulse-glow"
                    : "bg-secondary text-muted-foreground"
                }`}
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isDone ? "✓" : stepNum}
              </motion.div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
