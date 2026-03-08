import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, Users, TrendingUp, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { id: "home", icon: Home, label: "Home", path: "/dashboard" },
  { id: "plan", icon: Calendar, label: "Plan", path: "/planner" },
  { id: "social", icon: Users, label: "Social", path: "/communities" },
  { id: "progress", icon: TrendingUp, label: "Progress", path: "/progress" },
  { id: "profile", icon: UserCircle, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === "/planner") return "plan";
    if (location.pathname === "/profile") return "profile";
    if (location.pathname.startsWith("/communities")) return "social";
    if (location.pathname.startsWith("/progress")) return "progress";
    if (location.pathname === "/dashboard") return "home";
    return "home";
  };

  const activeTab = getActiveTab();

  const handleTabClick = (path: string) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom,8px)] pointer-events-none">
      <motion.nav
        className="pointer-events-auto max-w-lg mx-auto mb-2 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/10"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 28 }}
      >
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full rounded-xl touch-target",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.85, transition: { type: "spring", stiffness: 500, damping: 25 } }}
                transition={{ delay: 0.4 + index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.span
                    className="absolute inset-1 rounded-xl bg-primary/10"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <motion.div
                  className="relative z-10 flex flex-col items-center justify-center"
                  animate={isActive ? { scale: 1.08 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <tab.icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive && "stroke-[2.5px]"
                    )}
                  />
                  <span className={cn(
                    "text-[10px] mt-0.5 font-medium transition-all duration-200",
                    isActive && "font-semibold"
                  )}>
                    {tab.label}
                  </span>
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
};
