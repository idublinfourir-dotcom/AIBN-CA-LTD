"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Reveals its children once, as they scroll into view: a short rise + fade.
 * Built on Framer Motion (`motion`). Honours prefers-reduced-motion (renders
 * in place, no movement).
 *
 * `initial` must be the same on server and client. The server cannot know the
 * visitor's motion setting, so it always renders the hidden state; reduced
 * motion then shows the content with an instant `animate` on mount. Switching
 * `initial` to `false` for reduced motion instead leaves the server's hidden
 * styles in place forever, which blanked whole sections for those visitors.
 * `data-reveal` is the hook for the no-JS fallback in `app/layout.tsx`.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={reduce ? { opacity: 1, y: 0 } : undefined}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={
        reduce ? { duration: 0 } : { duration: 0.6, ease: EASE, delay: delay / 1000 }
      }
    >
      {children}
    </motion.div>
  );
}
