import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Conversations() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  
  const { data: restaurants } = trpc.restaurants.list.useQuery();
  const restaurant = restaurants?.[0]?.restaurant;
  
  const { data: conversations = [] } = trpc.conversations.list.useQuery(
    {
      restaurantId: restaurant?.id,
      limit: 50,
    },
    { enabled: !!restaurant }
  );

  const { data: conversationData, refetch: refetchMessages } = trpc.conversations.get.useQuery(
    {
      conversationId: selectedConversation!,
    },
    { enabled: !!restaurant && !!selectedConversation }
  );

  const messages = conversationData?.messages || [];

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !restaurant || !selectedConversation) return;
    
    sendMessage.mutate({
      restaurantId: restaurant.id,
      conversationId: selectedConversation,
      content: messageText,
      direction: "outbound",
    });
  };

  const selectedConv = conversations.find((c) => c.conversation.id === selectedConversation);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-4">
        {/* Conversations List */}
        <Card className="w-80 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Conversations</h2>
            <p className="text-sm text-muted-foreground">
              {conversations.length} active
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {conversations.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No conversations yet
                </p>
              ) : (
                conversations.map((item) => {
                  const conv = item.conversation;
                  const customer = item.customer;
                  return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversation === conv.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium truncate">
                        {customer.name || "Unknown"}
                      </p>
                      {conv.status === "active" && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm opacity-80 truncate">
                      Last message
                    </p>
                    <p className="text-xs opacity-60 mt-1">
                      {conv.lastMessageAt
                        ? format(new Date(conv.lastMessageAt), "MMM dd, HH:mm")
                        : ""}
                    </p>
                  </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b">
                <h2 className="font-semibold">
                  {conversations.find(i => i.conversation.id === selectedConversation)?.customer.name || "Unknown"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {conversations.find(i => i.conversation.id === selectedConversation)?.customer.phone || "No phone"}
                </p>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No messages yet
                    </p>
                  ) : (
                    messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.direction === "outbound" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground"
                              : msg.isFromAgent
                              ? "bg-purple-100 text-purple-800"
                              : "bg-accent"
                          }`}
                        >
                          {msg.direction === "outbound" ? (
                            <UserIcon className="h-4 w-4" />
                          ) : msg.isFromAgent ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <UserIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`flex-1 max-w-[70%] ${
                            msg.direction === "outbound" ? "text-right" : ""
                          }`}
                        >
                          <div
                            className={`inline-block p-3 rounded-lg ${
                              msg.direction === "outbound"
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(msg.createdAt), "HH:mm")}
                            {msg.isFromAgent && (
                              <span className="ml-2 text-purple-600">
                                • AI Agent
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessage.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
