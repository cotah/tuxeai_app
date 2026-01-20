/**
 * Reviews & Reputation Agent
 * Monitors reviews and generates responses
 */

import { AgentResponse, BaseAgent, AgentEvent, AgentRegistry } from "./framework";
import * as db from "../db";

export class ReviewsAgent extends BaseAgent {
  async processEvent(event: AgentEvent): Promise<AgentResponse> {
    try {
      switch (event.eventType) {
        case "review.detected":
          return await this.handleNewReview(event);
        
        case "review.generate_response":
          return await this.generateReviewResponse(event);
        
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
   * Handle new review detected
   */
  private async handleNewReview(event: AgentEvent): Promise<AgentResponse> {
    const { reviewId } = event.payload;
    
    const review = await db.getReviewById(reviewId);
    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(review.reviewText || "", review.rating);

    // Update review with sentiment
    await db.updateReview(reviewId, { sentiment } as any);

    // If negative, create alert event
    if (sentiment === "negative") {
      await this.logActivity("Negative review detected", {
        reviewId,
        rating: review.rating,
        platform: review.platform,
      });

      // TODO: Send notification to owner
    }

    // Auto-generate response if enabled
    const autoRespond = this.getConfig("autoRespond", false);
    if (autoRespond) {
      await db.createEvent({
        restaurantId: this.context.restaurantId,
        eventType: "review.generate_response",
        agentKey: "reviews",
        payload: { reviewId },
        status: "pending",
      });
    }

    return {
      success: true,
      message: "Review processed successfully",
      data: { sentiment },
    };
  }

  /**
   * Generate response for a review
   */
  private async generateReviewResponse(event: AgentEvent): Promise<AgentResponse> {
    const { reviewId } = event.payload;
    
    const review = await db.getReviewById(reviewId);
    if (!review) {
      return { success: false, error: "Review not found" };
    }

    if (review.responseText) {
      return { success: false, error: "Review already has a response" };
    }

    // Generate response using LLM
    const responseText = await this.generateResponse(review);

    // Save generated response
    await db.updateReview(reviewId, {
      responseText,
      responseGeneratedBy: "ai",
    } as any);

    await this.logActivity("Review response generated", {
      reviewId,
      platform: review.platform,
    });

    // TODO: Actually post response to review platform

    return {
      success: true,
      message: "Review response generated",
      data: { responseText },
    };
  }

  /**
   * Analyze review sentiment
   */
  private async analyzeSentiment(
    reviewText: string,
    rating: number
  ): Promise<"positive" | "neutral" | "negative"> {
    // Simple heuristic based on rating
    if (rating >= 4) return "positive";
    if (rating >= 3) return "neutral";
    return "negative";

    // TODO: Use LLM for more sophisticated sentiment analysis
  }

  /**
   * Generate response to review using LLM
   */
  private async generateResponse(review: any): Promise<string> {
    try {
      const restaurant = await db.getRestaurantById(this.context.restaurantId);
      
      const response = await this.callLLM([
        {
          role: "system",
          content: `You are writing a professional response to a customer review for ${restaurant?.name}.

Guidelines:
- Be genuine, warm, and professional
- Thank the reviewer for their feedback
- Address specific points they mentioned
- For positive reviews: express gratitude and invite them back
- For negative reviews: apologize sincerely, acknowledge the issue, and offer to make it right
- Keep it under 150 words
- Don't make promises you can't keep
- Sign off with the restaurant name`,
        },
        {
          role: "user",
          content: `Review Platform: ${review.platform}
Rating: ${review.rating}/5 stars
Review: "${review.reviewText}"
Reviewer: ${review.authorName}

Generate a professional response:`,
        },
      ] as any);

      const content = response.choices[0]?.message?.content;
      const contentStr = typeof content === 'string' ? content : 'Thank you for your feedback. We appreciate you taking the time to share your experience with us.';
      
      return contentStr;
    } catch (error) {
      console.error("Failed to generate review response:", error);
      return "Thank you for your feedback. We appreciate you taking the time to share your experience with us.";
    }
  }
}

// Register agent
AgentRegistry.register("reviews", ReviewsAgent);
