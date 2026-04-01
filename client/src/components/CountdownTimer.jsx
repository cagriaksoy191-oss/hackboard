import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const format = (n) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-gray-400 uppercase tracking-wider">Hackathon Bitis:</div>
      <div className="flex gap-1">
        {[format(hours), format(minutes), format(seconds)].map((val, i) => (
          <div key={i} className="flex items-center">
            <motion.div
              key={val}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-card border border-white/10 rounded-lg px-2 py-1 text-accent font-mono font-bold text-sm"
            >
              {val}
            </motion.div>
            {i < 2 && <span className="text-accent font-bold mx-0.5">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CountdownTimer;
