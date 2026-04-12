import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { getClient } from "../services/claude.js";

export const chatRouter = Router();
chatRouter.use(authMiddleware);

// List chat sessions
chatRouter.get(
  "/sessions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await prisma.chatSession.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { messages: true } } },
      });
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  }
);

// Create session
chatRouter.post(
  "/sessions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title } = req.body;
      const session = await prisma.chatSession.create({
        data: {
          workspaceId: req.workspaceId,
          title: title || "새 대화",
        },
      });
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  }
);

// Delete session
chatRouter.delete(
  "/sessions/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await prisma.chatSession.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "세션을 찾을 수 없습니다" });
        return;
      }

      await prisma.chatSession.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// Get messages for a session
chatRouter.get(
  "/sessions/:id/messages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: "asc" },
      });
      res.json(messages);
    } catch (err) {
      next(err);
    }
  }
);

// Send message + get AI response
chatRouter.post(
  "/sessions/:id/messages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ error: "content는 필수입니다" });
        return;
      }

      // Verify session
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, workspaceId: req.workspaceId },
      });
      if (!session) {
        res.status(404).json({ error: "세션을 찾을 수 없습니다" });
        return;
      }

      // Save user message
      const userMsg = await prisma.chatMessage.create({
        data: { sessionId, role: "user", content },
      });

      // Get conversation history
      const history = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      // Try AI response
      let aiContent: string;
      try {
        const client = getClient();
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system:
            "당신은 B2B CRM 서비스의 AI 어시스턴트입니다. 영업, 고객 관리, 딜 파이프라인에 대한 질문에 한국어로 답변합니다. 간결하고 실용적인 답변을 제공하세요.",
          messages: history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });
        aiContent =
          response.content[0].type === "text"
            ? response.content[0].text
            : "응답을 생성할 수 없습니다.";
      } catch {
        aiContent =
          "AI 응답을 생성할 수 없습니다. API 키를 확인해주세요.";
      }

      // Save AI message
      const aiMsg = await prisma.chatMessage.create({
        data: { sessionId, role: "assistant", content: aiContent },
      });

      // Update session title if first message
      if (history.length <= 1) {
        const titlePreview =
          content.length > 30 ? content.slice(0, 30) + "..." : content;
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { title: titlePreview },
        });
      }

      res.json({ userMessage: userMsg, assistantMessage: aiMsg });
    } catch (err) {
      next(err);
    }
  }
);
