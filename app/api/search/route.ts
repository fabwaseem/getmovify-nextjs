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
  getRandomUserAgent,
  parseMovieElement,
  processMoviesWithConcurrency,
  withRetry,
} from "../../../utils/scraper";
import { fetchMovieDetailsSkyBap } from "@/utils/skybap";
import { fetchMovieDetailsFilmyWap } from "@/utils/filmywap";
import { FILMY_WAP_URL, getskyBapUrl } from "@/config";

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
    // Try alternative selectors
    const altElements = $(
      ".movie-item, .search-result, .movie-list-item"
    ).toArray();
    if (altElements.length > 0) {
      console.info(
        `[SkyBap] Found ${altElements.length} movies with alternative selector`
      );
      movieElements.push(...altElements);
    }
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

// Search function for FilmyWap
const searchMoviesFilmyWap = async (
  query: string,
  baseUrl: string
): Promise<Movie[]> => {
  const client = createHttpClient();

  const searchUrl = `${baseUrl}/mobile/search?find=${encodeURIComponent(
    query
  )}&per_page=1`;

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

  // Find parent movie div with class "menu_list"
  const movieElements = $("div.menu_list").toArray();
  if (movieElements.length === 0) {
    console.warn(
      "[FilmyWap] No movie elements found with selector div.menu_list"
    );
    return movies;
  }

  console.info(`[FilmyWap] Found ${movieElements.length} movies`);

  // Process each movie element
  movieElements.forEach((element) => {
    try {
      const $element = $(element);
      const $link = $element.find("a");
      console.log($link.html());
      const href = $link.attr("href");
      const title = $link.find("b").text().trim();
      if (title === "Latest HD Hindi Movies Download at High Speed @Filmywap") {
        // skip this element
        return;
      }
      const qualityMatch = title.match(/\[(.*?)\]/);
      const quality = qualityMatch ? qualityMatch[1] : undefined;

      if (href && title) {
        const fullLink = href.startsWith("http") ? href : `${baseUrl}/${href}`;
        movies.push({
          title: title.replace(/\[.*?\]/, "").trim(),
          link: fullLink,
          ...(quality && { quality }),
        });
      }
    } catch (error) {
      console.warn("[FilmyWap] Error processing movie element:", error);
    }
  });

  return movies;
};

// Enhanced movie details fetcher using utility functions
const fetchMovieDetailsWithConcurrency = async (
  movies: Movie[],
  baseUrl: string,
  source: "skybap" | "filmywap"
): Promise<Movie[]> => {
  const concurrencyLimit = Math.min(
    SCRAPER_CONFIG.maxConcurrent,
    movies.length
  );

  console.info(
    `[${source}] Fetching details for ${movies.length} movies with concurrency limit of ${concurrencyLimit}`
  );

  const fetchDetails =
    source === "skybap" ? fetchMovieDetailsSkyBap : fetchMovieDetailsFilmyWap;

  return await processMoviesWithConcurrency(
    movies,
    async (movie: Movie) => {
      try {
        const details = await withRetry(() =>
          fetchDetails(movie.link, baseUrl)
        );

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
        console.warn(
          `[${source}] Failed to fetch details for ${movie.title}:`,
          error
        );
        // Return movie without details if fetching fails
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
      `[API] Starting search for: "${sanitizedQuery}" (details: ${includeDetails})`
    );

    // Perform search from both sources
    const [skybapMovies, filmywapMovies] = await Promise.all([
      withRetry(() => searchMoviesSkyBap(sanitizedQuery, SKYBAP_URL)),
      withRetry(() => searchMoviesFilmyWap(sanitizedQuery, FILMY_WAP_URL)),
    ]);

    let enrichedMovies = [...skybapMovies, ...filmywapMovies];

    // Fetch details for all movies if requested
    if (includeDetails && enrichedMovies.length > 0) {
      console.info(
        `[API] Fetching details for ${enrichedMovies.length} movies...`
      );

      // Process SkyBap movies
      if (skybapMovies.length > 0) {
        const enrichedSkybapMovies = await fetchMovieDetailsWithConcurrency(
          skybapMovies,
          SKYBAP_URL,
          "skybap"
        );
        enrichedMovies = enrichedMovies.filter(
          (m) => !skybapMovies.includes(m)
        );
        enrichedMovies.push(...enrichedSkybapMovies);
      }

      // Process FilmyWap movies
      if (filmywapMovies.length > 0) {
        const enrichedFilmywapMovies = await fetchMovieDetailsWithConcurrency(
          filmywapMovies,
          FILMY_WAP_URL,
          "filmywap"
        );
        enrichedMovies = enrichedMovies.filter(
          (m) => !filmywapMovies.includes(m)
        );
        enrichedMovies.push(...enrichedFilmywapMovies);
      }
    }

    // Deduplicate by title, keep highest quality
    enrichedMovies = dedupeMoviesByTitleHighestQuality(enrichedMovies);

    const processingTime = Date.now() - startTime;
    console.info(
      `[API] Search completed in ${processingTime}ms, found ${
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
