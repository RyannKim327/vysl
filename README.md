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

## Streaming on Vercel

Publishing uses [WHIP](https://datatracker.ietf.org/doc/rfc9725/) directly from the browser, so no ingest server, WebSocket, or `ffmpeg` process is needed. The whole app runs on Vercel.

1. Create a live input in Cloudflare Stream (or use any RFC 9725 WHIP service) and copy its `webRTC.url` publish URL.
2. Open `/settings`, paste that URL into **WHIP publish URL** (plus a bearer token only if your service requires one), and save. Credentials stay in this browser's localStorage and are only sent to that endpoint when you go live.
3. Start a camera or screen preview in the studio. Publishing starts automatically and stops when the preview ends.

Viewer/chat signaling uses `/ws/chat` on Vercel via `@vercel/functions`. `/ws/local` is only used by the custom Node server for local development.

Cloudflare Stream currently requires WHIP inputs to be played back with WHEP, not HLS/DASH, so this external destination is not a Facebook Live relay. The in-app `/watch/[id]` viewers still receive the host's composited stream directly over WebRTC.
