import "server-only";

import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { getDb } from "./db/client";
import { RATE_LIMITS } from "./domain/rate-limit";
import { CODE_LIMITED, CODE_WRONG, normalizeCode } from "./domain/two-factor";
import { claimCode, deleteSessionsExcept, releaseCode } from "./repositories/two-factor";
import { allowAttempt } from "./services/rate-limit";

const VERIFY_PATH = "/two-factor/verify-totp";

type Claim = { userId: string; code: string; activeToken: string | null };

const claims = new WeakMap<object, Claim>();

/**
 * The plugin of Better Auth accepts a code again inside its time window. This guard claims each
 * code first, per ADR-0304. It also ends older sessions at enrolment, because a session counts as
 * verified once its user has a second factor.
 */
export function singleUseTotp(): BetterAuthPlugin {
  return {
    id: "single-use-totp",
    hooks: {
      before: [
        {
          matcher: (context) => context.path === VERIFY_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            const code = normalizeCode(String(ctx.body?.code ?? ""));
            if (!code)
              throw new APIError("UNAUTHORIZED", { code: "INVALID_CODE", message: CODE_WRONG });
            const session = await getSessionFromCtx(ctx);
            let userId = session?.user.id;
            if (!userId) {
              const cookie = ctx.context.createAuthCookie("two_factor");
              const challenge = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
              if (!challenge) return;
              const row = await ctx.context.internalAdapter.findVerificationValue(challenge);
              userId = row?.value;
              if (!userId) return;
            }
            if (!(await allowAttempt("totp:user", userId, RATE_LIMITS.totpPerUser)))
              throw new APIError("TOO_MANY_REQUESTS", {
                code: "TOTP_RATE_LIMITED",
                message: CODE_LIMITED,
              });
            if (!(await claimCode(getDb(), userId, code)))
              throw new APIError("UNAUTHORIZED", { code: "INVALID_CODE", message: CODE_WRONG });
            claims.set(ctx.context, {
              userId,
              code,
              activeToken: session?.session.token ?? null,
            });
          }),
        },
      ],
      after: [
        {
          matcher: (context) => context.path === VERIFY_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            const claim = claims.get(ctx.context);
            if (!claim) return;
            claims.delete(ctx.context);
            if (isAPIError(ctx.context.returned)) {
              await releaseCode(getDb(), claim.userId, claim.code);
              return;
            }
            const fresh = ctx.context.newSession?.session.token;
            if (claim.activeToken && fresh && fresh !== claim.activeToken)
              await deleteSessionsExcept(getDb(), claim.userId, fresh);
          }),
        },
      ],
    },
  };
}
