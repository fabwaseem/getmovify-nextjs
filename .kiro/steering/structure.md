# Project Structure

## Directory Organization

```
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints for movie data
│   ├── category/          # Category-specific pages
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page with search and categories
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks for data fetching
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions and scrapers
├── config/                # Configuration files
├── prisma/                # Database schema (if used)
├── scripts/               # Build and utility scripts
└── public/                # Static assets
```

## Key Architectural Patterns

### Component Structure

- **Functional components** with TypeScript interfaces
- **Props interfaces** defined inline or separately
- **Error boundaries** and loading states handled consistently
- **Responsive design** using Tailwind CSS classes

### Data Fetching Pattern

- **React Query** for all server state management
- **Custom hooks** (`useMovies`, `useCategories`) for data fetching
- **Infinite queries** for pagination with intersection observer
- **Debounced search** to optimize API calls

### File Naming Conventions

- **PascalCase** for React components (`MovieCard.tsx`)
- **camelCase** for hooks (`useMovies.ts`)
- **kebab-case** for utility files when appropriate
- **Descriptive names** that indicate purpose

### Import Organization

- **Absolute imports** using `@/` prefix
- **Type imports** separated from value imports
- **Third-party imports** before local imports
- **Grouped imports** by source (React, libraries, local)

### Error Handling

- **Custom error classes** (`ScrapingError`, `ValidationError`)
- **Retry logic** with exponential backoff
- **Graceful degradation** for failed image loads
- **User-friendly error messages**

### Performance Optimizations

- **Infinite scroll** instead of traditional pagination
- **Image lazy loading** and error handling
- **Debounced search** to reduce API calls
- **React Query caching** with appropriate stale times
- **Concurrent request limiting** in scrapers
