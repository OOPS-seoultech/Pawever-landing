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
import GoodsSurvey from "./pages/GoodsSurvey";
import GoodsSurveyForm from "./pages/GoodsSurveyForm";
import AnalyticsConsent from "./components/AnalyticsConsent";
import { useEffect } from "react";
import { initializeAnalytics } from "./lib/analytics/analytics";

function AnalyticsBootstrap() {
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return <AnalyticsConsent />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/account-deletion" component={AccountDeletion} />
      <Route path="/contact" component={Contact} />
      <Route path="/goods-survey/survey" component={GoodsSurveyForm} />
      <Route path="/goods-survey" component={GoodsSurvey} />
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
