import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const COOLDOWN_MS = 2 * 60 * 1000;
let lastPublishAt = 0;

function timingSafeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    // Perform equal-length dummy compare to avoid length timing leak
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Méthode non autorisée.' });
  }

  const expectedKey = process.env.PUBLISH_KEY || '';
  if (!expectedKey) {
    return sendJson(res, 503, {
      error: 'PUBLISH_KEY non configuré sur le serveur.',
    });
  }

  const rawHeader = req.headers['x-publish-key'];
  const providedKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader || '';

  if (!providedKey || !timingSafeMatch(providedKey, expectedKey)) {
    return sendJson(res, 401, {
      error: 'Clé de publication invalide.',
    });
  }

  const now = Date.now();
  const elapsed = now - lastPublishAt;
  if (lastPublishAt > 0 && elapsed < COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return sendJson(res, 429, {
      error: `Veuillez patienter ${retryAfterSeconds}s avant une nouvelle publication.`,
      retryAfterSeconds,
    });
  }

  const deployHookUrl = process.env.DEPLOY_HOOK_URL || '';
  if (!deployHookUrl) {
    return sendJson(res, 503, {
      error: 'DEPLOY_HOOK_URL non configuré sur le serveur.',
    });
  }

  try {
    const hookRes = await fetch(deployHookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!hookRes.ok) {
      return sendJson(res, 502, {
        error: `Échec du déclenchement Vercel (${hookRes.status}).`,
      });
    }

    lastPublishAt = now;
    return sendJson(res, 200, {
      ok: true,
      message: 'Publication lancée. Visible sur le site dans 1 à 2 minutes.',
      cooldownSeconds: COOLDOWN_MS / 1000,
    });
  } catch (err) {
    return sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Erreur interne lors de la publication.',
    });
  }
}
