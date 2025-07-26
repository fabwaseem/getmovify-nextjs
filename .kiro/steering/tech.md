# Tech Stack

## Frontend Framework

- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Plus Jakarta Sans** font from Google Fonts

## State Management & Data Fetching

- **TanStack Query (React Query)** for server state management
- **React Query DevTools** for development
- **Axios** for HTTP requests
- **use-debounce** for search input optimization

## UI Components & Libraries

- **Lucide React** for icons
- **React Intersection Observer** for infinite scroll
- **React Slick** and **Slick Carousel** for carousels
- **Swiper** for touch sliders

## Development Tools

- **TypeScript 5** for type safety
- **ESLint** with Next.js config
- **PostCSS** for CSS processing

## Data Sources

- **Cheerio** for web scraping
- Custom scraping utilities with retry logic and rate limiting

## Common Commands

### Development

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Package Management

```bash
npm install          # Install dependencies
npm ci              # Clean install (CI/CD)
```

## Configuration Notes

- Uses absolute imports with `@/*` path mapping
- Images configured to allow all remote patterns
- Turbopack enabled for faster development builds
- Strict TypeScript configuration with ES2017 target
