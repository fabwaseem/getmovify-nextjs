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
  scrapePopularMoviesSkyBap,
} from "@/utils/skybap";
import {
  get9xMovieDetails,
  search9xMovies,
  get9xLatestMovies,
} from "@/utils/nineXMovieScraper";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

// Search function for SkyBap
const searchMoviesSkyBap = async (
  query: string,
  baseUrl: string
): Promise<Movie[]> => {
  const client = createHttpClient();
  const searchUrl = `${baseUrl}/search.php?search=${encodeURIComponent(
    query
  )}&cat=All`;

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
    console.warn(
      '[SkyBap] No movie elements found with selector div.L[align="left"]'
    );
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
      console.warn(
        `[SkyBap] Failed to process movie at index ${index}:`,
        result.reason
      );
    }
  });

  return movies;
};

// Enhanced movie details fetcher for SkyBap
const fetchSkyBapDetailsWithConcurrency = async (
  movies: Movie[],
  baseUrl: string
): Promise<Movie[]> => {
  const concurrencyLimit = Math.min(
    SCRAPER_CONFIG.maxConcurrent,
    movies.length
  );

  console.info(
    `[SkyBap] Fetching details for ${movies.length} movies with concurrency limit of ${concurrencyLimit}`
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
          ...(details.title &&
            details.title !== movie.title && { title: details.title }),
          ...(details.genre && { genre: details.genre }),
          ...(details.size && { size: details.size }),
          ...(details.language && { language: details.language }),
          ...(details.quality &&
            !movie.quality && { quality: details.quality }),
          ...(details.format && { format: details.format }),
          ...(details.releaseDate && { releaseDate: details.releaseDate }),
          ...(details.stars && { stars: details.stars }),
          ...(details.story && { story: details.story }),
          ...(details.images && { images: details.images }),
        };
      } catch (error) {
        console.warn(
          `[SkyBap] Failed to fetch details for ${movie.title}:`,
          error
        );
        return movie;
      }
    },
    concurrencyLimit
  );
};

// Enhanced movie details fetcher for 9xMoviie
const fetch9xMovieDetailsWithConcurrency = async (
  movies: Movie[]
): Promise<Movie[]> => {
  const concurrencyLimit = Math.min(
    SCRAPER_CONFIG.maxConcurrent,
    movies.length
  );

  console.info(
    `[9xMoviie] Fetching details for ${movies.length} movies with concurrency limit of ${concurrencyLimit}`
  );

  return await processMoviesWithConcurrency(
    movies,
    async (movie: Movie) => {
      try {
        const details = await withRetry(() => get9xMovieDetails(movie.link));

        if (!details) {
          console.warn(`[9xMoviie] No details found for ${movie.title}`);
          return movie;
        }

        return {
          ...movie,
          ...details,
        };
      } catch (error) {
        console.warn(
          `[9xMoviie] Failed to fetch details for ${movie.title}:`,
          error
        );
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
        throw new ValidationError(
          "Search query must be at least 2 characters long"
        );
      }
      if (search.length > 100) {
        throw new ValidationError(
          "Search query is too long (max 100 characters)"
        );
      }

      const sanitizedQuery = search.trim().replace(/[<>]/g, "");
      console.info(`[API] Searching for: "${sanitizedQuery}"`);

      // Search from all sources
      const searchPromises: Promise<Movie[]>[] = [
        withRetry(() => search9xMovies(sanitizedQuery)),
        withRetry(() => searchMoviesSkyBap(sanitizedQuery, SKYBAP_URL)),
      ];

      const searchResults = await Promise.allSettled(searchPromises);

      searchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          movies.push(...result.value);
        } else {
          const sourceName = index === 0 ? "SkyBap" : "9xMoviie";
          console.warn(`[${sourceName}] Search failed:`, result.reason);
        }
      });

      movies = movies.slice(0, 20); // Limit search results
      hasMore = false; // Search typically doesn't have pagination
    } else {
      // Get latest movies from sources
      const moviePromises: Promise<Movie[]>[] = [];

      // Only call SkyBap on page 1 since it doesn't support pagination
      if (page === 1) {
        console.info("[SkyBap] Scraping popular and latest movies...");
        moviePromises.push(
          withRetry(() => scrapePopularMoviesSkyBap(SKYBAP_URL)),
          withRetry(() => scrapeLatestMoviesSkyBap(SKYBAP_URL))
        );
      }

      // Always call 9xMoviie as it supports pagination
      console.info(`[9xMoviie] Scraping latest movies (page ${page})...`);
      moviePromises.push(
        withRetry(async () => {
          const result = await get9xLatestMovies(page);
          hasMore = result.hasMore; // Set hasMore from 9xMoviie
          return result.movies;
        })
      );

      const movieResults = await Promise.allSettled(moviePromises);

      movieResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          movies.push(...result.value);
        } else {
          console.warn(
            `[Source ${index}] Failed to fetch movies:`,
            result.reason
          );
        }
      });
    }

    // Filter out adult content
    movies = movies.filter(
      (movie) =>
        !movie.title.toLowerCase().includes("unrated") &&
        !movie.title.toLowerCase().includes("18+") &&
        !movie.title.toLowerCase().includes("xxx") &&
        !movie.title.toLowerCase().includes("adult")
    );

    // Fetch details if requested
    if (includeDetails && movies.length > 0) {
      console.info(`[API] Fetching details for ${movies.length} movies...`);

      // Separate movies by source for appropriate detail fetching
      const skyBapMovies = movies.filter(
        (movie) =>
          movie.link.includes("skybap") || movie.link.includes(SKYBAP_URL)
      );
      const nineXMovies = movies.filter((movie) =>
        movie.link.includes("9xmoviie.me")
      );

      const detailPromises: Promise<Movie[]>[] = [];
      if (nineXMovies.length > 0) {
        detailPromises.push(fetch9xMovieDetailsWithConcurrency(nineXMovies));
      }

      if (skyBapMovies.length > 0) {
        detailPromises.push(
          fetchSkyBapDetailsWithConcurrency(skyBapMovies, SKYBAP_URL)
        );
      }

      const detailResults = await Promise.allSettled(detailPromises);
      const detailedMovies: Movie[] = [];

      detailResults.forEach((result) => {
        if (result.status === "fulfilled") {
          detailedMovies.push(...result.value);
        }
      });

      movies = detailedMovies;
    }

    // Deduplicate by title, keep highest quality
    movies = dedupeMoviesByTitleHighestQuality(movies);

    const processingTime = Date.now() - startTime;
    console.info(
      `[API] Request completed in ${processingTime}ms, found ${
        movies.length
      } movies${includeDetails ? " with details" : ""}`
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
        "X-Source": "all",
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
