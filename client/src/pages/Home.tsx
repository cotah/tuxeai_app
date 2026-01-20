import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  CalendarCheck,
  MessageSquare,
  Star,
  Users,
  ArrowRight,
  Check,
  Zap,
  Globe,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: restaurants } = trpc.restaurants.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // If authenticated and has restaurants, redirect to dashboard
  if (isAuthenticated && restaurants && restaurants.length > 0) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">Restaurant AI Workforce</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="ghost">Sign In</Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button>Get Started</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            The Digital Workforce for Modern Restaurants
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Automate Your Restaurant
            <br />
            <span className="text-blue-600">With AI Employees</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Modular AI agents that handle reservations, customer support, reviews, and re-engagement.
            Pay only for what you need. Start from €49/month.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <a href={getLoginUrl()}>
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/agents">
              <Button size="lg" variant="outline">
                View AI Agents
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* AI Agents Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Your Digital Employees</h2>
          <p className="text-lg text-slate-600">
            Each agent is an independent AI worker. Subscribe to the ones you need.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Reservation Agent</h3>
            <p className="text-sm text-slate-600 mb-4">
              Handles bookings 24/7 via WhatsApp and web. Sends confirmations and reminders automatically.
            </p>
            <div className="text-sm font-semibold text-blue-600">From €79/month</div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Support Agent</h3>
            <p className="text-sm text-slate-600 mb-4">
              Answers customer questions about menu, hours, and location. Available 24/7.
            </p>
            <div className="text-sm font-semibold text-green-600">From €69/month</div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Reviews Agent</h3>
            <p className="text-sm text-slate-600 mb-4">
              Monitors Google and TripAdvisor. Generates responses and alerts you to negative feedback.
            </p>
            <div className="text-sm font-semibold text-yellow-600">From €129/month</div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Re-engagement Agent</h3>
            <p className="text-sm text-slate-600 mb-4">
              Identifies inactive customers and sends personalized promotions to bring them back.
            </p>
            <div className="text-sm font-semibold text-purple-600">From €149/month</div>
          </Card>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Restaurant Owners Choose Us</h2>
            <p className="text-lg text-slate-600">
              Built specifically for restaurants in Europe and Latin America
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Modular & Affordable</h3>
              <p className="text-slate-600">
                Unlike competitors charging $400-600/month for everything, you only pay for the agents you need.
                Start from €49/month.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">WhatsApp First</h3>
              <p className="text-slate-600">
                Built for WhatsApp, the #1 communication channel in Europe and Latin America. Not just phone calls.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Complete Automation</h3>
              <p className="text-slate-600">
                Beyond reservations. We automate your entire customer lifecycle: support, reputation, and re-engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">Ready to Automate Your Restaurant?</h2>
          <p className="text-xl text-slate-600">
            Join restaurants already saving 100+ hours per month with AI employees.
          </p>
          <div className="pt-4">
            <a href={getLoginUrl()}>
              <Button size="lg" className="gap-2">
                Start Your Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
          <p className="text-sm text-slate-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12">
        <div className="container mx-auto px-4 text-center text-slate-600">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bot className="h-6 w-6 text-blue-600" />
            <span className="font-semibold">Restaurant AI Workforce</span>
          </div>
          <p className="text-sm">
            The Digital Workforce Platform for Restaurants Worldwide
          </p>
          <p className="text-xs mt-4 text-slate-500">
            © 2026 Restaurant AI Workforce. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
