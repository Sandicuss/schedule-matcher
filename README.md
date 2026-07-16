# Schedule Matcher

A small React + Vite app for finding overlapping free time with friends.

Try the live version: https://schedule-matcher-psi.vercel.app/

Create an event, choose exact days or a date range, share the link, and let
everyone paint in their availability. The heatmap and overlap summary make the
best meeting times obvious without accounts, invites, or spreadsheet chaos.

## How it works

Supabase sync is optional. With sync disabled, share links contain the whole
event in the URL hash and the app can be published as a static site without a
database. With sync enabled, events are stored in Supabase through locked-down
RPC functions and each event link carries its own private edit token.

## Run locally

```sh
npm install
npm run dev
```

## Supabase

Copy `.env.example` to `.env.local` only if you want remote sync, then fill in
the project URL and publishable key. Sync turns on automatically when real
Supabase values are present. Set `VITE_ENABLE_SUPABASE_SYNC=false` only when
you want to force local URL-hash mode.

Before enabling sync, run `supabase/schema.sql` in your Supabase SQL editor.
The schema keeps the table private, exposes only limited RPC functions, and
requires each remote event link to include a private edit token. Anyone with the
full event link can edit that event, but someone with only your public
Supabase key cannot overwrite existing events.

For the live Vercel app, keep the Supabase URL and publishable key in Vercel
Project Settings -> Environment Variables, not in Git. After changing those
values or the schema, redeploy Vercel so it rebuilds the client with the latest
configuration.

Never put a Supabase service-role key or other server secret in any `VITE_*`
environment variable. Browser keys are public by design, so use a separate
Supabase project for public demos and keep rate limits/usage alerts enabled.

## Build

```sh
npm run build
```

## Public GitHub check

```sh
npm run security:check
```

The check scans tracked files for obvious Supabase keys, project URLs, and
JWT-like tokens before you push.
