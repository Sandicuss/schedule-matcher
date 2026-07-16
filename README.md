# Schedule Matcher

This is a small app for finding a time that works for a group.

You create an event, pick the possible days, share the link, and everyone marks
when they are free. The app shows which times overlap the most.

Live app: https://schedule-matcher-psi.vercel.app/

## Tech Stack

- React
- Vite
- Supabase
- Vercel

## Run Locally

```sh
npm install
npm run dev
```

## Supabase

The app can run with or without Supabase.

Without Supabase, the event data is stored in the URL hash. With Supabase, events
are saved remotely through the SQL functions in `supabase/schema.sql`.

To use Supabase locally, copy `.env.example` to `.env.local` and add your project
URL and anon/publishable key.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Never commit `.env.local` or any service-role keys.

## Build

```sh
npm run build
```

## Public Check

Before making changes public, I use:

```sh
npm run security:check
```

It checks the repo for obvious Supabase keys or tokens.
