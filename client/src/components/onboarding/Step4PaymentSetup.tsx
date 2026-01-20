import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  CreditCard,
  Building2,
  Clock,
  Check,
  Lock,
  Package,
} from "lucide-react";
import type { StepProps } from "../OnboardingWizard";

const BUNDLE_THRESHOLD = 3;
const BUNDLE_DISCOUNT_PERCENT = 10;

function getSelectedAgentsFromData(data: Record<string, unknown>): string[] {
  if (!data.selectedAgents || !Array.isArray(data.selectedAgents)) {
    return [];
  }
  return data.selectedAgents as string[];
}

function getRestaurantName(data: Record<string, unknown>): string {
  return (data.name as string) || "Your Restaurant";
}

export function Step4PaymentSetup({ data }: StepProps) {
  const selectedAgentKeys = getSelectedAgentsFromData(data);
  const restaurantName = getRestaurantName(data);

  const { data: catalog } = trpc.agents.catalog.useQuery();

  const selectedAgents = catalog?.filter((agent) =>
    selectedAgentKeys.includes(agent.agentKey)
  ) || [];

  const calculateSubtotal = (): number => {
    return selectedAgents.reduce(
      (sum, agent) => sum + parseFloat(agent.basePriceMonthly),
      0
    );
  };

  const subtotal = calculateSubtotal();
  const isBundleActive = selectedAgentKeys.length >= BUNDLE_THRESHOLD;
  const discountAmount = isBundleActive
    ? subtotal * (BUNDLE_DISCOUNT_PERCENT / 100)
    : 0;
  const total = subtotal - discountAmount;

  return (
    <div className="space-y-6">
      {/* Order Summary Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-slate-600" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Restaurant Name */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Restaurant</span>
            <span className="font-medium text-slate-900">{restaurantName}</span>
          </div>

          <Separator />

          {/* Selected Agents */}
          <div className="space-y-3">
            <span className="text-sm text-slate-600">Selected Agents</span>

            {selectedAgents.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No agents selected
              </p>
            ) : (
              <div className="space-y-2">
                {selectedAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-slate-900">
                        {agent.name}
                      </span>
                    </div>
                    <span className="text-sm text-slate-700">
                      €{parseFloat(agent.basePriceMonthly).toFixed(0)}/mo
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Pricing breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-900">€{subtotal.toFixed(0)}/mo</span>
            </div>

            {isBundleActive && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">
                    Bundle discount ({BUNDLE_DISCOUNT_PERCENT}%)
                  </span>
                </div>
                <span className="text-green-700">
                  -€{discountAmount.toFixed(0)}/mo
                </span>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900">
                  €{total.toFixed(0)}
                </span>
                <span className="text-sm text-slate-500">/mo</span>
              </div>
            </div>

            {isBundleActive && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 w-full justify-center py-1"
              >
                Bundle discount applied at checkout
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-slate-600" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stripe placeholder */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center">
                <Lock className="h-6 w-6 text-slate-400" />
              </div>
            </div>
            <p className="text-slate-600 mb-2">
              Secure payment processing powered by Stripe
            </p>
            <p className="text-sm text-slate-400">
              You won&apos;t be charged until you confirm your subscription
            </p>
          </div>

          {/* Proceed button - disabled */}
          <Button className="w-full" size="lg" disabled>
            <CreditCard className="h-4 w-4 mr-2" />
            Proceed to Payment
          </Button>

          <p className="text-xs text-center text-slate-500">
            <Clock className="h-3 w-3 inline mr-1" />
            Stripe Checkout will be enabled soon.
          </p>
        </CardContent>
      </Card>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Payment processing is not yet available. For
          now, you can complete the onboarding to explore the platform. You
          will be able to set up billing from the dashboard once Stripe
          integration is live.
        </p>
      </div>

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          <span>SSL Encrypted</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <CreditCard className="h-3 w-3" />
          <span>PCI Compliant</span>
        </div>
        <span>•</span>
        <span>Cancel anytime</span>
      </div>
    </div>
  );
}
