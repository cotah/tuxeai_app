CREATE TABLE `agent_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentKey` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` enum('starter','growth','premium') NOT NULL DEFAULT 'starter',
	`basePriceMonthly` decimal(10,2) NOT NULL,
	`features` json,
	`icon` varchar(64),
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_catalog_agentKey_unique` UNIQUE(`agentKey`)
);
--> statement-breakpoint
CREATE TABLE `analytics_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`agentKey` varchar(64),
	`metricType` varchar(128) NOT NULL,
	`metricValue` decimal(15,2) NOT NULL,
	`dimensions` json,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`agentKey` varchar(64) NOT NULL DEFAULT 'reengagement',
	`name` varchar(255) NOT NULL,
	`targetAudience` json,
	`messageTemplate` text NOT NULL,
	`status` enum('draft','scheduled','running','completed','paused') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`completedAt` timestamp,
	`stats` json,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`customerId` int NOT NULL,
	`channel` enum('whatsapp','web') NOT NULL DEFAULT 'whatsapp',
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`assignedAgentKey` varchar(64),
	`metadata` json,
	`lastMessageAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`name` varchar(255),
	`phone` varchar(32),
	`email` varchar(320),
	`whatsappId` varchar(128),
	`tags` json,
	`metadata` json,
	`totalReservations` int NOT NULL DEFAULT 0,
	`totalNoShows` int NOT NULL DEFAULT 0,
	`lastInteractionAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_restaurantId_phone_unique` UNIQUE(`restaurantId`,`phone`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`agentKey` varchar(64),
	`payload` json NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`error` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`content` text NOT NULL,
	`messageType` enum('text','image','template','interactive') NOT NULL DEFAULT 'text',
	`whatsappMessageId` varchar(128),
	`agentKey` varchar(64),
	`metadata` json,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`deliveredAt` timestamp,
	`readAt` timestamp,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`customerId` int NOT NULL,
	`reservationDate` timestamp NOT NULL,
	`partySize` int NOT NULL,
	`status` enum('pending','confirmed','canceled','completed','no_show') NOT NULL DEFAULT 'pending',
	`specialRequests` text,
	`source` enum('whatsapp','web','phone','manual') NOT NULL DEFAULT 'manual',
	`confirmationSentAt` timestamp,
	`reminderSentAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`agentKey` varchar(64) NOT NULL,
	`isEnabled` int NOT NULL DEFAULT 1,
	`configuration` json,
	`stripeSubscriptionId` varchar(128),
	`stripeSubscriptionStatus` enum('active','past_due','canceled','unpaid','trialing','incomplete'),
	`currentPeriodEnd` timestamp,
	`subscribedAt` timestamp NOT NULL DEFAULT (now()),
	`canceledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurant_agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurant_agents_restaurantId_agentKey_unique` UNIQUE(`restaurantId`,`agentKey`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','manager','staff') NOT NULL DEFAULT 'staff',
	`permissions` json,
	`invitedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `restaurant_staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurant_staff_restaurantId_userId_unique` UNIQUE(`restaurantId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`whatsappNumber` varchar(32),
	`whatsappBusinessAccountId` varchar(128),
	`whatsappAccessToken` text,
	`businessHours` json,
	`menuUrl` varchar(512),
	`websiteUrl` varchar(512),
	`description` text,
	`settings` json,
	`stripeCustomerId` varchar(128),
	`status` enum('active','suspended','trial') NOT NULL DEFAULT 'trial',
	`trialEndsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`platform` enum('google','tripadvisor','facebook','yelp') NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`authorName` varchar(255),
	`authorAvatar` varchar(512),
	`rating` int NOT NULL,
	`reviewText` text,
	`reviewDate` timestamp NOT NULL,
	`responseText` text,
	`responseGeneratedBy` enum('ai','manual'),
	`respondedAt` timestamp,
	`respondedBy` int,
	`sentiment` enum('positive','neutral','negative'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_restaurantId_platform_externalId_unique` UNIQUE(`restaurantId`,`platform`,`externalId`)
);
--> statement-breakpoint
ALTER TABLE `analytics_metrics` ADD CONSTRAINT `analytics_metrics_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_agents` ADD CONSTRAINT `restaurant_agents_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_staff` ADD CONSTRAINT `restaurant_staff_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_staff` ADD CONSTRAINT `restaurant_staff_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_staff` ADD CONSTRAINT `restaurant_staff_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_restaurantId_restaurants_id_fk` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_respondedBy_users_id_fk` FOREIGN KEY (`respondedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;