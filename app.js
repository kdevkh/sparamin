import express from "express";
import cookieParser from "cookie-parser";
import UsersRouter from "./routers/users.router.js";
import ResumesRouter from "./routers/resumes.router.js";
import CommentsRouter from "./routers/comments.router.js";
import LogMiddleware from "./middlewares/log.middleware.js";
import errorHandlingMiddleware from "./middlewares/error-handling.middleware.js";
// import expressSession from "express-session";
// import expressMySQLSession from "express-mysql-session";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3018;

app.use(cookieParser());
app.use(LogMiddleware);
app.use(express.json());

app.use("/api", [UsersRouter, ResumesRouter, CommentsRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
