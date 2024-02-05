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
  const { userId, role } = req.user;
  const { status, title, intro, exp, skill } = req.body;

  const resume = await prisma.resumes.findFirst({
    where: {
      resumeId: +resumeId,
    },
  });

  if (!resume) {
    return res.status(404).json({ error: "이력서를 찾을 수 없습니다." });
  }

  // 권한 부여
  if (!req.isAdmin && resume.userId !== +userId) {
    return res.status(400).json({ message: "권한이 없습니다~~~" });
  }

  const allowedStatusValues = [
    "APPLY",
    "DROP",
    "PASS",
    "INTERVIEW1",
    "INTERVIEW2",
    "FINAL_PASS",
  ];

  if (status && !allowedStatusValues.includes(status)) {
    return res.status(400).json({
      message: "올바른 상태값이 아닙니다.",
    });
  }

  // admin 타 필드 수정 불가
  if (req.isAdmin) {
    const nonStatusFields = Object.keys(req.body).filter(
      (field) => field !== "status",
    );

    if (nonStatusFields.length > 0) {
      return res.status(400).json({
        message: "admin은 status 이외의 필드를 수정할 수 없습니다.",
      });
    }
  }

  const updateData = req.isAdmin
    ? { status }
    : { status, title, intro, exp, skill };

  const updatedResume = await prisma.resumes.update({
    where: {
      resumeId: +resumeId,
    },
    data: updateData,
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
