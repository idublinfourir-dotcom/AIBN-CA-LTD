"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE = [0.23, 1, 0.32, 1] as const;

const variants = {
  hidden: { clipPath: "inset(0 0 100% 0)", scale: 1.05 },
  shown: { clipPath: "inset(0 0 0 0)", scale: 1 },
};

/**
 * Reveals a contained background image once, on scroll into view, with a
 * top-down clip-path wipe and a slight settle from scale(1.05).
 * Reduced-motion → image shown immediately, no movement. Same server/client
 * `initial` contract as `Reveal` (see reveal.tsx).
 *
 * The outer box is what gets observed; the image inside is what gets clipped.
 * Chromium measures an IntersectionObserver target through its own clip-path,
 * so a fully clipped element reports a ratio of 0 and would never reveal.
 */
export function ClipReveal({
  url,
  className = "",
}: {
  url: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={`overflow-hidden ${className}`}
      initial="hidden"
      animate={reduce ? "shown" : undefined}
      whileInView={reduce ? undefined : "shown"}
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.div
        data-reveal=""
        style={{ backgroundImage: `url(${url})` }}
        className="h-full w-full bg-cover bg-center"
        variants={variants}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE }}
      />
    </motion.div>
  );
}
