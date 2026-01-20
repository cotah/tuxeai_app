import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AgentMarketplace from "./pages/AgentMarketplace";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import Customers from "./pages/Customers";
import Conversations from "./pages/Conversations";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/agents"} component={AgentMarketplace} />
      <Route path={"/marketplace"} component={AgentMarketplace} />
      <Route path={"/reservations"} component={Reservations} />
      <Route path={"/customers"} component={Customers} />
      <Route path={"/conversations"} component={Conversations} />
      <Route path={"/404"} component={NotFound} />
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
