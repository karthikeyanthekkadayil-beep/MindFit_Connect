import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-200", className)} {...props} />
));
Card.displayName = "Card";

// Interactive card with hover lift + tap press animations
interface InteractiveCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  tapScale?: number;
}

const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, children, hoverScale = 1.02, tapScale = 0.98, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm cursor-pointer",
        className,
      )}
      whileHover={{
        scale: hoverScale,
        boxShadow: "0 8px 30px -8px hsl(221 83% 53% / 0.15)",
        transition: { type: "spring", stiffness: 400, damping: 25 },
      }}
      whileTap={{
        scale: tapScale,
        transition: { type: "spring", stiffness: 500, damping: 30 },
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
InteractiveCard.displayName = "InteractiveCard";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, InteractiveCard, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
