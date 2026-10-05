-- AlterTable
ALTER TABLE `donations` ADD COLUMN `method` VARCHAR(20) NULL,
    ADD COLUMN `note` VARCHAR(255) NULL;
