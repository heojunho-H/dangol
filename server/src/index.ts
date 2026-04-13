import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { dealsRouter } from "./routes/deals.js";
import { pipelineStagesRouter } from "./routes/pipeline-stages.js";
import { customFieldsRouter } from "./routes/custom-fields.js";
import { viewsRouter } from "./routes/views.js";
import { widgetConfigRouter } from "./routes/widget-config.js";
import { customKpisRouter } from "./routes/custom-kpis.js";
import { goalsRouter } from "./routes/goals.js";
import { activityLogsRouter } from "./routes/activity-logs.js";
import { filesRouter, fileDownloadRouter } from "./routes/files.js";
import { customersRouter } from "./routes/customers.js";
import { chatRouter } from "./routes/chat.js";
import { contractsRouter } from "./routes/contracts.js";
import { customerLifecycleStagesRouter } from "./routes/customer-lifecycle-stages.js";
import { customerCustomFieldsRouter } from "./routes/customer-custom-fields.js";
import { workspaceSettingsRouter } from "./routes/workspace-settings.js";

config({ path: "../.env" });

const app = express();

// CORS: comma-separated origins in FRONTEND_URL (e.g. "https://dangol.app,https://dangol.pages.dev")
// In dev (no FRONTEND_URL set), allow all origins — Vite proxy handles same-origin anyway.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
app.use(
  cors({
    origin: allowedOrigins ?? true,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// Public routes
app.use("/api/auth", authRouter);

// AI routes (will be protected later)
app.use("/api/ai", aiRouter);

// Deal routes (protected)
app.use("/api/deals", dealsRouter);

// Settings routes (protected)
app.use("/api/pipeline-stages", pipelineStagesRouter);
app.use("/api/custom-fields", customFieldsRouter);
app.use("/api/views", viewsRouter);

// Dashboard config routes (protected)
app.use("/api/widget-config", widgetConfigRouter);
app.use("/api/custom-kpis", customKpisRouter);
app.use("/api/goals", goalsRouter);

// Activity logs + files (nested under deals)
app.use("/api/deals/:dealId/activity-logs", activityLogsRouter);
app.use("/api/deals/:dealId/files", filesRouter);
app.use("/api/files", fileDownloadRouter);

// Customers + Chat (protected)
app.use("/api/customers", customersRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/customer-lifecycle-stages", customerLifecycleStagesRouter);
app.use("/api/customer-custom-fields", customerCustomFieldsRouter);
app.use("/api/workspace-settings", workspaceSettingsRouter);
app.use("/api/chat", chatRouter);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server error]", err.message);
    res
      .status(500)
      .json({ error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on :${PORT}`);
});
