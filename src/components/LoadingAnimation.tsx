import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const messages = [
  "Checking snow conditions...",
  "Scanning flights from 6 cities...",
  "Comparing lift ticket deals...",
  "Asking our AI ski expert...",
  "Ranking terrain matches...",
  "Almost ready...",
];

const LoadingAnimation = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen snow-gradient flex items-center justify-center px-4">
      <div className="text-center space-y-8">
        {/* Mountain SVG Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-64 h-40 mx-auto"
        >
          <svg viewBox="0 0 256 160" className="w-full h-full">
            {/* Background mountain */}
            <motion.path
              d="M0 160 L80 40 L130 100 L160 60 L256 160 Z"
              fill="hsl(var(--secondary))"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.5, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            {/* Foreground mountain */}
            <motion.path
              d="M20 160 L128 20 L236 160 Z"
              fill="hsl(var(--muted))"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            />
            {/* Snow cap */}
            <motion.path
              d="M100 65 L128 20 L156 65 L145 55 L128 70 L111 55 Z"
              fill="hsl(var(--foreground) / 0.9)"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            />
          </svg>

          {/* Animated snowflakes */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-foreground/30"
              style={{
                width: Math.random() * 4 + 2,
                height: Math.random() * 4 + 2,
                left: `${Math.random() * 100}%`,
              }}
              initial={{ y: -10, opacity: 0 }}
              animate={{
                y: [0, 160],
                opacity: [0, 0.8, 0],
                x: [0, Math.sin(i) * 20],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "linear",
              }}
            />
          ))}
        </motion.div>

        {/* Pulsing glow */}
        <motion.div
          className="w-16 h-1 mx-auto rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scaleX: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Cycling messages */}
        <div className="h-8 relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-muted-foreground text-sm font-medium"
            >
              {messages[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
