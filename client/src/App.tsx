import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import CrmBoard from "@/pages/CrmBoard";
import Outreach from "@/pages/Outreach";
import Search from "@/pages/Search";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        {/* <Route path="/" component={Dashboard} /> */}
        <Route path="/leads/:id" component={LeadDetail} />
        {/* <Route path="/leads" component={Leads} /> */}
        <Route path="/search" component={Search} />
        {/* <Route path="/crm" component={CrmBoard} /> */}
        {/* <Route path="/outreach" component={Outreach} /> */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
