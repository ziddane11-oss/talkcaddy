import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

// ChatGPT 디버깅: tRPC 전역 미들웨어로 요청 시작/종료 로깅
const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  console.log(`[tRPC] -> ${type} ${path}`);
  try {
    const result = await next();
    console.log(`[tRPC] <- ${type} ${path} ${Date.now() - start}ms`);
    return result;
  } catch (e) {
    console.log(`[tRPC] !! ${type} ${path} ${Date.now() - start}ms`, e instanceof Error ? e.message : String(e));
    throw e;
  }
});

export const router = t.router;
export const publicProcedure = t.procedure.use(timingMiddleware);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(timingMiddleware).use(requireUser);

export const adminProcedure = t.procedure.use(timingMiddleware).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
