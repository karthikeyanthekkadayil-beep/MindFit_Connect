import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <motion.input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          className,
        )}
        ref={ref}
        whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px hsl(221 83% 53% / 0.12)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
