import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, UserPlus, Phone, Mail, MessageSquare, Calendar } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Customers() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: restaurants } = trpc.restaurants.list.useQuery();
  const restaurant = restaurants?.[0]?.restaurant;
  
  const { data: customers = [] } = trpc.customers.list.useQuery(
    {
      restaurantId: restaurant?.id,
      limit: 100,
    },
    { enabled: !!restaurant }
  );

  const filteredCustomers = customers.filter((customer) =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActivityColor = (lastActivity: Date | null) => {
    if (!lastActivity) return "bg-gray-100 text-gray-800";
    
    const daysSince = Math.floor(
      (new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSince <= 7) return "bg-green-100 text-green-800";
    if (daysSince <= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getActivityLabel = (lastActivity: Date | null) => {
    if (!lastActivity) return "Never";
    
    const daysSince = Math.floor(
      (new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSince === 0) return "Today";
    if (daysSince === 1) return "Yesterday";
    if (daysSince <= 7) return `${daysSince} days ago`;
    if (daysSince <= 30) return `${Math.floor(daysSince / 7)} weeks ago`;
    return `${Math.floor(daysSince / 30)} months ago`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">
              Manage your customer relationships
            </p>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center text-muted-foreground">
                {searchQuery ? "No customers found" : "No customers yet"}
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {customer.name || "Unknown"}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(customer.tags) && customer.tags.length > 0 && (
                          customer.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <Badge
                      className={`${getActivityColor(customer.lastInteractionAt)} text-xs`}
                    >
                      {getActivityLabel(customer.lastInteractionAt)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {customer.email}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-sm">
                      <div>
                        <p className="text-muted-foreground">Reservations</p>
                        <p className="font-semibold">
                          {(customer.metadata as any)?.totalReservations || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lifetime Value</p>
                        <p className="font-semibold">
                          €{(customer.metadata as any)?.lifetimeValue || 0}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Calendar className="mr-2 h-4 w-4" />
                        Book
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
