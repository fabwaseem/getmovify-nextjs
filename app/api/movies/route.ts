import { getskyBapUrl } from "@/config";
import { Movie } from "@/types/movie";
import {
  SCRAPER_CONFIG,
  ScrapingError,
  ValidationError,
  createErrorResponse,
  createHttpClient,
  dedupeMoviesByTitleHighestQuality,
  getRandomUserAgent,
  parseMovieElement,
  processMoviesWithConcurrency,
  withRetry,
} from "@/utils/scraper";
import {
  fetchMovieDetailsSkyBap,
  scrapeLatestMoviesSkyBap,
  scrapePopularMoviesSkyBap
} from "@/utils/skybap";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

// Search function for SkyBap
const searchMoviesSkyBap = async (
  query: string,
  baseUrl: string
): Promise<Movie[]> => {
  const client = createHttpClient();
  const searchUrl = `${baseUrl}/search.php?search=${encodeURIComponent(query)}&cat=All`;

  const response = await client.get(searchUrl, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Referer: baseUrl,
    },
  });

  if (!response.data || typeof response.data !== "string") {
    throw new ScrapingError("Invalid response format received");
  }

  const $ = cheerio.load(response.data);
  const movies: Movie[] = [];

  // Find all movie divs with class "L"
  const movieElements = $('div.L[align="left"]').toArray();

  if (movieElements.length === 0) {
    console.warn('[SkyBap] No movie elements found with selector div.L[align="left"]');
  }

  // Process movies in parallel with concurrency limit
  const moviePromises = movieElements.map((element) =>
    parseMovieElement(element, $, baseUrl)
  );
  const movieResults = await Promise.allSettled(moviePromises);

  movieResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      movies.push(result.value);
    } else if (result.status === "rejected") {
      console.warn(`[SkyBap] Failed to process movie at index ${index}:`, result.reason);
    }
  });

  return movies;
};

// Enhanced movie details fetcher using utility functions
const fetchMovieDetailsWithConcurrency = async (
  movies: Movie[],
  baseUrl: string
): Promise<Movie[]> => {
  const concurrencyLimit = Math.min(SCRAPER_CONFIG.maxConcurrent, movies.length);

  console.info(
    `Fetching details for ${movies.length} movies with concurrency limit of ${concurrencyLimit}`
  );

  return await processMoviesWithConcurrency(
    movies,
    async (movie: Movie) => {
      try {
        const details = await withRetry(() =>
          fetchMovieDetailsSkyBap?.(movie.link, baseUrl)
        );

        return {
          ...movie,
          thumbnail: details.thumbnail,
          downloadLinks: details.downloadLinks,
          ...(details.title && details.title !== movie.title && { title: details.title }),
          ...(details.genre && { genre: details.genre }),
          ...(details.size && { size: details.size }),
          ...(details.language && { language: details.language }),
          ...(details.quality && !movie.quality && { quality: details.quality }),
          ...(details.format && { format: details.format }),
          ...(details.releaseDate && { releaseDate: details.releaseDate }),
          ...(details.stars && { stars: details.stars }),
          ...(details.story && { story: details.story }),
          ...(details.images && { images: details.images }),
        };
      } catch (error) {
        console.warn(`Failed to fetch details for ${movie.title}:`, error);
        return movie;
      }
    },
    concurrencyLimit
  );
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const SKYBAP_URL = await getskyBapUrl();

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const page = Number(searchParams.get("page")) || 1;
    const includeDetails = searchParams.get("details") !== "false";

    console.info(
      `[API] Request: search="${search}", page=${page}, details=${includeDetails}`
    );

    let movies: Movie[] = [];
    let hasMore = false;

    // Handle search requests
    if (search) {
      if (search.length < 2) {
        throw new ValidationError("Search query must be at least 2 characters long");
      }
      if (search.length > 100) {
        throw new ValidationError("Search query is too long (max 100 characters)");
      }

      const sanitizedQuery = search.trim().replace(/[<>]/g, "");
      console.info(`[API] Searching for: "${sanitizedQuery}"`);

      const searchResults = await withRetry(() =>
        searchMoviesSkyBap(sanitizedQuery, SKYBAP_URL)
      );

      movies = searchResults.slice(0, 10);

      // Check if there are more pages for search (search typically doesn't have pagination)
      hasMore = false;
    }
    else {
      let popularMovies: Movie[] = [];
      let latestMovies: Movie[] = [];


      console.info("[SkyBap] Scraping popular movies...");
      popularMovies = await withRetry(() =>
        scrapePopularMoviesSkyBap(SKYBAP_URL)
      );

      console.info("[SkyBap] Scraping latest movies...");
      latestMovies = await withRetry(() =>
        scrapeLatestMoviesSkyBap(SKYBAP_URL)
      );
      movies = [...popularMovies, ...latestMovies];
      hasMore = false; // Homepage doesn't have pagination
    }

    movies = movies.filter(
      (movie) =>
        !movie.title.includes("unrated") &&
        !movie.title.includes("18+") &&
        !movie.title.includes("UNRATED")
    );

    // Fetch details if requested and not already fetched
    if (includeDetails && movies.length > 0) {
      console.info(`[API] Fetching details for ${movies.length} movies...`);
      movies = await fetchMovieDetailsWithConcurrency(movies, SKYBAP_URL);
    }

    // Deduplicate by title, keep highest quality
    movies = dedupeMoviesByTitleHighestQuality(movies);

    const processingTime = Date.now() - startTime;
    console.info(
      `[API] Request completed in ${processingTime}ms, found ${movies.length} movies${includeDetails ? " with details" : ""
      }`
    );

    const result = {
      movies,
      total: movies.length,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": includeDetails
          ? "public, max-age=600, stale-while-revalidate=1200"
          : "public, max-age=300, stale-while-revalidate=600",
        "X-Processing-Time": processingTime.toString(),
        "X-Movies-Found": movies.length.toString(),
        "X-Details-Included": includeDetails.toString(),
        "X-Has-More": hasMore.toString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorResponse = createErrorResponse(error, processingTime);

    return NextResponse.json(errorResponse.json, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
}