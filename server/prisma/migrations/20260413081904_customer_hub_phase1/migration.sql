-- CreateTable
CREATE TABLE "CustomerLifecycleStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "type" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerLifecycleStage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sourceDealId" TEXT,
    "service" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "renewalStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "memo" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_sourceDealId_fkey" FOREIGN KEY ("sourceDealId") REFERENCES "Deal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerCustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT NOT NULL DEFAULT '[]',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerCustomField_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "workspaceId" TEXT NOT NULL PRIMARY KEY,
    "autoConvertWonToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '활성',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "lifecycleStageId" TEXT,
    "healthScore" INTEGER,
    "customFieldValues" TEXT NOT NULL DEFAULT '{}',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "firstPurchaseAt" DATETIME,
    "lastPurchaseAt" DATETIME,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Customer_lifecycleStageId_fkey" FOREIGN KEY ("lifecycleStageId") REFERENCES "CustomerLifecycleStage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("avatar", "company", "createdAt", "email", "id", "location", "name", "phone", "status", "title", "updatedAt", "workspaceId") SELECT "avatar", "company", "createdAt", "email", "id", "location", "name", "phone", "status", "title", "updatedAt", "workspaceId" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_workspaceId_idx" ON "Customer"("workspaceId");
CREATE INDEX "Customer_workspaceId_company_idx" ON "Customer"("workspaceId", "company");
CREATE INDEX "Customer_workspaceId_lifecycleStageId_idx" ON "Customer"("workspaceId", "lifecycleStageId");
CREATE TABLE "new_Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "contact" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "service" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "managerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "memo" TEXT NOT NULL DEFAULT '',
    "customFieldValues" TEXT NOT NULL DEFAULT '{}',
    "customerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deal_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Deal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deal" ("amount", "company", "contact", "createdAt", "customFieldValues", "date", "email", "id", "managerId", "memo", "phone", "position", "quantity", "service", "stageId", "status", "updatedAt", "workspaceId") SELECT "amount", "company", "contact", "createdAt", "customFieldValues", "date", "email", "id", "managerId", "memo", "phone", "position", "quantity", "service", "stageId", "status", "updatedAt", "workspaceId" FROM "Deal";
DROP TABLE "Deal";
ALTER TABLE "new_Deal" RENAME TO "Deal";
CREATE INDEX "Deal_workspaceId_idx" ON "Deal"("workspaceId");
CREATE INDEX "Deal_workspaceId_stageId_idx" ON "Deal"("workspaceId", "stageId");
CREATE INDEX "Deal_workspaceId_status_idx" ON "Deal"("workspaceId", "status");
CREATE INDEX "Deal_workspaceId_date_idx" ON "Deal"("workspaceId", "date");
CREATE INDEX "Deal_customerId_idx" ON "Deal"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CustomerLifecycleStage_workspaceId_idx" ON "CustomerLifecycleStage"("workspaceId");

-- CreateIndex
CREATE INDEX "Contract_workspaceId_idx" ON "Contract"("workspaceId");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_sourceDealId_idx" ON "Contract"("sourceDealId");

-- CreateIndex
CREATE INDEX "CustomerCustomField_workspaceId_idx" ON "CustomerCustomField"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCustomField_workspaceId_key_key" ON "CustomerCustomField"("workspaceId", "key");
