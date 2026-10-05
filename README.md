# GymTrack

App pessoal de academia: registra carga de cada série, sugere a próxima carga, mostra GIF de execução e gera rotinas com IA (Gemini).

**Stack:** Vite + React (JS) · Supabase (Postgres + Auth) · Netlify (site + Functions) · Gemini API · ExerciseDB (GIFs)

## Rodar localmente

```bash
npm install
cp .env.example .env        # preencha as chaves
npm install -g netlify-cli  # 1x
npm run dev:netlify         # sobe Vite + a function em http://localhost:8888
```

`npm run dev` também funciona, mas sem a rota `/api/generate-workout` (IA).

## Configurar o Supabase

1. Crie um projeto em supabase.com.
2. SQL Editor → cole e rode `supabase/schema.sql` (uma vez) e depois `supabase/seed.sql`.
3. Authentication → URL Configuration: em **Site URL** coloque a URL do Netlify e em **Redirect URLs** adicione também `http://localhost:8888` e `http://localhost:5173`.
4. Project Settings → API: copie a URL e a chave `anon` para o `.env`.

## Chave do Gemini

Crie em Google AI Studio (aistudio.google.com) → Get API key. Coloque em `GEMINI_API_KEY`.
Se aparecer erro de limite (429), troque `GEMINI_MODEL` para `gemini-3.5-flash-lite`.

## Deploy no Netlify

1. Suba o projeto para o GitHub.
2. Netlify → Add new site → Import from Git → escolha o repositório (build e pasta já vêm do `netlify.toml`).
3. Site configuration → Environment variables: adicione todas as variáveis do `.env.example`.
4. Deploy. Cada `git push` na branch principal publica de novo.

## Estrutura

```
supabase/schema.sql      tabelas + RLS
supabase/seed.sql        30 exercícios + 3 rotinas-modelo
netlify/functions/       generate-workout.js (chama o Gemini)
src/lib/                 supabase, exercisedb, progression, data
src/pages/               Login, Today, Workout, Routines, Progress
```
