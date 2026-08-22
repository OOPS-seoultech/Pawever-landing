import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AccountDeletion from "./pages/AccountDeletion";
import Contact from "./pages/Contact";
import Service from "./pages/Service";
import AppService from "./pages/AppService";
import Roadmap from "./pages/Roadmap";
import GoodsSurvey from "./pages/GoodsSurvey";
import GoodsSurveyForm from "./pages/GoodsSurveyForm";
import AdminLogin from "./pages/AdminLogin";
import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import AdminAccounts from "./pages/AdminAccounts";
import AdminAcceptInvite from "./pages/AdminAcceptInvite";
import { useEffect } from "react";
import { initializeAnalytics } from "./lib/analytics/analytics";

function AnalyticsBootstrap() {
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/service" component={Service} />
      <Route path="/app" component={AppService} />
      <Route path="/roadmap" component={Roadmap} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/account-deletion" component={AccountDeletion} />
      <Route path="/contact" component={Contact} />
      <Route path="/goods-survey/survey" component={GoodsSurveyForm} />
      <Route path="/goods-survey" component={GoodsSurvey} />
      {/* 관리자 화면. 더 긴 주소를 먼저 둔다 — /admin 이 앞에 오면 뒤가 안 잡힌다. */}
      <Route path="/admin/accept-invite" component={AdminAcceptInvite} />
      <Route path="/admin/orders/:orderNumber" component={AdminOrderDetail} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/accounts" component={AdminAccounts} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <AnalyticsBootstrap />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
