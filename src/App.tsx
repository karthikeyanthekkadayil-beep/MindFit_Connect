import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import { InstallPromptBanner } from "@/components/InstallPromptBanner";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <PushNotificationProvider>
          <Toaster />
          <Sonner />
          <InstallPromptBanner />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </PushNotificationProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
