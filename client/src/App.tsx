import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ConversationDetail from "./pages/ConversationDetail";
import AnalysisResult from "./pages/AnalysisResult";
import Onboarding from "./pages/Onboarding";
import ConversationHistory from "./pages/ConversationHistory";
import AdminErrorDashboard from "./pages/AdminErrorDashboard";
import BetaFeedbackDashboard from "./pages/BetaFeedbackDashboard";
import AdminBetaInvitation from "./pages/AdminBetaInvitation";
import AdminBetaStatistics from "./pages/AdminBetaStatistics";
import BetaAccept from "./pages/BetaAccept";

function Router() {
  // 온보딩 완료 여부 확인
  const onboardingCompleted = localStorage.getItem("onboarding_completed");

  // 온보딩이 완료되지 않았으면 온보딩 화면으로 리다이렉트
  if (!onboardingCompleted && window.location.pathname === "/") {
    window.location.href = "/onboarding";
  }

  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/beta/accept/:token" component={BetaAccept} />
      <Route path="/admin/errors" component={AdminErrorDashboard} />
      <Route path="/admin/feedback" component={BetaFeedbackDashboard} />
      <Route path="/admin/beta-invite" component={AdminBetaInvitation} />
      <Route path="/admin/beta-stats" component={AdminBetaStatistics} />
      <Route path="/conversation/:id/history" component={ConversationHistory} />
      <Route path="/conversation/:id" component={ConversationDetail} />
      <Route path="/analysis/:conversationId" component={AnalysisResult} />
      <Route path="/404" component={NotFound} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
