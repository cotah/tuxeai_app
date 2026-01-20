import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  CalendarCheck,
  MessageSquare,
  Star,
  Users,
  Check,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  CalendarCheck,
  MessageSquare,
  Star,
  Users,
};

const categoryColors = {
  starter: "bg-blue-100 text-blue-700",
  growth: "bg-purple-100 text-purple-700",
  premium: "bg-yellow-100 text-yellow-700",
};

export default function AgentMarketplace() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: catalog, isLoading: catalogLoading } = trpc.agents.catalog.useQuery();
  const { data: subscribed, isLoading: subscribedLoading } = trpc.agents.subscribed.useQuery(
    { restaurantId: undefined },
    { enabled: isAuthenticated }
  );

  const subscribeMutation = trpc.agents.subscribe.useMutation({
    onSuccess: () => {
      toast.success("Successfully subscribed to agent!");
      // Invalidate queries to refresh data
      trpc.useUtils().agents.subscribed.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to subscribe");
    },
  });

  const subscribedAgentKeys = new Set(subscribed?.map((s) => s.agentKey) || []);

  const handleSubscribe = (agentKey: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    subscribeMutation.mutate({
      restaurantId: undefined,
      agentKey,
      configuration: {},
    });
  };

  if (authLoading || catalogLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">AI Agent Marketplace</h1>
          <p className="text-slate-600 mt-2">
            Choose the AI employees your restaurant needs. Subscribe to individual agents or bundles.
          </p>
        </div>
      </header>

      {/* Agents Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {catalog?.map((agent) => {
            const Icon = iconMap[agent.icon || "MessageSquare"];
            const isSubscribed = subscribedAgentKeys.has(agent.agentKey);

            return (
              <Card key={agent.id} className="p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge className={categoryColors[agent.category]}>
                    {agent.category}
                  </Badge>
                </div>

                <h3 className="text-xl font-semibold mb-2">{agent.name}</h3>
                <p className="text-sm text-slate-600 mb-4 flex-grow">{agent.description}</p>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {(agent.features as any[])?.slice(0, 4).map((feature: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing & CTA */}
                <div className="mt-auto pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-2xl font-bold">
                        €{parseFloat(agent.basePriceMonthly).toFixed(0)}
                      </div>
                      <div className="text-sm text-slate-500">per month</div>
                    </div>
                  </div>

                  {isSubscribed ? (
                    <Button className="w-full" variant="outline" disabled>
                      <Check className="h-4 w-4 mr-2" />
                      Subscribed
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(agent.agentKey)}
                      disabled={subscribeMutation.isPending}
                    >
                      {subscribeMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Subscribing...
                        </>
                      ) : (
                        "Subscribe Now"
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Bundle Pricing */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Bundle Packages</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Starter Pack</h3>
              <div className="text-3xl font-bold mb-2">€129</div>
              <div className="text-sm text-slate-500 mb-4">per month</div>
              <p className="text-sm text-slate-600 mb-4">
                Reservation + Support Agents
              </p>
              <div className="text-sm text-green-600 font-medium">Save 15%</div>
            </Card>

            <Card className="p-6 text-center border-2 border-blue-600 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-2">Growth Pack</h3>
              <div className="text-3xl font-bold mb-2">€349</div>
              <div className="text-sm text-slate-500 mb-4">per month</div>
              <p className="text-sm text-slate-600 mb-4">
                All 4 Agents Included
              </p>
              <div className="text-sm text-green-600 font-medium">Save 20%</div>
            </Card>

            <Card className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <div className="text-3xl font-bold mb-2">Custom</div>
              <div className="text-sm text-slate-500 mb-4">pricing</div>
              <p className="text-sm text-slate-600 mb-4">
                Multi-location + Priority Support
              </p>
              <div className="text-sm text-blue-600 font-medium">Contact Us</div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
