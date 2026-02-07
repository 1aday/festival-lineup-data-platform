# ADE

Amsterdam Dance Event artist scraper with real-time progress tracking, Spotify enrichment, and statistics dashboard.

## What it does

ADE is a specialized scraping and analytics tool built for the Amsterdam Dance Event. It crawls ADE event listings to build a comprehensive artist database, enriches each artist profile with Spotify data (followers, genres, popularity), and presents everything through an interactive statistics dashboard. Features real-time progress tracking during scrapes and rich data visualizations powered by Recharts with smooth Framer Motion animations.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Supabase** - Backend database and authentication
- **Recharts** - Data visualization and charting
- **Framer Motion** - Smooth animations and transitions

## Getting Started

```bash
git clone https://github.com/1aday/ade.git
cd ade
npm install
npm run dev
```

## Environment Variables

Create a `.env.local` file with the following:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

---
*Built by [@1aday](https://github.com/1aday)*
