-- AlterTable
ALTER TABLE `subscribers` ADD COLUMN `token` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `newsletters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'SENDING',
    `recipients` INTEGER NOT NULL DEFAULT 0,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_views` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `day` DATE NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `referrer` VARCHAR(191) NOT NULL DEFAULT '',
    `device` VARCHAR(10) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,

    INDEX `page_views_day_idx`(`day`),
    UNIQUE INDEX `page_views_day_path_referrer_device_key`(`day`, `path`, `referrer`, `device`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_visitors` (
    `day` DATE NOT NULL,
    `visitors` INTEGER NOT NULL DEFAULT 0,
    `views` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `albums` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `date` DATE NULL,
    `coverId` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `albums_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `album_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `albumId` INTEGER NOT NULL,
    `mediaId` INTEGER NULL,
    `videoUrl` VARCHAR(500) NULL,
    `caption` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `album_items_albumId_sortOrder_idx`(`albumId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `subscribers_token_key` ON `subscribers`(`token`);

-- AddForeignKey
ALTER TABLE `albums` ADD CONSTRAINT `albums_coverId_fkey` FOREIGN KEY (`coverId`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `album_items` ADD CONSTRAINT `album_items_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `albums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `album_items` ADD CONSTRAINT `album_items_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

