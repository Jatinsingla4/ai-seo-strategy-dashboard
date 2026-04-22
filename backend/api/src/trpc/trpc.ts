import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { Env } from "../index";

export interface Context {
  env: Env;
  userId?: string | null;
  clientIp?: string | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authProcedure = t.procedure.use(async ({ next, ctx }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: { id: ctx.userId },
    },
  });
});
