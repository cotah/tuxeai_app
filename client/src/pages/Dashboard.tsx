import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: restaurants } = trpc.restaurants.list.useQuery();
  const restaurant = restaurants?.[0]?.restaurant;
  const { data: agents } = trpc.restaurantAgents.listMy.useQuery();
  const { data: stats } = trpc.analytics.getOverview.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {restaurant?.name || user?.name}! 👋
          </h1>
          <p className="text-slate-600 mt-1">
            Here's what's happening with your AI workforce today
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Agents"
            value={agents?.filter((a) => a.isEnabled).length || 0}
            icon={<Zap className="h-5 w-5" />}
            trend="+2 this month"
            color="blue"
          />
          <StatCard
            title="Reservations"
            value={stats?.totalReservations || 0}
            icon={<Calendar className="h-5 w-5" />}
            trend="+12% vs last month"
            color="green"
          />
          <StatCard
            title="Messages"
            value={stats?.totalMessages || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            trend="+8% vs last month"
            color="purple"
          />
          <StatCard
            title="Avg Rating"
            value={stats?.averageRating?.toFixed(1) || "N/A"}
            icon={<Star className="h-5 w-5" />}
            trend="4.8/5.0"
            color="yellow"
          />
        </div>

        {/* Active Agents */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Your AI Agents</h2>
            <Link href="/agents">
              <a className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Manage Agents →
              </a>
            </Link>
          </div>

          {agents && agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No agents activated yet
              </h3>
              <p className="text-slate-600 mb-4">
                Start by activating AI agents to automate your restaurant operations
              </p>
              <Link href="/marketplace">
                <a className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Browse Agent Marketplace
                </a>
              </Link>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Recent Reservations
            </h2>
            <RecentReservations />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Recent Messages
            </h2>
            <RecentMessages />
          </Card>
        </div>

        {/* Performance Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Performance Overview
          </h2>
          <div className="h-64 flex items-center justify-center text-slate-400">
            <TrendingUp className="h-8 w-8 mr-2" />
            <span>Chart coming soon...</span>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  color: "blue" | "green" | "purple" | "yellow";
}

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-sm text-slate-600 mb-2">{title}</p>
      <p className="text-xs text-green-600 font-medium">{trend}</p>
    </Card>
  );
}

function AgentCard({ agent }: { agent: any }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-slate-900">{agent.agentKey}</h3>
        <div
          className={`h-2 w-2 rounded-full ${agent.isEnabled ? "bg-green-500" : "bg-slate-300"}`}
        />
      </div>
      <p className="text-xs text-slate-600">
        {agent.isEnabled ? "Active" : "Inactive"}
      </p>
    </div>
  );
}

function RecentReservations() {
  return (
    <div className="space-y-3">
      <div className="text-center py-8 text-slate-400">
        <Calendar className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">No recent reservations</p>
      </div>
    </div>
  );
}

function RecentMessages() {
  return (
    <div className="space-y-3">
      <div className="text-center py-8 text-slate-400">
        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">No recent messages</p>
      </div>
    </div>
  );
}
