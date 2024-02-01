import express from "express";
import { prisma } from "../models/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

/** 이력서 생성 API **/
router.post("/resumes", authMiddleware, async (req, res, next) => {
  // 로그인된 사용자인지 검증하기 위해 중간에 authMW 추가
  const { userId } = req.user;
  const { status, title, intro, exp, skill } = req.body;

  //   UserInfos 테이블도 가져오기
  const userInfos = await prisma.userInfos.findFirst({
    where: {
      userId: +userId,
    },
    select: {
      userInfoId: true,
    },
  });

  // UserInfos 정보 중에서 userInfoId 선택
  const userInfoId = userInfos?.userInfoId;

  const resume = await prisma.resumes.create({
    data: {
      userId: +userId,
      userInfoId: +userInfoId,
      status,
      title,
      intro,
      exp,
      skill,
    },
  });

  return res.status(201).json({ data: resume });
});

/** 이력서 목록 조회 API **/
router.get("/resumes", async (req, res, next) => {
  const resumes = await prisma.resumes.findMany({
    select: {
      resumeId: true,
      userId: true,
      userInfoId: true,
      status: true,
      title: true,
      userInfos: {
        select: {
          profileImage: true,
          name: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc", // 이력서를 최신순으로 정렬합니다.
    },
  });

  return res.status(200).json({ data: resumes });
});

/** 이력서 상세 조회 API **/
router.get("/resumes/:resumeId", async (req, res, next) => {
  const { resumeId } = req.params;
  const resume = await prisma.resumes.findFirst({
    where: {
      resumeId: +resumeId,
    },
    select: {
      resumeId: true,
      userId: true,
      userInfoId: true,
      status: true,
      title: true,
      userInfos: {
        select: {
          name: true,
          age: true,
          gender: true,
          profileImage: true,
        },
      },
      intro: true,
      exp: true,
      skill: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({ data: resume });
});

/** 이력서 수정 API **/
router.patch("/resumes/:resumeId", authMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  const { userId } = req.user;
  const { status, title, intro, exp, skill } = req.body;

  const resume = await prisma.resumes.findFirst({
    where: {
      resumeId: +resumeId,
      userId: +userId,
    },
  });

  if (!resume) {
    return res.status(404).json({ error: "이력서를 찾을 수 없습니다." });
  }

  const updatedResume = await prisma.resumes.update({
    where: {
      resumeId: +resumeId,
    },
    data: {
      status,
      title,
      intro,
      exp,
      skill,
    },
  });

  return res.status(200).json({ data: updatedResume });
});

/** 이력서 삭제 API **/
router.delete("/resumes/:resumeId", authMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  const { userId } = req.user;

  const resume = await prisma.resumes.findFirst({
    where: {
      resumeId: +resumeId,
      userId: +userId,
    },
  });

  if (!resume) {
    return res.status(404).json({ error: "이력서를 찾을 수 없습니다." });
  }

  await prisma.resumes.delete({
    where: {
      resumeId: +resumeId,
    },
  });

  return res.status(200).json({ message: "이력서가 삭제되었습니다." });
});

export default router;
