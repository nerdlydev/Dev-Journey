import { Hono } from "hono";
import { cors } from "hono/cors";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { JWTPayload } from "hono/utils/jwt/types";

const app = new Hono();

// 1. Secrets (Use bun's .env support automatically)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "secret_access";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "secret_refresh";

// 2. Types
interface UserPayload extends JWTPayload {
  username: string;
  role: string;
  exp?: number;
}

// 3. Middleware
app.use(
  "/*",
  cors({
    origin: "http://localhost:5173", // Vite/React default port
    credentials: true, // Essential for cookies
  }),
);

// 4. Routes
app.post("/login", async (c) => {
  const { username, password } = await c.req.json();

  // Mock DB Check
  if (username !== "user" || password !== "password") {
    return c.json({ message: "Invalid credentials" }, 401);
  }

  const payload: UserPayload = { username, role: "user" };

  // Create Tokens
  const accessToken = await sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 15 }, // 15 mins
    ACCESS_TOKEN_SECRET,
  );

  const refreshToken = await sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, // 7 days
    REFRESH_TOKEN_SECRET,
  );

  // HTTP-Only Cookie
  setCookie(c, "refresh_token", refreshToken, {
    httpOnly: true,
    secure: true, // Set to true if using HTTPS
    sameSite: "Strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({ accessToken, user: payload });
});

app.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, "refresh_token");

  if (!refreshToken) return c.json({ message: "No refresh token" }, 401);

  try {
    const payload = (await verify(
      refreshToken,
      REFRESH_TOKEN_SECRET,
    )) as UserPayload;

    // Rotate tokens (Optional security measure: issue a new access token)
    const newAccessToken = await sign(
      {
        username: payload.username,
        role: payload.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 15,
      },
      ACCESS_TOKEN_SECRET,
    );

    return c.json({ accessToken: newAccessToken });
  } catch (err) {
    return c.json({ message: "Invalid refresh token" }, 401);
  }
});

app.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ message: "Unauthorized" }, 401);

  const token = authHeader.split(" ")[1];
  try {
    const payload = await verify(token, ACCESS_TOKEN_SECRET);
    return c.json({ user: payload });
  } catch (err) {
    return c.json({ message: "Invalid token" }, 401);
  }
});

app.post("/logout", (c) => {
  deleteCookie(c, "refresh_token");
  return c.json({ message: "Logged out" });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
