import express from "express";
import { prisma } from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
import { Prisma } from "@prisma/client";
import refreshMiddleware from "../middlewares/refresh.middleware.js";

const router = express.Router();

/** 사용자 회원가입 API **/
router.post("/sign-up", async (req, res, next) => {
  try {
    const {
      email,
      clientId,
      password,
      passwordConfirm,
      name,
      age,
      gender,
      profileImage,
      role,
    } = req.body;

    if (role && !["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "정의되지 않은 권한입니다." });
    }

    // 해설강의에서 유효성검사 실행 내역:
    if (!clientId) {
      if (!email) {
        return res.status(400).json({ message: "이메일은 필수값입니다." });
      }
      if (!password) {
        return res.status(400).json({ message: "비밀번호는 필수값입니다." });
      }
      if (!passwordConfirm) {
        return res
          .status(400)
          .json({ message: "비밀번호 확인은 필수값입니다." });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "비밀번호는 최소 6자리 이상이어야 합니다." });
      }

      if (password !== passwordConfirm) {
        return res
          .status(400)
          .json({ message: "비밀번호가 일치하지 않습니다." });
      }
    }

    if (!name) {
      return res.status(400).json({ message: "이름은 필수값입니다." });
    }

    // 카카오 회원가입
    if (clientId) {
      const isExistUser = await prisma.users.findFirst({
        where: {
          clientId,
        },
      });

      if (isExistUser) {
        return res.status(200).json({ message: "이미 가입된 사용자입니다." });
      }

      const [createdUser, createdUserInfo] = await prisma.$transaction(
        async (tx) => {
          const user = await tx.users.create({
            data: {
              clientId,
              role,
            },
            include: {
              userInfos: true,
            },
          });

          // UserInfos 테이블에 사용자 정보를 추가합니다.
          const userInfo = await tx.userInfos.create({
            data: {
              userId: user.userId,
              name,
            },
          });

          return [user, userInfo];
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
    } else {
      // email 회원가입
      const isExistUser = await prisma.users.findFirst({
        where: { email },
      });

      if (isExistUser) {
        return res.status(409).json({ message: "이미 존재하는 이메일입니다." });
      }

      // 사용자 비밀번호를 암호화합니다.
      const hashedPassword = await bcrypt.hash(password, 10);

      const [createdUser, createdUserInfo] = await prisma.$transaction(
        async (tx) => {
          const user = await tx.users.create({
            data: {
              email,
              password: hashedPassword,
              role,
            },
            include: {
              userInfos: true,
            },
          });

          // UserInfos 테이블에 사용자 정보를 추가합니다.
          const userInfo = await tx.userInfos.create({
            data: {
              userId: user.userId,
              name,
              age,
              gender,
              profileImage,
            },
          });

          return [user, userInfo];
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
    }

    return res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (err) {
    next(err);
  }
});

/** 로그인 API **/
const ACCESS_TOKEN_SECRET_KEY = process.env.ACCESS_TOKEN_SECRET_KEY;
const REFRESH_TOKEN_SECRET_KEY = process.env.REFRESH_TOKEN_SECRET_KEY;

const tokenStorage = {}; // Refresh Token을 저장할 객체

router.post("/sign-in", async (req, res, next) => {
  const { clientId, email, password } = req.body;
  let user;
  if (clientId) {
    // 카카오 로그인
    user = await prisma.users.findFirst({ where: { clientId } });
    if (!user)
      return res.status(401).json({ message: "존재하지 않는 계정입니다." });
  } else {
    // 이메일 로그인
    user = await prisma.users.findFirst({ where: { email } });
    if (!email)
      return res.status(401).json({ message: "존재하지 않는 이메일입니다." });
    if (!user)
      return res.status(401).json({ message: "존재하지 않는 이메일입니다." });
    // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
  }

  // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성합니다.
  const accessToken = jwt.sign(
    { userId: user.userId },
    ACCESS_TOKEN_SECRET_KEY,
    { expiresIn: "12h" },
  );

  const refreshToken = jwt.sign(
    { userId: user.userId },
    REFRESH_TOKEN_SECRET_KEY,
    { expiresIn: "7d" },
  );

  // Refresh Token을 가지고 해당 유저의 정보를 서버에 저장합니다.
  tokenStorage[refreshToken] = {
    id: user.userId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };

  // authotization key값을 가진 쿠키에 Bearer 토큰 형식으로 JWT를 저장합니다.
  res.cookie("authorization", `Bearer ${accessToken}`);
  res.cookie("refreshToken", `Bearer ${refreshToken}`);

  return res.status(200).json({ message: "로그인 성공" });
});

/** Refresh Token으로 Access Token 재발급 **/
router.post("/token/refresh", refreshMiddleware, async (req, res, next) => {
  const { userId } = req.refreshTokenInfo;

  // 새로운 Access Token을 생성합니다.
  const newAccessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET_KEY, {
    expiresIn: "3h",
  });

  // 새로운 Access Token을 클라이언트에게 전달합니다.
  res.cookie("authorization", `Bearer ${newAccessToken}`);

  return res.status(200).json({ message: "새로운 Access Token 발급 성공" });
});

/** 사용자 조회 API **/
router.get("/users", authMiddleware, async (req, res, next) => {
  const { userId } = req.user;

  const user = await prisma.users.findFirst({
    where: { userId: +userId },
    select: {
      userId: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      userInfos: {
        // 1:1 관계를 맺고있는 UserInfos 테이블을 조회합니다.
        select: {
          name: true,
          age: true,
          gender: true,
          profileImage: true,
        },
      },
    },
  });

  return res.status(200).json({ data: user });
});

/** 사용자 정보 변경 API **/
router.patch("/users/", authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const updatedData = req.body;

    const userInfo = await prisma.userInfos.findFirst({
      where: { userId: +userId },
    });
    if (!userInfo)
      return res
        .status(404)
        .json({ message: "사용자 정보가 존재하지 않습니다." });

    await prisma.$transaction(
      async (tx) => {
        // 트랜잭션 내부에서 사용자 정보를 수정합니다.
        await tx.userInfos.update({
          data: {
            ...updatedData,
          },
          where: {
            userId: userInfo.userId,
          },
        });

        // 변경된 필드만 UseHistories 테이블에 저장합니다.
        for (let key in updatedData) {
          if (userInfo[key] !== updatedData[key]) {
            await tx.userHistories.create({
              data: {
                userId: userInfo.userId,
                changedField: key,
                oldValue: String(userInfo[key]),
                newValue: String(updatedData[key]),
              },
            });
          }
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    return res
      .status(200)
      .json({ message: "사용자 정보 변경에 성공하였습니다." });
  } catch (err) {
    next(err);
  }
});

export default router;
