import { motion } from "framer-motion";

interface MatchScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

const MatchScoreRing = ({ score, size = 80, strokeWidth = 6 }: MatchScoreRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  const color =
    score >= 85 ? "hsl(var(--success))" :
    score >= 70 ? "hsl(var(--warning))" :
    "hsl(var(--destructive))";

  const bgColor =
    score >= 85 ? "hsl(var(--success) / 0.15)" :
    score >= 70 ? "hsl(var(--warning) / 0.15)" :
    "hsl(var(--destructive) / 0.15)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-foreground">{score}%</span>
        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">match</span>
      </div>
    </div>
  );
};

export default MatchScoreRing;
