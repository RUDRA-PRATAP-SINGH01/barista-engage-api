// logs method, route, and request duration for every request
import type { MiddlewareHandler } from "hono";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  await next();
  const duration = Math.round(performance.now() - start);
  const method = c.req.method;
  const route = c.req.path;
  console.log(`${method} ${route} ${duration}ms`);
};
