

















import { z } from 'zod';
import { CommandError } from '../electron/middleware/errors';


const str = (max: number) => z.string().min(1).max(max);






const mergeRequest = (a: unknown): Record<string, unknown> => {
  const o = a && typeof a === 'object' ? (a as Record<string, unknown>) : {};
  const r = o.request && typeof o.request === 'object' ? (o.request as Record<string, unknown>) : {};
  return { ...o, ...r };
};

export const COMMAND_SCHEMAS: Record<string, z.ZodTypeAny> = {
  login: z.preprocess(
    mergeRequest,
    z.object({ username: str(256), password: str(1024) }).passthrough(),
  ),
  login_verify_2fa: z.preprocess(
    mergeRequest,
    z.object({ challenge: str(512), code: str(32) }).passthrough(),
  ),
  change_password: z
    .object({
      token: str(512),
      current_password: str(1024),
      new_password: str(1024),
    })
    .passthrough(),
  logout: z.object({ token: str(512) }).passthrough(),
  delete_user: z
    .object({
      token: str(512),
      request: z.object({ id: z.number().int().positive() }).passthrough(),
    })
    .passthrough(),
};





export function validateCommandArgs(name: string, args: unknown): void {
  const schema = COMMAND_SCHEMAS[name];
  if (!schema) return;
  const res = schema.safeParse(args);
  if (!res.success) {
    const first = res.error.issues[0];
    const where = first?.path?.length ? first.path.join('.') : 'args';
    throw CommandError.badRequest(
      `Parametri invalizi pentru '${name}': ${where} — ${first?.message || 'invalid'}`,
    );
  }
}
