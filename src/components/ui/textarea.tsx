import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <motion.textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
        className,
      )}
      ref={ref}
      whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px hsl(221 83% 53% / 0.12)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
