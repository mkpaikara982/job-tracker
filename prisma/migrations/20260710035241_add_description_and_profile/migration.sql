-- AlterTable
ALTER TABLE "Application" ADD COLUMN "description" TEXT;
ALTER TABLE "Application" ADD COLUMN "matchedSkills" TEXT;
ALTER TABLE "Application" ADD COLUMN "missingSkills" TEXT;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "resumeText" TEXT NOT NULL DEFAULT '',
    "resumeName" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);
