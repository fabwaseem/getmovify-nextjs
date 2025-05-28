import { Movie, SearchResult } from "@/types/movie";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import {
  SCRAPER_CONFIG,
  ScrapingError,
  ValidationError,
  createErrorResponse,
  createHttpClient,
  dedupeMoviesByTitleHighestQuality,
  fetchMovieDetails,
  getRandomUserAgent,
  parseMovieElement,
  processMoviesWithConcurrency,
  withRetry
} from "../../../utils/scraper";

const BASE_URL = "https://skymovieshd.blue";

// Main search function
const searchMovies = async (query: string): Promise<Movie[]> => {
  const client = createHttpClient();

  const searchUrl = `${BASE_URL}/search.php?search=${encodeURIComponent(
    query
  )}&cat=All`;

  const response = await client.get(searchUrl, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Referer: BASE_URL,
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
    console.warn('No movie elements found with selector div.L[align="left"]');
    // Try alternative selectors
    const altElements = $(
      ".movie-item, .search-result, .movie-list-item"
    ).toArray();
    if (altElements.length > 0) {
      console.info(
        `Found ${altElements.length} movies with alternative selector`
      );
      movieElements.push(...altElements);
    }
  }

  // Process movies in parallel with concurrency limit
  const moviePromises = movieElements.map((element) =>
    parseMovieElement(element, $, BASE_URL)
  );
  const movieResults = await Promise.allSettled(moviePromises);

  movieResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      movies.push(result.value);
    } else if (result.status === "rejected") {
      console.warn(`Failed to process movie at index ${index}:`, result.reason);
    }
  });

  return movies;
};

// Enhanced movie details fetcher using utility functions
const fetchMovieDetailsWithConcurrency = async (
  movies: Movie[]
): Promise<Movie[]> => {
  const concurrencyLimit = Math.min(
    SCRAPER_CONFIG.maxConcurrent,
    movies.length
  );

  console.info(
    `Fetching details for ${movies.length} movies with concurrency limit of ${concurrencyLimit}`
  );

  return await processMoviesWithConcurrency(
    movies,
    async (movie: Movie) => {
      try {
        const details = await withRetry(() => fetchMovieDetails(movie.link));

        return {
          ...movie,
          thumbnail: details.thumbnail,
          downloadLinks: details.downloadLinks,
          // Merge all detailed movie information
          ...(details.title &&
            details.title !== movie.title && { title: details.title }),
          ...(details.genre && { genre: details.genre }),
          ...(details.size && { size: details.size }),
          ...(details.language && { language: details.language }),
          // Prioritize quality from search title over movie page details
          ...(details.quality &&
            !movie.quality && { quality: details.quality }),
          ...(details.format && { format: details.format }),
          ...(details.releaseDate && { releaseDate: details.releaseDate }),
          ...(details.stars && { stars: details.stars }),
          ...(details.story && { story: details.story }),
          ...(details.images && { images: details.images }),
        };
      } catch (error) {
        console.warn(`Failed to fetch details for ${movie.title}:`, error);
        // Return movie without details if fetching fails
        return movie;
      }
    },
    concurrencyLimit
  );
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Input validation
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const includeDetails = searchParams.get("details") !== "false"; // Default to true

    if (!query) {
      return NextResponse.json(
        {
          error: "Search query is required",
          code: "MISSING_QUERY",
        },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      throw new ValidationError(
        "Search query must be at least 2 characters long"
      );
    }

    if (query.length > 100) {
      throw new ValidationError(
        "Search query is too long (max 100 characters)"
      );
    }

    // Sanitize query
    const sanitizedQuery = query.trim().replace(/[<>]/g, "");

    console.info(
      `Starting search for: "${sanitizedQuery}" (details: ${includeDetails})`
    );

    // Perform search with retry logic
    const movies = await withRetry(() => searchMovies(sanitizedQuery));

    let enrichedMovies = movies;

    // Fetch details for all movies if requested
    if (includeDetails && movies.length > 0) {
      console.info(`Fetching details for ${movies.length} movies...`);
      enrichedMovies = await fetchMovieDetailsWithConcurrency(movies);
    }

    // Deduplicate by title, keep highest quality
    enrichedMovies = dedupeMoviesByTitleHighestQuality(enrichedMovies);

    const processingTime = Date.now() - startTime;
    console.info(
      `Search completed in ${processingTime}ms, found ${
        enrichedMovies.length
      } movies${includeDetails ? " with details" : ""}`
    );

    const result: SearchResult = {
      movies: enrichedMovies,
      query: sanitizedQuery,
      total: enrichedMovies.length,
      hasMore: false, // Could be enhanced with pagination
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": includeDetails
          ? "public, max-age=600, stale-while-revalidate=1200" // 10 min cache for detailed results
          : "public, max-age=300, stale-while-revalidate=600", // 5 min cache for basic results
        "X-Processing-Time": processingTime.toString(),
        "X-Movies-Found": enrichedMovies.length.toString(),
        "X-Details-Included": includeDetails.toString(),
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
