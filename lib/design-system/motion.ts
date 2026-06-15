import type { Transition, Variants } from "framer-motion";

import { motionScale } from "./tokens";

export const reducedMotion =
  "@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; } }";

const baseTransition: Transition = {
  duration: motionScale.standard,
  ease: motionScale.easing,
};

export const panelEnter: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: baseTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { ...baseTransition, duration: motionScale.swift },
  },
  exit: {
    opacity: 0,
    transition: { duration: motionScale.swift, ease: motionScale.easingSoft },
  },
};

export const stagger = (delayStep = 0.05): Variants => ({
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delayChildren: 0.04,
      staggerChildren: delayStep,
      ease: motionScale.easing,
      duration: motionScale.standard,
    },
  },
});

export const revealList: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionScale.standard,
      ease: motionScale.easing,
      staggerChildren: 0.06,
    },
  },
};
