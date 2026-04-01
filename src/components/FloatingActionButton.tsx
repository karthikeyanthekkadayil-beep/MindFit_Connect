import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Dumbbell, Brain, Calendar, Users, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { icon: Dumbbell, label: "Workout", path: "/workouts", color: "hsl(var(--secondary))" },
  { icon: Brain, label: "Mindfulness", path: "/mindfulness", color: "hsl(var(--accent))" },
  { icon: Calendar, label: "Plan", path: "/planner", color: "hsl(var(--primary))" },
  { icon: Users, label: "Communities", path: "/communities", color: "hsl(var(--secondary))" },
  { icon: MessageSquare, label: "Messages", path: "/messages", color: "hsl(var(--primary))" },
];

export const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    if ("vibrate" in navigator) navigator.vibrate(10);
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-end gap-3">
      {/* Action items */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            {actions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 10 }}
                transition={{
                  delay: i * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 22,
                }}
                onClick={() => handleAction(action.path)}
                className="flex items-center gap-3 group"
              >
                <span className="px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur-xl border border-white/10 text-xs font-medium text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  {action.label}
                </span>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/15 backdrop-blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${action.color} 0%, hsl(var(--primary) / 0.8) 100%)`,
                  }}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </div>
              </motion.button>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => {
          if ("vibrate" in navigator) navigator.vibrate(10);
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-xl",
          "bg-primary text-primary-foreground",
          "border border-white/20"
        )}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        style={{
          boxShadow: "0 8px 32px hsl(var(--primary) / 0.4)",
        }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>
    </div>
  );
};
