import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE_NAME = 'pk_operator_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function resolveSessionSecret(): string {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const baseDir = isServerless ? '/tmp/printkilat' : process.cwd();
  const secretPath = path.resolve(baseDir, 'data', '.session_secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const SESSION_SECRET = resolveSessionSecret();

export interface OperatorSessionPayload {
  operatorId: number;
  email: string;
  name: string;
  exp: number;
}

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signOperatorToken(payload: Omit<OperatorSessionPayload, 'exp'>): string {
  const full: OperatorSessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyOperatorToken(token: string | undefined): OperatorSessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OperatorSessionPayload;
    if (!parsed || typeof parsed.operatorId !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isHttpsRequest(res: Response): boolean {
  const req = res.req;
  if (!req) return false;
  return Boolean(req.secure || req.get('x-forwarded-proto') === 'https');
}

export function setOperatorCookie(res: Response, token: string): void {
  const https = isHttpsRequest(res);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export function clearOperatorCookie(res: Response): void {
  const https = isHttpsRequest(res);
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: https ? 'none' : 'lax',
    secure: https,
  });
}

export function getOperatorFromRequest(req: Request): OperatorSessionPayload | null {
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    const fromHeader = verifyOperatorToken(bearerToken);
    if (fromHeader) return fromHeader;
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  return verifyOperatorToken(cookieToken);
}

export function requireOperatorAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getOperatorFromRequest(req);
  if (!session) {
    res.status(401).json({ error: 'Sesi operator tidak valid atau telah berakhir. Silakan masuk kembali.' });
    return;
  }
  (req as Request & { operator?: OperatorSessionPayload }).operator = session;
  next();
}
