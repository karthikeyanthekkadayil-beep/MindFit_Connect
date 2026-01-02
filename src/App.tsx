import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import HealthAssessment from "./pages/register/Health";
import Preferences from "./pages/register/Preferences";
import Dashboard from "./pages/Dashboard";
import DailyPlanner from "./pages/DailyPlanner";
import Profile from "./pages/Profile";
import WorkoutLibrary from "./pages/WorkoutLibrary";
import WorkoutDetail from "./pages/WorkoutDetail";
import WorkoutBuilder from "./pages/WorkoutBuilder";
import Nutrition from "./pages/Nutrition";
import Mindfulness from "./pages/Mindfulness";
import Progress from "./pages/Progress";
import Goals from "./pages/Goals";
import SharedGoals from "./pages/SharedGoals";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Messages from "./pages/Messages";
import ChatThread from "./pages/ChatThread";
import Admin from "./pages/Admin";
import AdminAuth from "./pages/AdminAuth";
import Balance from "./pages/Balance";
import Moderator from "./pages/Moderator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PushNotificationProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/register/health" element={<HealthAssessment />} />
          <Route path="/register/preferences" element={<Preferences />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/planner" element={<DailyPlanner />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/workouts" element={<WorkoutLibrary />} />
          <Route path="/workouts/:id" element={<WorkoutDetail />} />
          <Route path="/workouts/builder" element={<WorkoutBuilder />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/mindfulness" element={<Mindfulness />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/goals/shared" element={<SharedGoals />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:id" element={<CommunityDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<ChatThread />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminAuth />} />
          <Route path="/balance" element={<Balance />} />
          <Route path="/moderator" element={<Moderator />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </PushNotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
