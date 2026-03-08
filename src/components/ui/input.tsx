import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <motion.div
        whileFocus="focus"
        className="w-full"
      >
        <motion.div
          initial={false}
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 focus:scale-[1.01] focus:shadow-[0_0_0_3px_hsl(221_83%_53%/0.12)]",
              className,
            )}
            ref={ref}
            {...props}
          />
        </motion.div>
      </motion.div>
    );
  },
);
Input.displayName = "Input";

export { Input };
