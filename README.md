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

## Discord API bridge

The Discord routes are separate:

- `POST /api/discord` receives signed Discord interactions. Register a `/link` slash command to let a member start account linking; the command replies ephemerally with a short-lived OAuth link.
- `GET /api/discord/callback` exchanges the OAuth code, verifies the member identity against one-time `state`, and stores the link in Supabase. OAuth tokens are encrypted before storage and are never returned to the browser. The callback optionally notifies `DISCORD_OAUTH_FORWARD_URL` with link metadata, not tokens. Set `DISCORD_REDIRECT_URI` to the exact callback URL registered in Discord, without a trailing slash.
- `POST /api/discord/webhook` receives authenticated integration events and forwards them to `DISCORD_WEBHOOK_FORWARD_URL`. Set `DISCORD_WEBHOOK_SECRET`; callers must send it as a Bearer token.

Configure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI` for OAuth. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `OAUTH_TOKEN_ENCRYPTION_KEY` in server-only environment settings. `SUPABASE_SERVICE_ROLE_KEY` is accepted as a legacy fallback. Generate the encryption key with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Apply [`supabase/migrations/20261103000000_account_linking.sql`](./supabase/migrations/20261103000000_account_linking.sql) to the Supabase project before using `/link`. Keep the secret and encryption keys out of `NEXT_PUBLIC_*` variables. Tokens are encrypted in the database with AES-256-GCM. The generic provider-link table is ready for future Twitch OAuth, but Twitch authorization is not implemented yet.

Forwarding URLs fall back to `DISCORD_FORWARD_URL`, then `CALLBACK_FORWARD_URL`. Configure trusted HTTPS destinations.

Webhook requests use this versioned envelope; `source` can identify Discord, Twitch, or another integration, and `sessionId`/`state` can correlate related events without local session storage:

```json
{
  "version": 1,
  "source": "discord",
  "event": "chat.message",
  "state": "optional-oauth-correlation-value",
  "sessionId": "optional-session-id",
  "data": {
    "content": "Hello"
  }
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
