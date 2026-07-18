/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,email]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `employee` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `employee` MODIFY `email` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_email_key` ON `Employee`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `Employee_organizationId_email_key` ON `Employee`(`organizationId`, `email`);
