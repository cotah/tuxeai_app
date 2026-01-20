/**
 * AI Agent Framework
 * Base classes and utilities for implementing AI agents
 */

import { invokeLLM } from "../_core/llm";
import * as db from "../db";

export interface AgentContext {
  restaurantId: number;
  agentKey: string;
  configuration: Record<string, any>;
}

export interface AgentEvent {
  id: number;
  eventType: string;
  payload: Record<string, any>;
  createdAt: Date;
}

export interface AgentResponse {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Base Agent class that all agents extend
 */
export abstract class BaseAgent {
  protected context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Process an event - must be implemented by each agent
   */
  abstract processEvent(event: AgentEvent): Promise<AgentResponse>;

  /**
   * Get agent configuration
   */
  protected getConfig<T = any>(key: string, defaultValue?: T): T {
    return this.context.configuration[key] ?? defaultValue;
  }

  /**
   * Call LLM with restaurant context
   */
  protected async callLLM(messages: Array<{ role: string; content: string }>) {
    const restaurant = await db.getRestaurantById(this.context.restaurantId);
    
    // Add restaurant context to system message
    const systemContext = `
You are an AI assistant for ${restaurant?.name || "a restaurant"}.

Restaurant Information:
- Name: ${restaurant?.name}
- Address: ${restaurant?.address || "Not provided"}
- Phone: ${restaurant?.phone || "Not provided"}
- Business Hours: ${JSON.stringify(restaurant?.businessHours || {})}
- Description: ${restaurant?.description || "Not provided"}
- Menu URL: ${restaurant?.menuUrl || "Not provided"}
- Website: ${restaurant?.websiteUrl || "Not provided"}

Always respond in a professional, friendly manner representing the restaurant.
`;

    const enhancedMessages = [
      { role: "system", content: systemContext },
      ...messages,
    ];

    return await invokeLLM({ messages: enhancedMessages as any });
  }

  /**
   * Log agent activity
   */
  protected async logActivity(message: string, data?: Record<string, any>) {
    console.log(`[${this.context.agentKey}] ${message}`, data || "");
    
    // Record metric
    await db.recordMetric({
      restaurantId: this.context.restaurantId,
      agentKey: this.context.agentKey,
      metricType: "agent_activity",
      metricValue: "1",
      dimensions: {
        message,
        ...data,
      },
    });
  }

  /**
   * Send WhatsApp message
   */
  protected async sendWhatsAppMessage(
    customerId: number,
    content: string
  ): Promise<boolean> {
    try {
      const customer = await db.getCustomerById(customerId);
      if (!customer?.phone) {
        throw new Error("Customer phone not found");
      }

      // Get or create conversation
      const conversation = await db.getOrCreateConversation(
        this.context.restaurantId,
        customerId,
        "whatsapp"
      );

      if (!conversation) {
        throw new Error("Failed to get conversation");
      }

      // Create message record
      await db.createMessage({
        conversationId: conversation.id,
        direction: "outbound",
        content,
        messageType: "text",
        agentKey: this.context.agentKey,
      });

      // TODO: Actually send via WhatsApp API
      // const restaurant = await db.getRestaurantById(this.context.restaurantId);
      // await sendWhatsAppAPI(restaurant.whatsappAccessToken, customer.phone, content);

      await this.logActivity("WhatsApp message sent", {
        customerId,
        conversationId: conversation.id,
      });

      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      return false;
    }
  }
}

/**
 * Agent Registry - maps agent keys to agent classes
 */
export class AgentRegistry {
  private static agents = new Map<string, typeof BaseAgent>();

  static register(agentKey: string, agentClass: typeof BaseAgent) {
    this.agents.set(agentKey, agentClass);
  }

  static get(agentKey: string): typeof BaseAgent | undefined {
    return this.agents.get(agentKey);
  }

  static async createAgent(
    restaurantId: number,
    agentKey: string
  ): Promise<BaseAgent | null> {
    const AgentClass = this.get(agentKey);
    if (!AgentClass) {
      console.error(`Agent not found: ${agentKey}`);
      return null;
    }

    // Get agent configuration
    const agentConfig = await db.getRestaurantAgent(restaurantId, agentKey);
    if (!agentConfig || !agentConfig.isEnabled) {
      console.error(`Agent not enabled: ${agentKey}`);
      return null;
    }

    const context: AgentContext = {
      restaurantId,
      agentKey,
      configuration: agentConfig.configuration || {},
    };

    return new (AgentClass as any)(context);
  }
}

/**
 * Event Processor - processes events from the queue
 */
export class EventProcessor {
  static async processNextEvent(): Promise<boolean> {
    const events = await db.getPendingEvents(1);
    if (events.length === 0) {
      return false;
    }

    const event = events[0];

    try {
      // Mark as processing
      await db.updateEvent(event.id, { status: "processing" });

      // Create agent instance
      const agent = await AgentRegistry.createAgent(
        event.restaurantId,
        event.agentKey || "unknown"
      );

      if (!agent) {
        throw new Error(`Failed to create agent: ${event.agentKey}`);
      }

      // Process event
      const response = await agent.processEvent({
        id: event.id,
        eventType: event.eventType,
        payload: event.payload as Record<string, any>,
        createdAt: event.createdAt,
      });

      if (response.success) {
        await db.updateEvent(event.id, {
          status: "completed",
          processedAt: new Date(),
        });
      } else {
        throw new Error(response.error || "Agent processing failed");
      }

      return true;
    } catch (error: any) {
      console.error(`Event processing failed:`, error);
      await db.updateEvent(event.id, {
        status: "failed",
        error: error.message,
        processedAt: new Date(),
      });
      return false;
    }
  }

  /**
   * Start processing events in a loop
   */
  static async startProcessing(intervalMs: number = 5000) {
    console.log("[EventProcessor] Starting event processing loop...");

    const processLoop = async () => {
      try {
        const processed = await this.processNextEvent();
        if (processed) {
          // Process next immediately if there was an event
          setImmediate(processLoop);
        } else {
          // Wait before checking again
          setTimeout(processLoop, intervalMs);
        }
      } catch (error) {
        console.error("[EventProcessor] Error in processing loop:", error);
        setTimeout(processLoop, intervalMs);
      }
    };

    processLoop();
  }
}
