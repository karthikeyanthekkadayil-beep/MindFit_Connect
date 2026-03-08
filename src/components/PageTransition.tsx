import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useTransitionOrigin } from "./TransitionContext";

interface PageTransitionProps {
  children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const { origin } = useTransitionOrigin();
  const { x, y } = origin.current;

  // Calculate the max radius needed to cover the full viewport from the click point
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  return (
    <motion.div
      className="min-h-screen"
      initial={{
        clipPath: `circle(0px at ${x}px ${y}px)`,
        opacity: 0.6,
      }}
      animate={{
        clipPath: `circle(${maxRadius}px at ${x}px ${y}px)`,
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        transition: { duration: 0.15, ease: "easeIn" },
      }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.2 },
      }}
    >
      {children}
    </motion.div>
  );
};
