# LineupBase - Next.js + shadcn/ui

European electronic music festival intelligence for artists, events, schedule planning, and monetization. Amsterdam Dance Event is the current featured festival source.

## 🌟 Features

### Core Features
- 🎯 **Featured Festival Scraper** - Fetch artists and events from the current featured festival source
- 📊 **Real-time Progress Tracking** - Beautiful animated progress UI
- 💾 **Supabase Integration** - Store and manage artists in PostgreSQL
- 🔄 **Smart Sync** - Detect new artists and update existing ones
- 📈 **Statistics Dashboard** - View total artists, countries, and trends
- 🎨 **Custom Dark Theme** - Beautiful TweakCN dark theme
- 🔍 **Search & Filter** - Find artists quickly
- 📅 **Sync History** - Track all sync operations
- ⚡ **Pagination Support** - Efficiently handle large datasets

### Technical Stack
- ⚡ **Next.js 15** with App Router
- 🎨 **shadcn/ui** component library
- 🌙 **Dark Mode Only** with custom TweakCN theme
- 💅 **Tailwind CSS** for styling
- 📦 **TypeScript** for type safety
- 🗄️ **Supabase** for database
- 🎭 **Framer Motion** for animations
- 📊 **Recharts** for data visualization

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
```bash
git clone [your-repo-url]
cd ade
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**

   a. Create a new Supabase project at [supabase.com](https://supabase.com)
   
   b. Go to SQL Editor in your Supabase dashboard
   
   c. Run the SQL schema from `supabase/schema.sql`
   
   d. Get your project credentials:
      - Go to Settings → API
      - Copy your Project URL and anon public key

4. **Configure environment variables**

   Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open the application**
   - Homepage: [http://localhost:3000](http://localhost:3000)
   - Featured Festival Scraper: [http://localhost:3000/scraper](http://localhost:3000/scraper)

## 📱 Using the Featured Festival Scraper

### First Time Setup
1. Navigate to `/scraper`
2. Click "Start Sync" to begin fetching artists
3. Watch the beautiful progress tracking in real-time
4. View fetched artists in the Artists tab

### Features Overview

#### Sync Controls
- **Custom Date Range**: Specify which festival dates to scrape
- **Daily Auto Sync**: Enable automatic daily synchronization (requires deployment)
- **Real-time Progress**: See pages being fetched and processed
- **Statistics**: View total artists, new additions, and countries

#### Progress Tracking
- Live page counter
- Items fetched, new, and updated counts
- Current batch preview
- Status indicators with animations

#### Artist Database
- Search artists by name
- View artist details and countries
- See when each artist was first discovered
- Direct links to source festival profiles

#### Sync History
- Track all sync operations
- See success/failure status
- View items fetched and added
- Error reporting

## 🗄️ Database Schema

The application uses the following main tables:

- **artists** - Stores all artist information
- **sync_history** - Tracks sync operations
- **artist_changes** - Logs all changes to artists
- **events** - For future event storage
- **artist_events** - Links artists to events

## 🛠️ Development

### Project Structure
```
/app
  /scraper        - Featured festival scraper dashboard
  page.tsx        - Homepage with theme showcase
/components
  /ui             - shadcn/ui components
  sync-progress-card.tsx
  statistics-card.tsx
  artist-list.tsx
  sync-history.tsx
/lib
  ade-api.ts      - Featured festival source API integration
  db-service.ts   - Database operations
  supabase.ts     - Supabase client
  types.ts        - TypeScript definitions
/hooks
  use-ade-sync.ts - Sync logic hook
/supabase
  schema.sql      - Database schema
```

### Adding New Features

To add more shadcn/ui components:
```bash
npx shadcn@latest add [component-name]
```

### API Endpoints

The current featured festival scraper uses the Amsterdam Dance Event source API:
- Base URL: `https://www.amsterdam-dance-event.nl/api`
- Artists endpoint: `/program/filter/`
- Parameters: `section=persons`, `type=8262,8263`, date range, page

## 🚢 Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Daily Sync Setup
For production, consider:
- Vercel Cron Jobs
- GitHub Actions
- External cron service
- Supabase Edge Functions

## 💰 Monetization Modules

The project includes optional monetization modules that run on the existing Next.js + Supabase stack, with Stripe Checkout for the fastest one-time offers:

- **Sponsored placements** (home/schedule/artists/spotify-events) with impression/click tracking
- **Pro API access** with `x-api-key`, plan quotas, and rate headers
- **Premium data packs** via access-code unlocked report generation/download
- **White-label embeds** at `/embed/lineup`, `/embed/artists`, `/embed/genres` with domain validation
- **Concierge plans** with intake, itinerary pipeline, share links, JSON/ICS downloads
- **Stripe Checkout** for featured sponsor week, premium data export, and curated concierge purchases

### Setup

1. Run `supabase/monetization-schema.sql` in Supabase SQL Editor.
2. Set payment environment variables:
   - `STRIPE_SECRET_KEY` with a Stripe secret key (`sk_test_...` for test checkout, `sk_live_...` for real production charges)
   - `NEXT_PUBLIC_APP_URL` with the deployed app URL, for example `https://ade-eta.vercel.app`
3. (Optional) Generate keys/codes using:
   - `node scripts/generate-monetization-secret.mjs --type api-key --name \"Client A\" --plan starter`
   - `node scripts/generate-monetization-secret.mjs --type access-code --entitlement REPORT_BASIC --max-uses 3`
   - `node scripts/generate-monetization-secret.mjs --type widget-key --name \"Partner\" --plan basic`
4. Keep `ENABLE_MONETIZATION` / `NEXT_PUBLIC_ENABLE_MONETIZATION` set to default (`true`) to enforce paid entitlements.

## 🔒 Security Notes

- The application uses Supabase Row Level Security (RLS)
- API calls include browser headers to avoid blocking
- Rate limiting is implemented (500ms between requests)
- Database credentials are kept in environment variables

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [TweakCN Themes](https://tweakcn.com)
- [Amsterdam Dance Event](https://www.amsterdam-dance-event.nl)
