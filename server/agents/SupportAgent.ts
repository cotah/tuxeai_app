/**
 * Customer Support Agent
 * 24/7 AI-powered customer support for FAQs
 */

import { AgentResponse, BaseAgent, AgentEvent, AgentRegistry } from "./framework";
import * as db from "../db";

export class SupportAgent extends BaseAgent {
  async processEvent(event: AgentEvent): Promise<AgentResponse> {
    try {
      switch (event.eventType) {
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
   * Handle incoming customer message
   */
  private async handleIncomingMessage(event: AgentEvent): Promise<AgentResponse> {
    const { conversationId } = event.payload;
    
    // Get conversation history
    const messages = await db.getConversationMessages(conversationId, 20);
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.direction !== "inbound") {
      return { success: false, error: "No inbound message found" };
    }

    // Build conversation context for LLM
    const conversationHistory = messages
      .slice(-10) // Last 10 messages
      .map((msg) => ({
        role: msg.direction === "inbound" ? "user" : "assistant",
        content: msg.content,
      }));

    // Generate response using LLM
    const response = await this.generateSupportResponse(conversationHistory);

    // Send response
    const conversation = await db.getConversationById(conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const sent = await this.sendWhatsAppMessage(conversation.customerId, response);

    if (sent) {
      await this.logActivity("Support response sent", {
        conversationId,
        messageLength: response.length,
      });

      return {
        success: true,
        message: "Support response sent successfully",
      };
    }

    return {
      success: false,
      error: "Failed to send support response",
    };
  }

  /**
   * Generate support response using LLM
   */
  private async generateSupportResponse(
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      const response = await this.callLLM([
        {
          role: "system",
          content: `You are a helpful customer support assistant for the restaurant. 

Your responsibilities:
- Answer questions about menu, business hours, location, and general information
- Be friendly, professional, and concise
- If you don't know something, politely say so and offer to have staff contact them
- Keep responses under 200 words
- Use emojis sparingly and appropriately
- Always end with an offer to help further

DO NOT:
- Make up information you don't have
- Promise things you can't deliver
- Handle reservations (that's handled by another agent)`,
        },
        ...conversationHistory,
      ] as any);

      const content = response.choices[0]?.message?.content;
      const contentStr = typeof content === 'string' ? content : 'I apologize, but I am having trouble processing your request. Please try again or contact us directly.';
      
      return contentStr;
    } catch (error) {
      console.error("Failed to generate support response:", error);
      return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or feel free to call us directly.";
    }
  }
}

// Register agent
AgentRegistry.register("support", SupportAgent);
