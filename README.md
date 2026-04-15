# Verbum — Word for All

Plataforma de estudo biblico com IA.

## Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth, DB, Storage)
- **IA**: OpenAI (estudo biblico contextualizado)
- **Deploy**: Vercel
- **Pagamentos**: Caramelou (BR)

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in your values in .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (server-side only) |

Copy `.env.local.example` to `.env.local` and fill in the values before running the app.

## Deployment

This project deploys automatically to **Vercel** on merge to `main`.

### Vercel Setup

1. Connect the GitHub repository to Vercel
2. Framework preset: **Next.js** (auto-detected via `vercel.json`)
3. Build command: `pnpm build`
4. Add the environment variables listed above in the Vercel dashboard under **Settings > Environment Variables**

### Production URL

[https://verbum.vercel.app](https://verbum.vercel.app)

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Create production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
