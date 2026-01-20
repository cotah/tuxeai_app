import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { getTenantContext, verifyAgentAccess, verifyBillingAccess, verifyOwnerAccess, verifyRestaurantAccess } from "./tenant";

// ============================================================================
// TENANT-AWARE PROCEDURE
// ============================================================================

/**
 * Procedure that requires authentication and tenant context
 * Automatically injects restaurantId and tenant info into context
 */
const tenantProcedure = protectedProcedure
  .input(z.object({ restaurantId: z.number().optional() }))
  .use(async ({ ctx, input, next }) => {
    const tenantContext = await getTenantContext(ctx.user.id, input.restaurantId);
    
    return next({
      ctx: {
        ...ctx,
        tenant: tenantContext,
      },
    });
  });

/**
 * Procedure that requires owner role
 */
const ownerProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.tenant.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only restaurant owners can perform this action",
    });
  }
  return next({ ctx });
});

// ============================================================================
// APP ROUTER
// ============================================================================

export const appRouter = router({
  system: systemRouter,
  
  // ============================================================================
  // AUTH
  // ============================================================================
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================================
  // RESTAURANTS
  // ============================================================================
  
  restaurants: router({
    // Get user's restaurants
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRestaurantsByUserId(ctx.user.id);
    }),

    // Get single restaurant
    get: tenantProcedure.query(async ({ ctx }) => {
      return await db.getRestaurantById(ctx.tenant.restaurantId);
    }),

    // Create new restaurant (onboarding)
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          timezone: z.string().default("UTC"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Create restaurant
        const restaurantId = await db.createRestaurant({
          ...input,
          ownerId: ctx.user.id,
        });

        // Add user as owner
        await db.addStaffMember({
          restaurantId,
          userId: ctx.user.id,
          role: "owner",
          permissions: {
            agents: [],
            canManageBilling: true,
            canManageStaff: true,
            canViewAnalytics: true,
          },
        });

        return { restaurantId, success: true };
      }),

    // Update restaurant settings
    update: ownerProcedure
      .input(
        z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          timezone: z.string().optional(),
          businessHours: z.record(z.string(), z.object({
            open: z.string(),
            close: z.string(),
            closed: z.boolean().optional(),
          })).optional(),
          menuUrl: z.string().url().optional(),
          websiteUrl: z.string().url().optional(),
          description: z.string().optional(),
          settings: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { restaurantId, ...updateData } = input;
        await db.updateRestaurant(ctx.tenant.restaurantId, updateData as any);
        return { success: true };
      }),
  }),

  // ============================================================================
  // STAFF MANAGEMENT
  // ============================================================================
  
  staff: router({
    // List all staff members
    list: tenantProcedure.query(async ({ ctx }) => {
      return await db.getRestaurantStaff(ctx.tenant.restaurantId);
    }),

    // Invite staff member (owner only)
    invite: ownerProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["manager", "staff"]),
          permissions: z.object({
            agents: z.array(z.string()).optional(),
            canManageBilling: z.boolean().optional(),
            canManageStaff: z.boolean().optional(),
            canViewAnalytics: z.boolean().optional(),
          }).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const staffId = await db.addStaffMember({
          restaurantId: ctx.tenant.restaurantId,
          userId: input.userId,
          role: input.role,
          permissions: input.permissions || {},
        });
        return { staffId, success: true };
      }),

    // Update staff role/permissions (owner only)
    update: ownerProcedure
      .input(
        z.object({
          staffId: z.number(),
          role: z.enum(["manager", "staff"]).optional(),
          permissions: z.object({
            agents: z.array(z.string()).optional(),
            canManageBilling: z.boolean().optional(),
            canManageStaff: z.boolean().optional(),
            canViewAnalytics: z.boolean().optional(),
          }).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updateData: any = {};
        if (input.role) updateData.role = input.role;
        if (input.permissions) updateData.permissions = input.permissions;
        await db.updateStaffMember(input.staffId, updateData as any);
        return { success: true };
      }),

    // Remove staff member (owner only)
    remove: ownerProcedure
      .input(z.object({ staffId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeStaffMember(input.staffId);
        return { success: true };
      }),
  }),

  // ============================================================================
  // AGENT MARKETPLACE
  // ============================================================================
  
  agents: router({
    // Get agent catalog
    catalog: publicProcedure.query(async () => {
      return await db.getAgentCatalog();
    }),

    // Get restaurant's subscribed agents
    subscribed: tenantProcedure.query(async ({ ctx }) => {
      const agents = await db.getRestaurantAgents(ctx.tenant.restaurantId);
      const catalog = await db.getAgentCatalog();
      
      // Merge catalog info with subscription info
      return agents.map((agent) => {
        const catalogEntry = catalog.find((c) => c.agentKey === agent.agentKey);
        return {
          ...agent,
          catalogInfo: catalogEntry,
        };
      });
    }),

    // Subscribe to an agent
    subscribe: ownerProcedure
      .input(
        z.object({
          agentKey: z.string(),
          configuration: z.record(z.string(), z.any()).optional()
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if already subscribed
        const existing = await db.getRestaurantAgent(ctx.tenant.restaurantId, input.agentKey);
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already subscribed to this agent",
          });
        }

        const agentId = await db.subscribeToAgent({
          restaurantId: ctx.tenant.restaurantId,
          agentKey: input.agentKey,
          isEnabled: true,
          configuration: input.configuration || {}
        });

        return { agentId, success: true };
      }),

    // Unsubscribe from an agent
    unsubscribe: ownerProcedure
      .input(z.object({ agentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unsubscribeFromAgent(input.agentId);
        return { success: true };
      }),

    // Enable/disable agent
    toggle: tenantProcedure
      .input(
        z.object({
          agentId: z.number(),
          enabled: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateRestaurantAgent(input.agentId, {
          isEnabled: input.enabled ? 1 : 0,
        } as any);
        return { success: true };
      }),

    // Get agent configuration
    getConfig: tenantProcedure
      .input(z.object({ agentKey: z.string() }))
      .query(async ({ ctx, input }) => {
        // Verify access
        const hasAccess = await verifyAgentAccess(ctx.user.id, ctx.tenant.restaurantId, input.agentKey);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No access to this agent",
          });
        }

        const agent = await db.getRestaurantAgent(ctx.tenant.restaurantId, input.agentKey);
        return agent?.configuration || {};
      }),

    // Update agent configuration
    updateConfig: tenantProcedure
      .input(
        z.object({
          agentKey: z.string(),
          configuration: z.record(z.string(), z.any())
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify access
        const hasAccess = await verifyAgentAccess(ctx.user.id, ctx.tenant.restaurantId, input.agentKey);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No access to this agent",
          });
        }

        const agent = await db.getRestaurantAgent(ctx.tenant.restaurantId, input.agentKey);
        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        await db.updateRestaurantAgent(agent.id, {
          configuration: input.configuration,
        } as any);

        return { success: true };
      }),
  }),

  // ============================================================================
  // CUSTOMERS
  // ============================================================================
  
  customers: router({
    // List customers
    list: tenantProcedure
      .input(
        z.object({
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        return await db.getRestaurantCustomers(ctx.tenant.restaurantId, input.limit, input.offset);
      }),

    // Get single customer
    get: tenantProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const customer = await db.getCustomerById(input.customerId);
        
        // Verify customer belongs to restaurant
        if (customer?.restaurantId !== ctx.tenant.restaurantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Customer not found",
          });
        }

        return customer;
      }),

    // Update customer
    update: tenantProcedure
      .input(
        z.object({
          customerId: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          tags: z.array(z.string()).optional(),
          metadata: z.record(z.string(), z.any()).optional()
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { customerId, ...updateData } = input;
        
        // Verify customer belongs to restaurant
        const customer = await db.getCustomerById(customerId);
        if (customer?.restaurantId !== ctx.tenant.restaurantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Customer not found",
          });
        }

        await db.updateCustomer(customerId, updateData as any);
        return { success: true };
      }),
  }),

  // ============================================================================
  // RESERVATIONS
  // ============================================================================
  
  reservations: router({
    // List reservations
    list: tenantProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().default(100),
        })
      )
      .query(async ({ ctx, input }) => {
        return await db.getRestaurantReservations(
          ctx.tenant.restaurantId,
          input.startDate,
          input.endDate,
          input.limit
        );
      }),

    // Create reservation
    create: tenantProcedure
      .input(
        z.object({
          customerId: z.number(),
          reservationDate: z.date(),
          partySize: z.number().min(1),
          specialRequests: z.string().optional(),
          source: z.enum(["whatsapp", "web", "phone", "manual"]).default("manual"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reservationId = await db.createReservation({
          restaurantId: ctx.tenant.restaurantId,
          ...input,
          status: "pending",
        });

        // Create event for agent processing
        await db.createEvent({
          restaurantId: ctx.tenant.restaurantId,
          eventType: "reservation.created",
          agentKey: "reservation",
          payload: { reservationId },
          status: "pending",
        });

        return { reservationId, success: true };
      }),

    // Update reservation
    update: tenantProcedure
      .input(
        z.object({
          reservationId: z.number(),
          status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]).optional(),
          specialRequests: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { reservationId, ...updateData } = input;
        
        // Verify reservation belongs to restaurant
        const reservation = await db.getReservationById(reservationId);
        if (reservation?.restaurantId !== ctx.tenant.restaurantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Reservation not found",
          });
        }

        await db.updateReservation(reservationId, updateData as any);
        return { success: true };
      }),

    // Cancel reservation
    cancel: tenantProcedure
      .input(z.object({ reservationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const reservation = await db.getReservationById(input.reservationId);
        if (reservation?.restaurantId !== ctx.tenant.restaurantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Reservation not found",
          });
        }

        await db.updateReservation(input.reservationId, { status: "cancelled" });
        return { success: true };
      }),
  }),

  // ============================================================================
  // CONVERSATIONS & MESSAGES
  // ============================================================================
  
  conversations: router({
    // List conversations
    list: tenantProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return await db.getRestaurantConversations(ctx.tenant.restaurantId, input.limit);
      }),

    // Get conversation with messages
    get: tenantProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversation = await db.getConversationById(input.conversationId);
        
        if (conversation?.restaurantId !== ctx.tenant.restaurantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Conversation not found",
          });
        }

        const messages = await db.getConversationMessages(input.conversationId);

        return { conversation, messages };
      }),

    // Send message
    sendMessage: tenantProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string(),
          messageType: z.enum(["text", "image", "template", "interactive"]).default("text"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const conversation = await db.getConversationById(input.conversationId);
        
        if (conversation?.restaurantId !== ctx.tenant.restaurantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Conversation not found",
          });
        }

        const messageId = await db.createMessage({
          conversationId: input.conversationId,
          direction: "outbound",
          content: input.content,
          messageType: input.messageType,
        });

        // TODO: Actually send via WhatsApp API

        return { messageId, success: true };
      }),
  }),

  // ============================================================================
  // REVIEWS
  // ============================================================================
  
  reviews: router({
    // List reviews
    list: tenantProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ ctx, input }) => {
        return await db.getRestaurantReviews(ctx.tenant.restaurantId, input.limit);
      }),

    // Respond to review
    respond: tenantProcedure
      .input(
        z.object({
          reviewId: z.number(),
          responseText: z.string(),
          responseGeneratedBy: z.enum(["ai", "manual"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { reviewId, ...updateData } = input;
        
        await db.updateReview(reviewId, {
          ...updateData,
          respondedAt: new Date(),
          responseGeneratedBy: "manual",
        });

        // TODO: Post response to review platform

        return { success: true };
      }),
  }),

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================
  
  campaigns: router({
    // List campaigns
    list: tenantProcedure.query(async ({ ctx }) => {
      return await db.getRestaurantCampaigns(ctx.tenant.restaurantId);
    }),

    // Create campaign
    create: tenantProcedure
      .input(
        z.object({
          name: z.string(),
          targetAudience: z.object({
            inactiveDays: z.number().optional(),
            tags: z.array(z.string()).optional(),
            minReservations: z.number().optional(),
          }),
          messageTemplate: z.string(),
          scheduledAt: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const campaignId = await db.createCampaign({
          restaurantId: ctx.tenant.restaurantId,

          ...input,
          status: "draft",
          // createdBy: ctx.user.id,
        });

        return { campaignId, success: true };
      }),

    // Launch campaign
    launch: tenantProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateCampaign(input.campaignId, {
          status: "running",
        });

        // Create event for agent processing
        await db.createEvent({
          restaurantId: ctx.tenant.restaurantId,
          eventType: "campaign.launched",

          payload: { campaignId: input.campaignId },
          status: "pending",
        });

        return { success: true };
      }),

    // Pause campaign
    pause: tenantProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateCampaign(input.campaignId, {
          status: "cancelled",
        });

        return { success: true };
      }),
  }),

  // ============================================================================
  // ANALYTICS
  // ============================================================================
  
  analytics: router({
    // Get metrics summary
    summary: tenantProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        const [reservations, messages, reviews] = await Promise.all([
          db.getAggregatedMetrics(
            ctx.tenant.restaurantId,
            "reservations_count",
            input.startDate,
            input.endDate
          ),
          db.getAggregatedMetrics(
            ctx.tenant.restaurantId,
            "messages_sent",
            input.startDate,
            input.endDate
          ),
          db.getAggregatedMetrics(
            ctx.tenant.restaurantId,
            "reviews_count",
            input.startDate,
            input.endDate
          ),
        ]);

        return {
          reservations: reservations.total || 0,
          messages: messages.total || 0,
          reviews: reviews.total || 0,
        };
      }),

    // Get chart data
    chartData: tenantProcedure
      .input(
        z.object({
          metricType: z.string(),
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await db.getMetrics(
          ctx.tenant.restaurantId,
          input.metricType,
          input.startDate,
          input.endDate
        );
      }),
  }),
});

export type AppRouter = typeof appRouter;
