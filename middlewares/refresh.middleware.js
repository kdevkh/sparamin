import jwt from "jsonwebtoken";

const REFRESH_TOKEN_SECRET_KEY = process.env.REFRESH_TOKEN_SECRET_KEY;

export default async function (req, res, next) {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) throw new Error("리프레시 토큰이 존재하지 않습니다.");

    const [tokenType, token] = refreshToken.split(" ");

    if (tokenType !== "Bearer")
      throw new Error("토큰 타입이 일치하지 않습니다.");

    const decodedRefreshToken = jwt.verify(token, REFRESH_TOKEN_SECRET_KEY);
    const userId = decodedRefreshToken.userId;

    // Refresh Token의 정보를 req 객체에 저장하여 다음 미들웨어에서 사용할 수 있게 합니다.
    req.refreshTokenInfo = decodedRefreshToken;

    return next();
  } catch (error) {
    // 토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
    switch (error.name) {
      case "TokenExpiredError":
        return res
          .status(401)
          .json({ message: "Refresh Token이 만료되었습니다." });
      case "JsonWebTokenError":
        return res
          .status(401)
          .json({ message: "Refresh Token이 조작되었습니다." });
      default:
        return res.status(401).json({ message: "비정상적인 요청입니다." });
    }
  }
}
