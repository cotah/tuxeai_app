/**
 * Reservation & Confirmation Agent
 * Handles booking requests, confirmations, and reminders
 */

import { AgentResponse, BaseAgent, AgentEvent, AgentRegistry } from "./framework";
import * as db from "../db";

export class ReservationAgent extends BaseAgent {
  async processEvent(event: AgentEvent): Promise<AgentResponse> {
    try {
      switch (event.eventType) {
        case "reservation.created":
          return await this.handleReservationCreated(event);
        
        case "reservation.reminder":
          return await this.sendReminder(event);
        
        case "message.received":
          return await this.handleIncomingMessage(event);
        
        default:
          return {
            success: false,
            error: `Unknown event type: ${event.eventType}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle new reservation created
   */
  private async handleReservationCreated(event: AgentEvent): Promise<AgentResponse> {
    const { reservationId } = event.payload;
    
    const reservation = await db.getReservationById(reservationId);
    if (!reservation) {
      return { success: false, error: "Reservation not found" };
    }

    const customer = await db.getCustomerById(reservation.customerId);
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Generate confirmation message
    const confirmationMessage = await this.generateConfirmationMessage(reservation, customer);

    // Send confirmation
    const sent = await this.sendWhatsAppMessage(customer.id, confirmationMessage);

    if (sent) {
      // Update reservation
      await db.updateReservation(reservationId, {
        status: "confirmed",
        confirmationSentAt: new Date(),
      } as any);

      await this.logActivity("Reservation confirmed", { reservationId });

      return {
        success: true,
        message: "Confirmation sent successfully",
      };
    }

    return {
      success: false,
      error: "Failed to send confirmation",
    };
  }

  /**
   * Send reservation reminder
   */
  private async sendReminder(event: AgentEvent): Promise<AgentResponse> {
    const { reservationId } = event.payload;
    
    const reservation = await db.getReservationById(reservationId);
    if (!reservation || reservation.status !== "confirmed") {
      return { success: false, error: "Reservation not valid for reminder" };
    }

    const customer = await db.getCustomerById(reservation.customerId);
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const reminderMessage = await this.generateReminderMessage(reservation, customer);
    const sent = await this.sendWhatsAppMessage(customer.id, reminderMessage);

    if (sent) {
      await db.updateReservation(reservationId, {
        reminderSentAt: new Date(),
      } as any);

      await this.logActivity("Reminder sent", { reservationId });

      return {
        success: true,
        message: "Reminder sent successfully",
      };
    }

    return {
      success: false,
      error: "Failed to send reminder",
    };
  }

  /**
   * Handle incoming message (potential reservation request)
   */
  private async handleIncomingMessage(event: AgentEvent): Promise<AgentResponse> {
    const { messageId, conversationId } = event.payload;
    
    const messages = await db.getConversationMessages(conversationId, 10);
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.direction !== "inbound") {
      return { success: false, error: "No inbound message found" };
    }

    // Use LLM to parse reservation intent
    const intent = await this.parseReservationIntent(lastMessage.content);

    if (intent.isReservation) {
      // Create reservation
      const conversation = await db.getConversationById(conversationId);
      if (!conversation) {
        return { success: false, error: "Conversation not found" };
      }

      const reservationId = await db.createReservation({
        restaurantId: this.context.restaurantId,
        customerId: conversation.customerId,
        reservationDate: intent.date || new Date(),
        partySize: intent.partySize || 2,
        specialRequests: intent.specialRequests,
        source: "whatsapp",
        status: "pending",
      });

      // Trigger confirmation
      await db.createEvent({
        restaurantId: this.context.restaurantId,
        eventType: "reservation.created",
        agentKey: "reservation",
        payload: { reservationId },
        status: "pending",
      });

      await this.logActivity("Reservation created from message", {
        reservationId,
        conversationId,
      });

      return {
        success: true,
        message: "Reservation created and confirmation triggered",
        data: { reservationId },
      };
    }

    // Not a reservation - let support agent handle it
    return {
      success: true,
      message: "Not a reservation request",
    };
  }

  /**
   * Parse reservation intent from message using LLM
   */
  private async parseReservationIntent(message: string): Promise<{
    isReservation: boolean;
    date?: Date;
    partySize?: number;
    specialRequests?: string;
  }> {
    try {
      const response = await this.callLLM([
        {
          role: "user",
          content: `Analyze this message and determine if it's a reservation request. Extract date, time, party size, and special requests.

Message: "${message}"

Respond in JSON format:
{
  "isReservation": true/false,
  "date": "ISO date string if found",
  "partySize": number if found,
  "specialRequests": "any special requests mentioned"
}`,
        },
      ]);

      const content = response.choices[0]?.message?.content;
      const contentStr = typeof content === 'string' ? content : '{}';
      const parsed = JSON.parse(contentStr);

      return {
        isReservation: parsed.isReservation || false,
        date: parsed.date ? new Date(parsed.date) : undefined,
        partySize: parsed.partySize,
        specialRequests: parsed.specialRequests,
      };
    } catch (error) {
      console.error("Failed to parse reservation intent:", error);
      return { isReservation: false };
    }
  }

  /**
   * Generate confirmation message
   */
  private async generateConfirmationMessage(
    reservation: any,
    customer: any
  ): Promise<string> {
    const restaurant = await db.getRestaurantById(this.context.restaurantId);
    const date = new Date(reservation.reservationDate);

    return `✅ Reservation Confirmed!

Hi ${customer.name || "there"}!

Your reservation at ${restaurant?.name} is confirmed:

📅 Date: ${date.toLocaleDateString()}
🕐 Time: ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
👥 Party Size: ${reservation.partySize} people
${reservation.specialRequests ? `📝 Special Requests: ${reservation.specialRequests}` : ""}

We look forward to seeing you! If you need to make changes, please reply to this message.

${restaurant?.address ? `📍 ${restaurant.address}` : ""}
${restaurant?.phone ? `📞 ${restaurant.phone}` : ""}`;
  }

  /**
   * Generate reminder message
   */
  private async generateReminderMessage(
    reservation: any,
    customer: any
  ): Promise<string> {
    const restaurant = await db.getRestaurantById(this.context.restaurantId);
    const date = new Date(reservation.reservationDate);

    return `🔔 Reservation Reminder

Hi ${customer.name || "there"}!

This is a friendly reminder about your reservation at ${restaurant?.name}:

📅 Tomorrow: ${date.toLocaleDateString()}
🕐 Time: ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
👥 Party Size: ${reservation.partySize} people

We're excited to see you! If you need to cancel or make changes, please let us know as soon as possible.

${restaurant?.address ? `📍 ${restaurant.address}` : ""}`;
  }
}

// Register agent
AgentRegistry.register("reservation", ReservationAgent);
