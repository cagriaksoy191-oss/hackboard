import React from 'react';
import { motion } from 'framer-motion';

function StatCard({ title, value, icon, color, delay, onClick }) {
  const Element = onClick ? motion.button : motion.div;
  const interactiveClasses = onClick ? 'cursor-pointer hover:bg-[var(--surface-bg-hover)] transition-colors w-full text-left' : '';

  return (
    <Element
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`glass rounded-2xl p-5 card-hover ${interactiveClasses}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-secondary">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
      </div>
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.2, type: 'spring' }}
        className="text-3xl font-bold text-primary"
      >
        {value}
      </motion.div>
    </Element>
  );
}

export default StatCard;
