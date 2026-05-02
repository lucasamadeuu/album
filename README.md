# Álbum (Next.js + Supabase)

## Desenvolvimento

```bash
npm install
cp .env.example .env
# Preencha NEXT_PUBLIC_SUPABASE_* (e opcionais) e rode as migrações em supabase/
npm run dev
```

## Deploy na Vercel

1. Conecte o repositório em [vercel.com](https://vercel.com/new) — o preset **Next.js** e o comando `npm run build` são detectados automaticamente.
2. Em **Settings → Environment Variables**, adicione (production e, se quiser, preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Opcional: `SUPABASE_SERVICE_ROLE_KEY` (import CSV no app), `APISPORTS_KEY`, `APISPORTS_SEASON`
3. No **Supabase** → Authentication → **URL configuration**:
   - **Site URL**: `https://<seu-projeto>.vercel.app`
   - **Redirect URLs**: inclua `https://<seu-projeto>.vercel.app/auth/callback` (e URLs de preview, ex. `https://*-<team>.vercel.app/auth/callback`, conforme a documentação do Supabase).
4. Faça **Redeploy** após alterar variáveis de ambiente.

Variáveis: ver `.env.example`.
