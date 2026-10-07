-- Version anglaise (facultative) des annonces et des événements.
ALTER TABLE `announcements` ADD COLUMN `titleEn` VARCHAR(255) NULL, ADD COLUMN `contentEn` LONGTEXT NULL;
ALTER TABLE `events` ADD COLUMN `titleEn` VARCHAR(255) NULL, ADD COLUMN `descriptionEn` TEXT NULL, ADD COLUMN `locationEn` VARCHAR(255) NULL;
