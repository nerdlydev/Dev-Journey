import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { z } from "zod";

const app = new Hono();

/* ================== CONFIG ================== */

const ACCESS_SECRET = "access-secret"; // env in prod
const REFRESH_SECRET = "refresh-secret";

const isProd = process.env.NODE_ENV === "production";

/* ================== CORS ================== */

app.use(
  "/*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

/* ================== MOCK DB ================== */

const users = [{ id: "1", email: "user@example.com", password: "password123" }];

/* ================== SCHEMAS ================== */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const jwtPayloadSchema = z.object({
  sub: z.string(),
  exp: z.number(),
});

/* ================== HELPERS ================== */

const createAccessToken = (userId: string) =>
  sign(
    { sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 15 },
    ACCESS_SECRET
  );

const createRefreshToken = (userId: string) =>
  sign(
    { sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
    REFRESH_SECRET
  );

/* ================== ROUTES ================== */

// LOGIN
app.post("/login", async (c) => {
  const body = loginSchema.parse(await c.req.json());

  const user = users.find(
    (u) => u.email === body.email && u.password === body.password
  );

  if (!user) return c.json({ message: "Invalid credentials" }, 401);

  const accessToken = await createAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);

  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    path: "/refresh",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({
    accessToken,
    user: { id: user.id, email: user.email },
  });
});

// REFRESH
app.post("/refresh", async (c) => {
  const token = getCookie(c, "refreshToken");
  if (!token) return c.json({ message: "Unauthorized" }, 401);

  try {
    const rawPayload = await verify(token, REFRESH_SECRET);
    const payload = jwtPayloadSchema.parse(rawPayload);

    const newAccessToken = await createAccessToken(payload.sub);

    return c.json({ accessToken: newAccessToken });
  } catch {
    return c.json({ message: "Unauthorized" }, 401);
  }
});

// LOGOUT
app.post("/logout", (c) => {
  deleteCookie(c, "refreshToken", { path: "/refresh" });
  return c.json({ message: "Logged out" });
});

/* ================== AUTH MIDDLEWARE ================== */

app.use("/api/*", async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer "))
    return c.json({ message: "Unauthorized" }, 401);

  try {
    const token = header.split(" ")[1];
    const payload = jwtPayloadSchema.parse(await verify(token, ACCESS_SECRET));

    c.set("userId", payload.sub);
    await next();
  } catch {
    return c.json({ message: "Unauthorized" }, 401);
  }
});

// PROTECTED
app.get("/api/me", (c) => {
  return c.json({
    message: "Authorized",
    userId: c.get("userId"),
  });
});

export default app;
