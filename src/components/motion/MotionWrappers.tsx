import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

// Stagger container - wrap lists of items
export const MotionList = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.06,
          delayChildren: delay,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// Individual animated item
export const MotionItem = ({
  children,
  className,
  ...props
}: HTMLMotionProps<"div"> & { children: React.ReactNode }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 16, scale: 0.97 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 24 },
      },
    }}
    {...props}
  >
    {children}
  </motion.div>
);

// Fade in from bottom
export const MotionFadeIn = ({
  children,
  className,
  delay = 0,
  y = 20,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

// Scale in (good for cards, modals)
export const MotionScaleIn = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35, delay, type: "spring", stiffness: 260, damping: 20 }}
  >
    {children}
  </motion.div>
);

// Slide in from side
export const MotionSlideIn = ({
  children,
  className,
  direction = "right",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "left" | "right";
  delay?: number;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, x: direction === "right" ? 30 : -30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

// Header animation (slide down)
export const MotionHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.header
    className={className}
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.header>
);

// Section with fade + slide
export const MotionSection = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.section
    className={className}
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.section>
);
