-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'SEEK',
    "url" TEXT,
    "location" TEXT,
    "postcode" TEXT,
    "state" TEXT,
    "isRegionalNSW" BOOLEAN NOT NULL DEFAULT false,
    "regionMatchType" TEXT NOT NULL DEFAULT 'none',
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Saved',
    "statusOrder" INTEGER NOT NULL DEFAULT 0,
    "dateApplied" DATETIME,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "matchScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StatusHistory_applicationId_idx" ON "StatusHistory"("applicationId");
