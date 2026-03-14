import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { ScrollToTop } from "./ScrollToTop";
import { PageTransition } from "./PageTransition";
import { TransitionProvider, useTransitionOrigin } from "./TransitionContext";
import { BottomNav } from "./BottomNav";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import HealthAssessment from "@/pages/register/Health";
import Preferences from "@/pages/register/Preferences";
import Dashboard from "@/pages/Dashboard";
import DailyPlanner from "@/pages/DailyPlanner";
import Profile from "@/pages/Profile";
import WorkoutLibrary from "@/pages/WorkoutLibrary";
import WorkoutDetail from "@/pages/WorkoutDetail";
import WorkoutBuilder from "@/pages/WorkoutBuilder";
import WorkoutSession from "@/pages/WorkoutSession";
import Nutrition from "@/pages/Nutrition";
import Mindfulness from "@/pages/Mindfulness";
import Progress from "@/pages/Progress";
import Goals from "@/pages/Goals";
import SharedGoals from "@/pages/SharedGoals";
import Communities from "@/pages/Communities";
import CommunityDetail from "@/pages/CommunityDetail";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Messages from "@/pages/Messages";
import ChatThread from "@/pages/ChatThread";
import Admin from "@/pages/Admin";
import Balance from "@/pages/Balance";
import Moderator from "@/pages/Moderator";
import ModeratorRequest from "@/pages/ModeratorRequest";
import Rewards from "@/pages/Rewards";
import Leaderboard from "@/pages/Leaderboard";
import ReportProblem from "@/pages/ReportProblem";
import NotFound from "@/pages/NotFound";

const ClickCapture = ({ children }: { children: React.ReactNode }) => {
  const { captureOrigin } = useTransitionOrigin();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [role='button'], [data-nav]")) {
        captureOrigin(e);
      }
    };
    window.addEventListener("click", handler, true);
    return () => window.removeEventListener("click", handler, true);
  }, [captureOrigin]);

  return <>{children}</>;
};

// Routes that should NOT show the bottom nav
const hideNavRoutes = ["/", "/auth", "/register/health", "/register/preferences"];

const RoutesInner = () => {
  const location = useLocation();
  const showNav = !hideNavRoutes.includes(location.pathname);
  
  useSwipeNavigation();

  return (
    <>
      <div className={showNav ? "pb-24" : ""}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Index /></PageTransition>} />
            <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
            <Route path="/register/health" element={<PageTransition><HealthAssessment /></PageTransition>} />
            <Route path="/register/preferences" element={<PageTransition><Preferences /></PageTransition>} />
            <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/planner" element={<PageTransition><DailyPlanner /></PageTransition>} />
            <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
            <Route path="/workouts" element={<PageTransition><WorkoutLibrary /></PageTransition>} />
            <Route path="/workouts/:id" element={<PageTransition><WorkoutDetail /></PageTransition>} />
            <Route path="/workouts/:id/session" element={<PageTransition><WorkoutSession /></PageTransition>} />
            <Route path="/workouts/builder" element={<PageTransition><WorkoutBuilder /></PageTransition>} />
            <Route path="/nutrition" element={<PageTransition><Nutrition /></PageTransition>} />
            <Route path="/mindfulness" element={<PageTransition><Mindfulness /></PageTransition>} />
            <Route path="/progress" element={<PageTransition><Progress /></PageTransition>} />
            <Route path="/goals" element={<PageTransition><Goals /></PageTransition>} />
            <Route path="/goals/shared" element={<PageTransition><SharedGoals /></PageTransition>} />
            <Route path="/communities" element={<PageTransition><Communities /></PageTransition>} />
            <Route path="/communities/:id" element={<PageTransition><CommunityDetail /></PageTransition>} />
            <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
            <Route path="/events/:id" element={<PageTransition><EventDetail /></PageTransition>} />
            <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
            <Route path="/messages/:id" element={<PageTransition><ChatThread /></PageTransition>} />
            <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
            <Route path="/balance" element={<PageTransition><Balance /></PageTransition>} />
            <Route path="/moderator" element={<PageTransition><Moderator /></PageTransition>} />
            <Route path="/moderator/request" element={<PageTransition><ModeratorRequest /></PageTransition>} />
            <Route path="/rewards" element={<PageTransition><Rewards /></PageTransition>} />
            <Route path="/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
            <Route path="/report-problem" element={<PageTransition><ReportProblem /></PageTransition>} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </div>
      {showNav && <BottomNav />}
    </>
  );
};

export const AnimatedRoutes = () => {
  return (
    <TransitionProvider>
      <ScrollToTop />
      <ClickCapture>
        <RoutesInner />
      </ClickCapture>
    </TransitionProvider>
  );
};
