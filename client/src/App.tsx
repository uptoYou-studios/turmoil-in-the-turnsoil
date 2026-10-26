import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Episodes from "./pages/Episodes";
import Devos from "./pages/Devos";
import Characters from "./pages/Characters";
import AboutTurmoil from "./pages/AboutTurmoil";
import AboutStudio from "./pages/AboutStudio";
import Subscribers from "./pages/Subscribers";

const isGitHubPages = import.meta.env.VITE_GITHUB_PAGES === "true";

function Router() {
  return (
    <WouterRouter hook={isGitHubPages ? useHashLocation : undefined}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/episodes" component={Episodes} />
        <Route path="/devos" component={Devos} />
        <Route path="/characters" component={Characters} />
        <Route path="/about-turmoil" component={AboutTurmoil} />
        <Route path="/about-studio" component={AboutStudio} />
        <Route path={"/file-storage"} component={FileStorage} />
        <Route path={"/subscribers"} component={Subscribers} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
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
