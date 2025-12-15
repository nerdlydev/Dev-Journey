import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  //* If moving to hono from express must know body, headers , query parameters, middlewares, connecting to db in hono
  return c.text("Hello Hono!");
});

export default app;
