import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { defineConfig, type Plugin } from 'vite';

const execFileAsync = promisify(execFile);

function localPublishMiddlewarePlugin(): Plugin {
  const COOLDOWN_MS = 2 * 60 * 1000;
  let lastPublishAt = 0;

  return {
    name: 'local-publish-api',
    configureServer(server) {
      server.middlewares.use('/api/publish', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Méthode non autorisée.' }));
          return;
        }

        const expectedKey = process.env.PUBLISH_KEY || '';
        const rawHeader = req.headers['x-publish-key'];
        const providedKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader || '';

        if (expectedKey) {
          const a = Buffer.from(providedKey, 'utf8');
          const b = Buffer.from(expectedKey, 'utf8');
          const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
          if (!valid) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Clé de publication invalide.' }));
            return;
          }
        } else if (!providedKey) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Veuillez saisir la clé de publication.' }));
          return;
        }

        const now = Date.now();
        const elapsed = now - lastPublishAt;
        if (lastPublishAt > 0 && elapsed < COOLDOWN_MS) {
          const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Retry-After', String(retryAfterSeconds));
          res.end(
            JSON.stringify({
              error: `Veuillez patienter ${retryAfterSeconds}s avant une nouvelle publication.`,
              retryAfterSeconds,
            })
          );
          return;
        }

        const deployHookUrl = process.env.DEPLOY_HOOK_URL || '';
        try {
          if (deployHookUrl) {
            const hookRes = await fetch(deployHookUrl, { method: 'POST' });
            if (!hookRes.ok) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Échec du webhook (${hookRes.status}).` }));
              return;
            }
          } else {
            // In local development without DEPLOY_HOOK_URL, regenerate public/catalog.json directly
            await execFileAsync('npx', ['tsx', 'scripts/build-catalog.ts'], {
              cwd: process.cwd(),
            });
          }

          lastPublishAt = now;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              message: 'Publication lancée. Visible sur le site dans 1 à 2 minutes.',
              cooldownSeconds: COOLDOWN_MS / 1000,
            })
          );
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Erreur lors de la publication locale.',
            })
          );
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      localPublishMiddlewarePlugin(),
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('node_modules/@firebase/auth') || id.includes('node_modules/firebase/auth')) {
              return 'firebase-auth';
            }
            if (id.includes('node_modules/@firebase/storage') || id.includes('node_modules/firebase/storage')) {
              return 'firebase-storage';
            }
            if (id.includes('node_modules/@firebase/firestore') || id.includes('node_modules/firebase/firestore')) {
              return 'firebase-firestore';
            }
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'firebase-core';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
