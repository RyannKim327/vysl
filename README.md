This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Streaming deployment

The Next.js app can be deployed to Vercel, but the RTMP ingest **cannot**. Ingest needs a long-lived WebSocket plus an `ffmpeg` process, which a Vercel serverless function cannot provide. Connect it to the standalone Node ingest server in `ingest/` instead.

1. Deploy the ingest server to a Node host (a `render.yaml` and `Dockerfile` are included for Render). It listens on `PORT` (default `3001`) and serves `ws://<host>:<port>/ws/ingest` plus a `GET /health` check.
2. In Vercel, set `NEXT_PUBLIC_INGEST_WS_URL` to the public ingest URL, for example `wss://vysl-ingest.onrender.com/ws/ingest`, then redeploy. This value is baked into the client at build time.
3. Save the RTMP URL and stream key in the app's Settings. Publishing starts automatically when a preview starts.

Viewer/chat signaling uses `/ws/chat` on Vercel via `@vercel/functions`; `/ws/local` and `/ws/ingest` only exist when running the custom Node server.

### Local development

`npm run dev` runs Next and the ingest server together on port 3000, requiring `ffmpeg` on `PATH`. To run ingest separately:

```bash
npm run ingest
NEXT_PUBLIC_INGEST_WS_URL=ws://localhost:3001/ws/ingest npm run dev
```

Set `FFMPEG_PATH` if `ffmpeg` is not on `PATH`. The stream key is redacted from ingest logs and is only sent to the configured ingest server.
