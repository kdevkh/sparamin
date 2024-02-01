import express from "express";
import cookieParser from "cookie-parser";
import UsersRouter from "./routers/users.router.js";
import ResumesRouter from "./routers/resumes.router.js";
import CommentsRouter from "./routers/comments.router.js";
import LogMiddleware from "./middlewares/log.middleware.js";
import errorHandlingMiddleware from "./middlewares/error-handling.middleware.js";
import expressSession from "express-session";
import expressMySQLSession from "express-mysql-session";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3018;

const MySQLStore = expressMySQLSession(expressSession);
const sessionStore = new MySQLStore({
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  expiration: 1000 * 60 * 60 * 24, // 세션의 만료 기간을 1일로 설정합니다.
  createDatabaseTable: true, // 세션 테이블을 자동으로 생성합니다.
});

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET_KEY, // 세션을 암호화하는 비밀 키를 설정
    resave: false, // 클라이언트의 요청이 올 때마다 세션을 새롭게 저장할 지 설정, 변경사항이 없어도 다시 저장
    saveUninitialized: false, // 세션이 초기화되지 않았을 때 세션을 저장할 지 설정
    cookie: {
      // 세션 쿠키 설정
      maxAge: 1000 * 60 * 60 * 24, // 쿠키의 만료 기간을 1일로 설정합니다.
    },
    store: sessionStore,
  }),
);
app.use("/api", [UsersRouter, ResumesRouter, CommentsRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
