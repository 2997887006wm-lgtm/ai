import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { VideoPollingProvider } from "@/hooks/useVideoPolling";
import { VideoProgressPanel } from "@/components/VideoProgressPanel";
import { useVideoPolling } from "@/hooks/useVideoPolling";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Community from "./pages/Community";
import Report from "./pages/Report";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function GlobalVideoProgress() {
  const { videoJobs, dismissJob } = useVideoPolling();
  return <VideoProgressPanel jobs={videoJobs} onDismiss={dismissJob} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <VideoPollingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/account" element={<Account />} />
              <Route path="/community" element={<Community />} />
              <Route path="/report" element={<Report />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <GlobalVideoProgress />
        </TooltipProvider>
      </VideoPollingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
