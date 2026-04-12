import express from "express";
import { config } from "dotenv";
import { aiRouter } from "./routes/ai.js";

config({ path: "../.env" });

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/api/ai", aiRouter);

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
