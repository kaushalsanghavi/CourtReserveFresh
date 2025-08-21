import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SelectedMemberProvider } from "@/components/QuickBooking";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CommentsDemo from "@/pages/comments-demo";

function Router() {
  // Hide demo route in production deployments
  const isProduction = import.meta.env.PROD || import.meta.env.VITE_REPLIT_DEPLOYMENT;
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      {!isProduction && <Route path="/comments-demo" component={CommentsDemo} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SelectedMemberProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </SelectedMemberProvider>
    </QueryClientProvider>
  );
}

export default App;
