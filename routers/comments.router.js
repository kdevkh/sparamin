import express from "express";
import { prisma } from "../models/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

/** 댓글 생성 API **/
router.post(
  "/resumes/:resumeId/comments",
  authMiddleware,
  async (req, res, next) => {
    const { resumeId } = req.params;
    const { userId } = req.user;
    const { content } = req.body;

    const resume = await prisma.resumes.findFirst({
      where: {
        resumeId: +resumeId,
      },
    });
    if (!resume)
      return res.status(404).json({ message: "이력서가 존재하지 않습니다." });

    const comment = await prisma.comments.create({
      data: {
        userId: +userId, // 댓글 작성자 ID
        resumeId: +resumeId, // 댓글 작성 이력서 ID
        content: content,
      },
    });

    return res.status(201).json({ data: comment });
  },
);

/** 댓글 조회 API **/
router.get("/resumes/:resumeId/comments", async (req, res, next) => {
  const { resumeId } = req.params;

  const resume = await prisma.resumes.findFirst({
    where: {
      resumeId: +resumeId,
    },
  });
  if (!resume)
    return res.status(404).json({ message: "이력서가 존재하지 않습니다." });

  const comments = await prisma.comments.findMany({
    where: {
      resumeId: +resumeId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json({ data: comments });
});

/** 댓글 수정 API **/
router.patch(
  "/resumes/:resumeId/comments/:commentId",
  authMiddleware,
  async (req, res, next) => {
    const { resumeId, commentId } = req.params;
    const { userId } = req.user;
    const { content } = req.body;

    const comment = await prisma.comments.findFirst({
      where: {
        commentId: +commentId,
        userId: +userId,
      },
    });

    if (!comment) return res.status(404).json({ message: "수정 안돼용" });

    const updatedComment = await prisma.comments.update({
      where: {
        commentId: +commentId,
      },
      data: {
        content: content,
      },
    });

    return res.status(200).json({ data: updatedComment });
  },
);

/** 댓글 삭제 API **/
router.delete(
  "/resumes/:resumeId/comments/:commentId",
  authMiddleware,
  async (req, res, next) => {
    const { resumeId, commentId } = req.params;
    const { userId } = req.user;

    const comment = await prisma.comments.findFirst({
      where: {
        commentId: +commentId,
        userId: +userId,
      },
    });

    if (!comment) return res.status(404).json({ message: "삭제 못해영" });

    await prisma.comments.delete({
      where: {
        commentId: +commentId,
      },
    });

    return res.status(200).json({ message: "댓글이 삭제되었습니다." });
  },
);

export default router;
