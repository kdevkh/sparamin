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
  const orderKey = req.query.orderKey ?? "resumeId";
  const orderValue = req.query.orderValue ?? "desc";

  if (!["resumeId", "status"].includes(orderKey)) {
    return res.status(400).json({ message: "orderKey가 올바르지 않습니다." });
  }

  if (!["asc", "desc"].includes(orderValue.toLowerCase())) {
    return res.status(400).json({ message: "orderValue가 올바르지 않습니다." });
  }

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
    orderBy: [
      {
        [orderKey]: orderValue.toLowerCase(), // []로 orderKey를 감싸줘야 resumeId나 status 중 하나가 들어와도 작동 가능 --- 변수를 통해 변수 안의 값이 들어가게 되는 것
      },
    ],
  });

  return res.status(200).json({ data: resumes });
});

/** 이력서 상세 조회 API **/
router.get("/resumes/:resumeId", async (req, res, next) => {
  const { resumeId } = req.params;
  const resume = await prisma.resumes.findFirst({
    where: {
      resumeId: +resumeId, // Number(resumeId)로도 쓸 수 있음
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

  if (
    ![
      "APPLY",
      "DROP",
      "PASS",
      "INTERVIEW1",
      "INTERVIEW2",
      "FINAL_PASS",
    ].includes(status)
  ) {
    return res.status(400).json({
      message: "올바른 상태값이 아닙니다.",
    });
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
