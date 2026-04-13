-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SavedView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'sales',
    "name" TEXT NOT NULL,
    "viewType" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '[]',
    "sorts" TEXT NOT NULL DEFAULT '[]',
    "groupBy" TEXT NOT NULL DEFAULT '',
    "searchQuery" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedView_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SavedView" ("createdAt", "filters", "groupBy", "id", "name", "searchQuery", "sorts", "updatedAt", "viewType", "workspaceId") SELECT "createdAt", "filters", "groupBy", "id", "name", "searchQuery", "sorts", "updatedAt", "viewType", "workspaceId" FROM "SavedView";
DROP TABLE "SavedView";
ALTER TABLE "new_SavedView" RENAME TO "SavedView";
CREATE INDEX "SavedView_workspaceId_scope_idx" ON "SavedView"("workspaceId", "scope");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
