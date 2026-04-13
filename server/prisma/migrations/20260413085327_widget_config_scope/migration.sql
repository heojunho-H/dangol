-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WidgetConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'sales',
    "widgetOrder" TEXT NOT NULL DEFAULT '[]',
    "widgetSizes" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WidgetConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WidgetConfig" ("id", "updatedAt", "widgetOrder", "widgetSizes", "workspaceId") SELECT "id", "updatedAt", "widgetOrder", "widgetSizes", "workspaceId" FROM "WidgetConfig";
DROP TABLE "WidgetConfig";
ALTER TABLE "new_WidgetConfig" RENAME TO "WidgetConfig";
CREATE UNIQUE INDEX "WidgetConfig_workspaceId_scope_key" ON "WidgetConfig"("workspaceId", "scope");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
