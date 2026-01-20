import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Users, Phone, MessageSquare } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Reservations() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: restaurants } = trpc.restaurants.list.useQuery();
  const restaurant = restaurants?.[0]?.restaurant;
  
  const { data: reservations = [], refetch } = trpc.reservations.list.useQuery(
    {
      restaurantId: restaurant?.id,
      limit: 100,
    },
    { enabled: !!restaurant }
  );

  const updateStatus = trpc.reservations.update.useMutation({
    onSuccess: () => refetch(),
  });

  const cancelReservation = trpc.reservations.cancel.useMutation({
    onSuccess: () => refetch(),
  });

  const filteredReservations = reservations.filter((item) =>
    statusFilter === "all" ? true : item.reservation.status === statusFilter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "no_show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reservations</h1>
            <p className="text-muted-foreground">
              Manage your restaurant reservations
            </p>
          </div>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            New Reservation
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reservations</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reservations List */}
        <div className="grid gap-4">
          {filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No reservations found
              </CardContent>
            </Card>
          ) : (
            filteredReservations.map((item) => {
              const reservation = item.reservation;
              const customer = item.customer;
              return (
              <Card key={reservation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {customer.name || 'Guest'} - Reservation #{reservation.id}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(
                            new Date(reservation.reservationDate),
                            "MMM dd, yyyy"
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(reservation.reservationDate), "HH:mm")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {reservation.partySize} guests
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                        reservation.status
                      )}`}
                    >
                      {reservation.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reservation.specialRequests && (
                      <div>
                        <p className="text-sm font-medium">Special Requests:</p>
                        <p className="text-sm text-muted-foreground">
                          {reservation.specialRequests}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {reservation.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus.mutate({
                                restaurantId: restaurant!.id,
                                reservationId: reservation.id,
                                status: "confirmed",
                              })
                            }
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              cancelReservation.mutate({
                                restaurantId: restaurant!.id,
                                reservationId: reservation.id,
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {reservation.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus.mutate({
                                restaurantId: restaurant!.id,
                                reservationId: reservation.id,
                                status: "completed",
                              })
                            }
                          >
                            Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                restaurantId: restaurant!.id,
                                reservationId: reservation.id,
                                status: "no_show",
                              })
                            }
                          >
                            No Show
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost">
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
