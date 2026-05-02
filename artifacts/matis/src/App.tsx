import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Pipelines from "@/pages/pipelines";
import PipelineDetail from "@/pages/pipeline-detail";
import Agents from "@/pages/agents";
import Failures from "@/pages/failures";
import FailureDetail from "@/pages/failure-detail";
import Bugs from "@/pages/bugs";
import Evals from "@/pages/evals";
import Logs from "@/pages/logs";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/pipelines" component={Pipelines} />
        <Route path="/pipelines/:id" component={PipelineDetail} />
        <Route path="/agents" component={Agents} />
        <Route path="/failures" component={Failures} />
        <Route path="/failures/:id" component={FailureDetail} />
        <Route path="/bugs" component={Bugs} />
        <Route path="/evals" component={Evals} />
        <Route path="/logs" component={Logs} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
