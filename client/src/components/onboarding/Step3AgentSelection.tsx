import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import {
  CalendarCheck,
  MessageSquare,
  Star,
  Users,
  AlertCircle,
  RefreshCw,
  Package,
  Check,
} from "lucide-react";
import type { StepProps } from "../OnboardingWizard";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CalendarCheck,
  MessageSquare,
  Star,
  Users,
};

const BUNDLE_THRESHOLD = 3;
const BUNDLE_DISCOUNT_PERCENT = 10;

interface CatalogAgent {
  id: number;
  agentKey: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  basePriceMonthly: string;
  features?: string[];
  isPopular?: boolean;
  isRecommended?: boolean;
}

function parseSelectedAgents(data: Record<string, unknown>): string[] {
  if (!data.selectedAgents || !Array.isArray(data.selectedAgents)) {
    return [];
  }
  return data.selectedAgents as string[];
}

function AgentCardSkeleton() {
  return (
    <Card className="p-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-5 w-3/4 mt-3" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
}

export function Step3AgentSelection({ data, onUpdate }: StepProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(() =>
    parseSelectedAgents(data)
  );

  const {
    data: catalog,
    isLoading,
    error,
    refetch,
  } = trpc.agents.catalog.useQuery();

  // Sync selected agents to parent
  useEffect(() => {
    onUpdate({ selectedAgents });
  }, [selectedAgents, onUpdate]);

  const handleToggleAgent = (agentKey: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentKey)
        ? prev.filter((key) => key !== agentKey)
        : [...prev, agentKey]
    );
  };

  const calculateTotal = (): number => {
    if (!catalog) return 0;

    const total = selectedAgents.reduce((sum, agentKey) => {
      const agent = catalog.find((a) => a.agentKey === agentKey);
      return sum + (agent ? parseFloat(agent.basePriceMonthly) : 0);
    }, 0);

    return total;
  };

  const calculateDiscountedTotal = (): number => {
    const total = calculateTotal();
    if (selectedAgents.length >= BUNDLE_THRESHOLD) {
      return total * (1 - BUNDLE_DISCOUNT_PERCENT / 100);
    }
    return total;
  };

  const isBundleUnlocked = selectedAgents.length >= BUNDLE_THRESHOLD;
  const total = calculateTotal();
  const discountedTotal = calculateDiscountedTotal();

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load agent catalog. Please try again.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalog?.map((agent) => {
          const Icon = iconMap[agent.icon || "MessageSquare"] || MessageSquare;
          const isSelected = selectedAgents.includes(agent.agentKey);
          const price = parseFloat(agent.basePriceMonthly);
          const agentData = agent as CatalogAgent;

          return (
            <Card
              key={agent.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? "ring-2 ring-blue-600 border-blue-600"
                  : "hover:border-slate-300"
              }`}
              onClick={() => handleToggleAgent(agent.agentKey)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {(agentData.isPopular || agent.category === "starter") && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        Popular
                      </Badge>
                    )}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleAgent(agent.agentKey)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${agent.name}`}
                    />
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{agent.name}</CardTitle>
                <CardDescription className="text-sm">
                  {agent.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">
                    €{price.toFixed(0)}
                  </span>
                  <span className="text-sm text-slate-500">/mo</span>
                </div>

                {/* Features preview */}
                {agentData.features && agentData.features.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {(agentData.features as string[]).slice(0, 2).map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-600"
                      >
                        <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Bundle notification */}
      {isBundleUnlocked ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Package className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Bundle unlocked!</p>
            <p className="text-sm text-green-700 mt-1">
              You selected {selectedAgents.length} agents. A {BUNDLE_DISCOUNT_PERCENT}%
              discount will be applied at checkout.
            </p>
          </div>
        </div>
      ) : selectedAgents.length > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Bundle available</p>
            <p className="text-sm text-blue-700 mt-1">
              Select {BUNDLE_THRESHOLD - selectedAgents.length} more agent
              {BUNDLE_THRESHOLD - selectedAgents.length > 1 ? "s" : ""} to unlock
              a {BUNDLE_DISCOUNT_PERCENT}% discount!
            </p>
          </div>
        </div>
      ) : null}

      {/* Total summary */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">
              {selectedAgents.length} agent{selectedAgents.length !== 1 ? "s" : ""}{" "}
              selected
            </p>
            {isBundleUnlocked && (
              <p className="text-xs text-green-600 mt-1">
                Bundle discount ({BUNDLE_DISCOUNT_PERCENT}%) applied at checkout
              </p>
            )}
          </div>
          <div className="text-right">
            {isBundleUnlocked && (
              <p className="text-sm text-slate-400 line-through">
                €{total.toFixed(0)}/mo
              </p>
            )}
            <p className="text-2xl font-bold text-slate-900">
              €{discountedTotal.toFixed(0)}
              <span className="text-sm font-normal text-slate-500">/mo</span>
            </p>
            {isBundleUnlocked && (
              <p className="text-xs text-slate-500 mt-1">(estimated)</p>
            )}
          </div>
        </div>
      </div>

      {/* Tip box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> You can change your agent subscriptions at any
          time from the dashboard. Start with the agents you need most and add
          more as your business grows.
        </p>
      </div>
    </div>
  );
}
