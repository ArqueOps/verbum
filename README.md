# Verbum — Palavra para Todos

Plataforma de estudo bíblico com IA.

## Stack

- **Frontend**: Next.js 15 + TypeScript + React 19
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (Auth, DB, Storage)
- **IA**: OpenAI (estudo bíblico contextualizado)
- **Deploy**: Vercel

## Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env.local

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript check |
