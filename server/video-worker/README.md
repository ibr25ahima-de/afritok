# AfriTok Premium HD Worker

Worker vidéo séparé pour le traitement Premium HD. Il ne remplace jamais la vidéo originale.

## Déploiement

Déployer ce dossier comme un service Docker séparé avec `server/video-worker/Dockerfile`.

Variables nécessaires :

- `PORT` : port HTTP du worker (Render fournit généralement `PORT` automatiquement).
- `AFRITOK_VIDEO_WORKER_TOKEN` : secret partagé avec le serveur AfriTok.
- `SUPABASE_URL` : URL du projet Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` : clé secrète serveur utilisée uniquement par le worker.
- `DATABASE_URL` : même base PostgreSQL que l'application AfriTok.

Après déploiement, configurer sur le serveur principal :

- `AFRITOK_VIDEO_WORKER_URL=https://<url-du-worker>`
- `AFRITOK_VIDEO_WORKER_TOKEN=<même-secret>`

## Vérification

- `GET /health` doit retourner `{ "ok": true, "service": "afritok-video-worker" }`.
- `POST /process` nécessite `x-afritok-worker-token` et accepte `videoId`, `userId` et `videoUrl`.

Le serveur principal ne doit jamais recevoir `SUPABASE_SERVICE_ROLE_KEY` dans le client. Le worker est le seul composant autorisé à l'utiliser.
