# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.



## Project Overview

Next.js 15.4.5 app with Supabase integration, using App Router, TypeScript, Tailwind CSS v4, and shadcn/ui components.

Sistema de gestão de lançamentos (BS Launch Center) com scoring dinâmico de leads baseado em engajamento via WhatsApp e Email.

## Development Commands

```bash
# Install dependencies
npm install

# Development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 with CSS variables
- **UI Components**: shadcn/ui (New York style)
- **Database**: Supabase (client and server SDKs)
- **State Management**: Zustand, React Query (TanStack Query v5)
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Project Structure
- `/src/app/` - Next.js App Router pages and layouts
- `/src/lib/` - Utility functions and configurations
  - `/supabase/` - Supabase client configurations (browser and server)
- `/src/middleware.ts` - Next.js middleware for Supabase auth session refresh
- `/src/components/` - Reusable React components
- `components.json` - shadcn/ui configuration

### Path Aliases
- `@/*` maps to `./src/*`
- `@/components` - Components directory
- `@/lib` - Library/utilities
- `@/hooks` - Custom React hooks

### Supabase Integration
The project uses Supabase with SSR support. There are separate client configurations:
- `src/lib/supabase/client.ts` - Browser client
- `src/lib/supabase/server.ts` - Server-side client with cookie handling
- Middleware refreshes auth sessions automatically
- Environment variables required: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Note: The middleware expects a `createClient` function in `@/lib/supabase/middleware` which needs to be created.

### Key Dependencies
- **Motion**: Animation library (v12)
- **Sonner**: Toast notifications (integrated in root layout)
- **Recharts**: Data visualization
- **date-fns**: Date utilities
- **class-variance-authority** & **clsx**: For component variants
- **tailwind-merge**: Merge Tailwind classes safely