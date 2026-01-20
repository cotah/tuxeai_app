/**
 * Customer Re-engagement Agent
 * Identifies inactive customers and sends targeted campaigns
 */

import { AgentResponse, BaseAgent, AgentEvent, AgentRegistry } from "./framework";
import * as db from "../db";

export class ReengagementAgent extends BaseAgent {
  async processEvent(event: AgentEvent): Promise<AgentResponse> {
    try {
      switch (event.eventType) {
        case "campaign.launched":
          return await this.executeCampaign(event);
        
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
   * Execute a re-engagement campaign
   */
  private async executeCampaign(event: AgentEvent): Promise<AgentResponse> {
    const { campaignId } = event.payload;
    
    const campaigns = await db.getRestaurantCampaigns(this.context.restaurantId);
    const campaign = campaigns.find((c) => c.id === campaignId);

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    // Get target audience
    const targetCustomers = await this.getTargetAudience(campaign.targetAudience || {});

    if (targetCustomers.length === 0) {
      await db.updateCampaign(campaignId, {
        status: "completed",
        completedAt: new Date(),
        stats: {
          targeted: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          replied: 0,
        },
      } as any);

      return {
        success: true,
        message: "No customers match campaign criteria",
      };
    }

    // Send messages to each customer
    let sentCount = 0;
    for (const customer of targetCustomers) {
      const personalizedMessage = await this.personalizeMessage(
        campaign.messageTemplate,
        customer
      );

      const sent = await this.sendWhatsAppMessage(customer.id, personalizedMessage);
      if (sent) {
        sentCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Update campaign stats
    await db.updateCampaign(campaignId, {
      status: "completed",
      completedAt: new Date(),
      stats: {
        targeted: targetCustomers.length,
        sent: sentCount,
        delivered: 0, // Will be updated by webhooks
        read: 0,
        replied: 0,
      },
    } as any);

    await this.logActivity("Campaign executed", {
      campaignId,
      targeted: targetCustomers.length,
      sent: sentCount,
    });

    return {
      success: true,
      message: `Campaign sent to ${sentCount}/${targetCustomers.length} customers`,
      data: {
        targeted: targetCustomers.length,
        sent: sentCount,
      },
    };
  }

  /**
   * Get target audience based on campaign criteria
   */
  private async getTargetAudience(criteria: {
    inactiveDays?: number;
    tags?: string[];
    minReservations?: number;
  }): Promise<any[]> {
    const { inactiveDays = 30, tags = [], minReservations = 0 } = criteria;

    // Get inactive customers
    const inactiveCustomers = await db.getInactiveCustomers(
      this.context.restaurantId,
      inactiveDays
    );

    // Filter by additional criteria
    return inactiveCustomers.filter((customer) => {
      // Check tags
      if (tags.length > 0) {
        const customerTags = (customer.tags as any[]) || [];
        const hasMatchingTag = tags.some((tag) => customerTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Check minimum reservations
      if (customer.totalReservations < minReservations) {
        return false;
      }

      return true;
    });
  }

  /**
   * Personalize message template with customer data
   */
  private async personalizeMessage(template: string, customer: any): Promise<string> {
    const restaurant = await db.getRestaurantById(this.context.restaurantId);

    // Replace placeholders
    let message = template
      .replace(/\{name\}/g, customer.name || "there")
      .replace(/\{restaurant\}/g, restaurant?.name || "our restaurant")
      .replace(/\{firstName\}/g, customer.name?.split(" ")[0] || "there");

    // Use LLM to enhance personalization if enabled
    const useLLM = this.getConfig("useLLMPersonalization", false);
    if (useLLM) {
      message = await this.enhanceWithLLM(message, customer);
    }

    return message;
  }

  /**
   * Enhance message with LLM for better personalization
   */
  private async enhanceWithLLM(message: string, customer: any): Promise<string> {
    try {
      const response = await this.callLLM([
        {
          role: "system",
          content: `You are helping personalize a re-engagement message for a customer who hasn't visited in a while.

Guidelines:
- Keep the core message and offer intact
- Make it feel personal and genuine
- Reference their past visits if relevant
- Keep the same length and tone
- Don't add information not in the original message`,
        },
        {
          role: "user",
          content: `Original message: "${message}"

Customer info:
- Name: ${customer.name}
- Total past reservations: ${customer.totalReservations}
- Last interaction: ${customer.lastInteractionAt ? new Date(customer.lastInteractionAt).toLocaleDateString() : "Unknown"}

Personalize this message:`,
        },
      ] as any);

      const content = response.choices[0]?.message?.content;
      return typeof content === 'string' ? content : message;
    } catch (error) {
      console.error("Failed to enhance message with LLM:", error);
      return message;
    }
  }
}

// Register agent
AgentRegistry.register("reengagement", ReengagementAgent);
