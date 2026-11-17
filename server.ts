import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DEFAULT_API_BASE_URL = 'https://api.sg-light-api.com';
const DEFAULT_AREA_CODE = 'SG';
const DEFAULT_SQUAD_CHANNEL_ID = 'squad_vanguard_echo';

// Hackathon MVP allowlist: restricts token issuance to configured squad roster IDs
// until full user authentication/session management is implemented.
const ALLOWED_SQUAD_USER_IDS = new Set([
  'player_kael',
  'player_nyx',
  'player_vex',
  'player_ryder',
]);
const SAFE_USER_ID_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const SAFE_CHANNEL_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const TOKEN_RATE_LIMIT_WINDOW_MS = 60_000;
const TOKEN_RATE_LIMIT_MAX_REQUESTS = 15;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitBuckets.entries()) {
    if (now >= entry.resetAt) {
      rateLimitBuckets.delete(key);
    }
  }
}, TOKEN_RATE_LIMIT_WINDOW_MS);
cleanupInterval.unref();

function validateSquadUserId(rawUserId: unknown): { valid: true; userId: string } | { valid: false; error: string; status: number } {
  if (typeof rawUserId !== 'string' || !rawUserId.trim()) {
    return { valid: false, error: 'userId is required.', status: 400 };
  }
  const trimmed = rawUserId.trim();
  if (!SAFE_USER_ID_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid userId format. Allowed characters: letters, numbers, underscores, hyphens (3-32 chars).',
      status: 400,
    };
  }
  if (!ALLOWED_SQUAD_USER_IDS.has(trimmed)) {
    return {
      valid: false,
      error: 'userId is not in the authorized MVP squad roster allowlist.',
      status: 403,
    };
  }
  return { valid: true, userId: trimmed };
}

function createIpRateLimiter(bucketPrefix: string, maxRequests: number, windowMs: number): express.RequestHandler {
  return (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${bucketPrefix}:${clientIp}`;
    const now = Date.now();
    const current = rateLimitBuckets.get(key);

    if (!current || now >= current.resetAt) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: `Rate limit exceeded. Try again in ${retryAfterSeconds}s.`,
      });
    }

    current.count += 1;
    return next();
  };
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return (
    trimmed.startsWith('YOUR_') ||
    trimmed.startsWith('MY_') ||
    trimmed === '<Your-App-Key>' ||
    trimmed === '<Your-App-Secret>'
  );
}

function resolveApiBaseUrl(rawUrl: string | undefined): string {
  if (isPlaceholder(rawUrl)) {
    return DEFAULT_API_BASE_URL;
  }
  const trimmed = rawUrl!.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {
    // Non-URL values (e.g. an accidentally swapped channel ID) fall back to Singapore API endpoint
  }
  return DEFAULT_API_BASE_URL;
}

function resolveSquadChannelId(rawBackend: string | undefined, rawFrontend: string | undefined): string {
  const candidates = [rawBackend, rawFrontend];
  for (const candidate of candidates) {
    if (isPlaceholder(candidate)) continue;
    const trimmed = candidate!.trim();
    // Never allow an API URL or domain string to be used as the squad channel ID
    if (
      /^https?:\/\//i.test(trimmed) ||
      trimmed.includes('://') ||
      trimmed.includes('/') ||
      /\.com$/i.test(trimmed)
    ) {
      continue;
    }
    if (/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return DEFAULT_SQUAD_CHANNEL_ID;
}

function resolveAreaCode(rawArea: string | undefined): string {
  if (isPlaceholder(rawArea)) return DEFAULT_AREA_CODE;
  const upper = rawArea!.trim().toUpperCase();
  if (['SG', 'NA', 'SA', 'OM', 'BJ'].includes(upper)) {
    return upper;
  }
  return DEFAULT_AREA_CODE;
}

function getNexconnServerConfig() {
  const frontendAppKey = process.env.VITE_NEXCONN_APP_KEY;
  const backendAppKey = process.env.NEXCONN_APP_KEY || frontendAppKey;
  const backendAppSecret = process.env.NEXCONN_APP_SECRET;
  const areaCode = resolveAreaCode(process.env.VITE_NEXCONN_AREA_CODE);
  const apiBaseUrl = resolveApiBaseUrl(process.env.NEXCONN_API_BASE_URL);
  const squadChannelId = resolveSquadChannelId(
    process.env.NEXCONN_SQUAD_CHANNEL_ID,
    process.env.VITE_NEXCONN_SQUAD_CHANNEL_ID
  );

  const publicAppKey = isPlaceholder(frontendAppKey)
    ? isPlaceholder(backendAppKey)
      ? ''
      : backendAppKey!.trim()
    : frontendAppKey!.trim();

  const missingVars: string[] = [];
  if (!publicAppKey) {
    missingVars.push('VITE_NEXCONN_APP_KEY / NEXCONN_APP_KEY');
  }
  if (isPlaceholder(backendAppSecret)) {
    missingVars.push('NEXCONN_APP_SECRET');
  }

  return {
    frontendAppKey: publicAppKey,
    backendAppKey: isPlaceholder(backendAppKey) ? publicAppKey : backendAppKey!.trim(),
    backendAppSecret: isPlaceholder(backendAppSecret) ? '' : backendAppSecret!.trim(),
    areaCode,
    apiBaseUrl,
    squadChannelId,
    missingVars: Array.from(new Set(missingVars)),
    readyForLiveSdk: Boolean(publicAppKey) && !isPlaceholder(backendAppSecret),
  };
}

/**
 * Computes official Nexconn Platform Chat API headers:
 * Signature = SHA1(AppSecret + Nonce + Timestamp)
 */
function buildSignedNexconnHeaders(appKey: string, appSecret: string) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const timestamp = String(Date.now());
  const signature = crypto
    .createHash('sha1')
    .update(`${appSecret}${nonce}${timestamp}`)
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'App-Key': appKey,
    Nonce: nonce,
    Timestamp: timestamp,
    Signature: signature,
    'X-Request-ID': crypto.randomUUID(),
  };
}

async function parseUpstreamJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Nexconn API returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 140)}`
    );
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  // Ensure malformed JSON payloads return JSON instead of Express default HTML
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api') && err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON request body.' });
    }
    return next(err);
  });

  const tokenRateLimiter = createIpRateLimiter(
    'nexconn-token',
    TOKEN_RATE_LIMIT_MAX_REQUESTS,
    TOKEN_RATE_LIMIT_WINDOW_MS
  );
  const ensureRateLimiter = createIpRateLimiter(
    'nexconn-ensure',
    TOKEN_RATE_LIMIT_MAX_REQUESTS,
    TOKEN_RATE_LIMIT_WINDOW_MS
  );

  // Safe diagnostics endpoint — never returns NEXCONN_APP_SECRET
  app.get('/api/nexconn/status', (_req, res) => {
    const cfg = getNexconnServerConfig();
    res.json({
      configured: cfg.readyForLiveSdk,
      hasFrontendAppKey: Boolean(cfg.frontendAppKey),
      hasBackendAppKey: Boolean(cfg.backendAppKey),
      hasBackendAppSecret: Boolean(cfg.backendAppSecret),
      appKey: cfg.frontendAppKey,
      areaCode: cfg.areaCode,
      apiBaseUrl: cfg.apiBaseUrl,
      squadChannelId: cfg.squadChannelId,
      missingVars: cfg.missingVars,
    });
  });

  // Backend-only Nexconn access token issuance (/v4/auth/access-token/issue)
  // Note: Hackathon MVP protects this endpoint via roster allowlist + IP rate limiting;
  // production deployments should gate this behind authenticated user sessions/JWTs.
  app.post('/api/nexconn/token', tokenRateLimiter, async (req, res) => {
    const cfg = getNexconnServerConfig();
    if (!cfg.backendAppKey || !cfg.backendAppSecret) {
      return res.status(503).json({
        error: 'Nexconn server credentials are not configured.',
        missingVars: cfg.missingVars,
      });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }

    const body = req.body as Record<string, unknown>;
    const userCheck = validateSquadUserId(body.userId);
    if (!userCheck.valid) {
      return res.status(userCheck.status).json({ error: userCheck.error });
    }

    const rawName = body.name;
    if (rawName !== undefined && typeof rawName !== 'string') {
      return res.status(400).json({ error: 'name must be a string when provided.' });
    }
    const safeName =
      typeof rawName === 'string' && rawName.trim()
        ? rawName.trim().slice(0, 64)
        : userCheck.userId;

    const avatarUrl = body.avatarUrl;
    if (avatarUrl !== undefined && typeof avatarUrl !== 'string') {
      return res.status(400).json({ error: 'avatarUrl must be a string when provided.' });
    }

    try {
      const payload: Record<string, string> = {
        userId: userCheck.userId,
        name: safeName,
      };
      if (typeof avatarUrl === 'string' && /^https?:\/\//i.test(avatarUrl.trim())) {
        payload.avatarUrl = avatarUrl.trim().slice(0, 1024);
      }

      const response = await fetch(`${cfg.apiBaseUrl}/v4/auth/access-token/issue`, {
        method: 'POST',
        headers: buildSignedNexconnHeaders(cfg.backendAppKey, cfg.backendAppSecret),
        body: JSON.stringify(payload),
      });

      const data = await parseUpstreamJson(response);
      const result = data.result as { userId?: string; accessToken?: string } | undefined;

      if (!response.ok || data.code !== 0 || !result?.accessToken) {
        return res.status(response.ok ? 502 : response.status).json({
          error:
            (typeof data.msg === 'string' && data.msg) ||
            'Nexconn token issuance failed.',
          nexconnCode: data.code,
          apiBaseUrl: cfg.apiBaseUrl,
        });
      }

      return res.json({
        userId: result.userId || payload.userId,
        accessToken: result.accessToken,
        channelId: cfg.squadChannelId,
        areaCode: cfg.areaCode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error calling Nexconn API.';
      return res.status(502).json({ error: message, apiBaseUrl: cfg.apiBaseUrl });
    }
  });

  // Ensures the SQUADSHIELD group channel exists and contains the active squad members
  app.post('/api/nexconn/squad/ensure', ensureRateLimiter, async (req, res) => {
    const cfg = getNexconnServerConfig();
    if (!cfg.backendAppKey || !cfg.backendAppSecret) {
      return res.status(503).json({
        error: 'Nexconn server credentials are not configured.',
        missingVars: cfg.missingVars,
      });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }

    const body = req.body as Record<string, unknown>;
    const requestedChannelId = body.channelId;
    if (requestedChannelId !== undefined) {
      if (
        typeof requestedChannelId !== 'string' ||
        !SAFE_CHANNEL_ID_PATTERN.test(requestedChannelId.trim()) ||
        requestedChannelId.trim() !== cfg.squadChannelId
      ) {
        return res.status(400).json({
          error: `Invalid channelId. Expected active squad channel "${cfg.squadChannelId}".`,
        });
      }
    }
    const targetChannelId = cfg.squadChannelId;

    const ownerCheck = validateSquadUserId(body.ownerId ?? 'player_kael');
    if (!ownerCheck.valid) {
      return res.status(ownerCheck.status).json({ error: `Invalid ownerId: ${ownerCheck.error}` });
    }

    if (body.memberIds !== undefined && !Array.isArray(body.memberIds)) {
      return res.status(400).json({ error: 'memberIds must be an array of user IDs.' });
    }

    const rawMemberIds = Array.isArray(body.memberIds) ? body.memberIds : [ownerCheck.userId];
    if (rawMemberIds.length === 0 || rawMemberIds.length > 10) {
      return res.status(400).json({ error: 'memberIds must contain between 1 and 10 users.' });
    }

    const safeMemberIds: string[] = [];
    for (const memberId of rawMemberIds) {
      const check = validateSquadUserId(memberId);
      if (!check.valid) {
        return res.status(check.status).json({ error: `Invalid memberId: ${check.error}` });
      }
      if (!safeMemberIds.includes(check.userId)) {
        safeMemberIds.push(check.userId);
      }
    }

    const rawChannelName = body.channelName;
    if (rawChannelName !== undefined && typeof rawChannelName !== 'string') {
      return res.status(400).json({ error: 'channelName must be a string.' });
    }
    const safeChannelName =
      typeof rawChannelName === 'string' && rawChannelName.trim()
        ? rawChannelName.trim().slice(0, 64)
        : 'Vanguard Echo';

    try {
      const createRes = await fetch(`${cfg.apiBaseUrl}/v4/group-channel/create`, {
        method: 'POST',
        headers: buildSignedNexconnHeaders(cfg.backendAppKey, cfg.backendAppSecret),
        body: JSON.stringify({
          channelId: targetChannelId,
          name: safeChannelName,
          owner: ownerCheck.userId,
          userIds: safeMemberIds,
          permissions: {
            joinPerm: 1,
          },
        }),
      });
      const createData = await parseUpstreamJson(createRes);
      const createCode = typeof createData.code === 'number' ? createData.code : -1;
      // 0 = created, 25409 = group already exists (Nexconn may return HTTP 400 with code 25409)
      if (createCode !== 0 && createCode !== 25409) {
        return res.status(createRes.ok ? 502 : createRes.status).json({
          error:
            (typeof createData.msg === 'string' && createData.msg) ||
            `Nexconn group-channel create failed (code ${createCode}).`,
          channelId: targetChannelId,
          createCode,
        });
      }

      const joinRes = await fetch(`${cfg.apiBaseUrl}/v4/group-channel/join`, {
        method: 'POST',
        headers: buildSignedNexconnHeaders(cfg.backendAppKey, cfg.backendAppSecret),
        body: JSON.stringify({
          channelId: targetChannelId,
          userIds: safeMemberIds,
        }),
      });
      const joinData = await parseUpstreamJson(joinRes);
      const joinCode = typeof joinData.code === 'number' ? joinData.code : -1;
      if (!joinRes.ok || joinCode !== 0) {
        return res.status(joinRes.ok ? 502 : joinRes.status).json({
          error:
            (typeof joinData.msg === 'string' && joinData.msg) ||
            `Nexconn group-channel join failed (code ${joinCode}).`,
          channelId: targetChannelId,
          createCode,
          joinCode,
        });
      }

      return res.json({
        channelId: targetChannelId,
        createCode,
        joinCode,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to ensure Nexconn squad channel.';
      return res.status(502).json({ error: message });
    }
  });

  // Never let unknown /api/* routes fall through to SPA index.html
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const distIndexPath = path.join(distDir, 'index.html');
  const isDevLifecycle =
    process.env.npm_lifecycle_event === 'dev' ||
    process.execArgv.some((arg) => arg.includes('tsx'));
  const useProductionStatic =
    process.env.NODE_ENV === 'production' || (!isDevLifecycle && fs.existsSync(distIndexPath));

  if (!useProductionStatic) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `SQUADSHIELD server listening on http://0.0.0.0:${PORT} (${useProductionStatic ? 'production-static' : 'vite-dev'})`
    );
  });
}

startServer();
