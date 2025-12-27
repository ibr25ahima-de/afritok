CREATE TABLE `blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromUserId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`videoId` int,
	`message` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`videoId` int,
	`userId` int,
	`reason` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `withdrawals` MODIFY COLUMN `amount` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `withdrawals` MODIFY COLUMN `paymentMethod` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `withdrawals` MODIFY COLUMN `status` varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `earnings` ADD `source` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `earnings` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `withdrawals` DROP COLUMN `transactionId`;