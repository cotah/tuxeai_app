import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  CheckCircle2,
  Building2,
  Clock,
  Bot,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { StepProps } from "../OnboardingWizard";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface BusinessDay {
  day: DayKey;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function getRestaurantName(data: Record<string, unknown>): string {
  return (data.name as string) || "Your Restaurant";
}

function getBusinessHours(data: Record<string, unknown>): BusinessDay[] {
  if (!data.businessHours || !Array.isArray(data.businessHours)) {
    return [];
  }
  return data.businessHours as BusinessDay[];
}

function getSelectedAgentKeys(data: Record<string, unknown>): string[] {
  if (!data.selectedAgents || !Array.isArray(data.selectedAgents)) {
    return [];
  }
  return data.selectedAgents as string[];
}

function formatHoursRange(day: BusinessDay): string {
  if (!day.isOpen) return "Closed";
  return `${day.openTime} - ${day.closeTime}`;
}

function summarizeBusinessHours(hours: BusinessDay[]): string {
  if (hours.length === 0) return "Not configured";

  const openDays = hours.filter((d) => d.isOpen);
  if (openDays.length === 0) return "All days closed";

  // Check if all open days have the same hours
  const firstOpen = openDays[0];
  const allSameHours = openDays.every(
    (d) =>
      d.openTime === firstOpen.openTime && d.closeTime === firstOpen.closeTime
  );

  if (allSameHours && openDays.length > 0) {
    const daysList = openDays.map((d) => DAY_LABELS[d.day]).join(", ");
    return `${daysList}: ${firstOpen.openTime} - ${firstOpen.closeTime}`;
  }

  // Show condensed summary
  return `${openDays.length} day${openDays.length > 1 ? "s" : ""} open`;
}

// Simple confetti animation component
function Confetti() {
  const [particles, setParticles] = useState<
    Array<{ id: number; left: number; delay: number; duration: number }>
  >([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${p.left}%`,
            top: "-10px",
            backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][
              p.id % 5
            ],
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

export function Step5Confirmation({ data }: StepProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  const restaurantName = getRestaurantName(data);
  const businessHours = getBusinessHours(data);
  const selectedAgentKeys = getSelectedAgentKeys(data);

  const { data: catalog } = trpc.agents.catalog.useQuery();

  const selectedAgents =
    catalog?.filter((agent) => selectedAgentKeys.includes(agent.agentKey)) || [];

  // Stop confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 relative">
      {/* Confetti animation */}
      {showConfetti && <Confetti />}

      {/* Success header */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          You&apos;re all set!
        </h2>
        <p className="text-slate-600 max-w-md mx-auto">
          Welcome to Restaurant AI! Your setup is complete. You&apos;re ready to
          start automating your restaurant operations.
        </p>
      </div>

      {/* Configuration Summary */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Restaurant info */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500">Restaurant</p>
              <p className="font-medium text-slate-900">{restaurantName}</p>
            </div>
          </div>

          <Separator />

          {/* Business hours */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500">Business Hours</p>
              {businessHours.length > 0 ? (
                <div className="mt-1">
                  <p className="font-medium text-slate-900 mb-2">
                    {summarizeBusinessHours(businessHours)}
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {businessHours.map((day) => (
                      <div
                        key={day.day}
                        className={`text-center py-1 px-1 rounded text-xs ${
                          day.isOpen
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                        title={formatHoursRange(day)}
                      >
                        {DAY_LABELS[day.day]}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Not configured</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Selected agents */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500">AI Agents</p>
              {selectedAgents.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedAgents.map((agent) => (
                    <Badge key={agent.id} variant="secondary">
                      {agent.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No agents selected</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Welcome message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
        <Sparkles className="h-8 w-8 text-blue-600 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 mb-2">
          Welcome to the future of restaurant management!
        </h3>
        <p className="text-sm text-slate-600">
          Your AI workforce is ready to help you handle reservations, engage
          customers, manage reviews, and grow your business. Explore the
          dashboard to see everything in action.
        </p>
      </div>

      {/* CTA Button */}
      <div className="flex justify-center pt-4">
        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-slate-500">
        Need help getting started?{" "}
        <a
          href="mailto:support@restaurantai.com"
          className="text-blue-600 hover:underline"
        >
          Contact our support team
        </a>
      </p>
    </div>
  );
}
