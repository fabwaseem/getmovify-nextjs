import { Movie } from "@/types/movie";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import {
  SCRAPER_CONFIG,
  ScrapingError,
  createErrorResponse,
  createHttpClient,
  dedupeMoviesByTitleHighestQuality,
  extractQualityFromText,
  extractSizeFromText,
  fetchMovieDetails,
  getRandomUserAgent,
  processMoviesWithConcurrency,
  sanitizeText,
  validateUrl,
  withRetry
} from "../../../utils/scraper";

const BASE_URL = "https://skymovieshd.blue";

// Parse popular movie element from homepage
const parsePopularMovieElement = (
  element: any,
  $: cheerio.CheerioAPI
): Movie | null => {
  try {
    const $element = $(element);
    const $link = $element.find("a");

    if ($link.length === 0) {
      return null;
    }

    const href = $link.attr("href");
    const rawTitle = $link.text();

    if (!href || !rawTitle) {
      return null;
    }

    const title = sanitizeText(rawTitle);
    if (!title || title.length < 2) {
      return null;
    }

    const fullLink = href.startsWith("http") ? href : `${BASE_URL}/${href}`;

    if (!validateUrl(fullLink)) {
      console.warn(`Invalid URL generated: ${fullLink}`);
      return null;
    }

    // Extract metadata from title and URL
    const quality = extractQualityFromText(title + " " + fullLink);
    const size = extractSizeFromText(title + " " + fullLink);

    return {
      title,
      link: fullLink,
      ...(quality && { quality }),
      ...(size && { size }),
    };
  } catch (error) {
    console.warn("Error parsing popular movie element:", error);
    return null;
  }
};

// Parse latest movie element from homepage
const parseLatestMovieElement = (
  element: any,
  $: cheerio.CheerioAPI
): Movie | null => {
  try {
    const $element = $(element);
    const $link = $element.find("a");

    if ($link.length === 0) {
      return null;
    }

    const href = $link.attr("href");
    const rawTitle = $link.text();

    if (!href || !rawTitle) {
      return null;
    }

    const title = sanitizeText(rawTitle);
    if (!title || title.length < 2) {
      return null;
    }

    // Handle relative URLs for latest movies
    const fullLink = href.startsWith("http")
      ? href
      : href.startsWith("/")
      ? `${BASE_URL}${href}`
      : `${BASE_URL}/${href}`;

    if (!validateUrl(fullLink)) {
      console.warn(`Invalid URL generated: ${fullLink}`);
      return null;
    }

    // Extract metadata from title and URL
    const quality = extractQualityFromText(title + " " + fullLink);
    const size = extractSizeFromText(title + " " + fullLink);

    return {
      title,
      link: fullLink,
      ...(quality && { quality }),
      ...(size && { size }),
    };
  } catch (error) {
    console.warn("Error parsing latest movie element:", error);
    return null;
  }
};

// Scrape popular movies from homepage
const scrapePopularMovies = async (): Promise<Movie[]> => {
  const client = createHttpClient();

  const response = await client.get(BASE_URL, {
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

  // Find all popular movie divs with class "Let"
  const popularElements = $('div.Let[align="left"]').toArray();

  console.info(`Found ${popularElements.length} popular movie elements`);

  // Process movies in parallel
  const moviePromises = popularElements.map((element) =>
    parsePopularMovieElement(element, $)
  );
  const movieResults = await Promise.allSettled(moviePromises);

  movieResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      movies.push(result.value);
    } else if (result.status === "rejected") {
      console.warn(
        `Failed to process popular movie at index ${index}:`,
        result.reason
      );
    }
  });

  return movies;
};

// Scrape latest movies from homepage
const scrapeLatestMovies = async (): Promise<Movie[]> => {
  const client = createHttpClient();

  const response = await client.get(BASE_URL, {
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

  // Find all latest movie divs with class "Fmvideo"
  const latestElements = $('div.Fmvideo[align="left"]').toArray();

  console.info(`Found ${latestElements.length} latest movie elements`);

  // Process movies in parallel
  const moviePromises = latestElements.map((element) =>
    parseLatestMovieElement(element, $)
  );
  const movieResults = await Promise.allSettled(moviePromises);

  movieResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      movies.push(result.value);
    } else if (result.status === "rejected") {
      console.warn(
        `Failed to process latest movie at index ${index}:`,
        result.reason
      );
    }
  });

  return movies;
};

// Enhanced movie details fetcher using utility functions
const fetchMovieDetailsWithConcurrency = async (
  movies: Movie[],
  type: string
): Promise<Movie[]> => {
  const concurrencyLimit = Math.min(
    SCRAPER_CONFIG.maxConcurrent,
    movies.length
  );

  console.info(
    `Fetching details for ${movies.length} ${type} movies with concurrency limit of ${concurrencyLimit}`
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
        console.warn(
          `Failed to fetch details for ${type} movie ${movie.title}:`,
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

  try {
    // Input validation
    const searchParams = request.nextUrl.searchParams;
    const includeDetails = searchParams.get("details") !== "false"; // Default to true
    const type = searchParams.get("type"); // "popular", "latest", or both (default)

    console.info(
      `Starting homepage scrape (details: ${includeDetails}, type: ${
        type || "both"
      })`
    );

    let popularMovies: Movie[] = [];
    let latestMovies: Movie[] = [];

    // Scrape based on type parameter
    if (!type || type === "both" || type === "popular") {
      console.info("Scraping popular movies...");
      popularMovies = await withRetry(() => scrapePopularMovies());
    }

    if (!type || type === "both" || type === "latest") {
      console.info("Scraping latest movies...");
      latestMovies = await withRetry(() => scrapeLatestMovies());
    }

    let enrichedPopularMovies = popularMovies;
    let enrichedLatestMovies = latestMovies;

    // Fetch details for all movies if requested
    if (includeDetails) {
      if (popularMovies.length > 0) {
        console.info(
          `Fetching details for ${popularMovies.length} popular movies...`
        );
        enrichedPopularMovies = await fetchMovieDetailsWithConcurrency(
          popularMovies,
          "popular"
        );
      }

      if (latestMovies.length > 0) {
        console.info(
          `Fetching details for ${latestMovies.length} latest movies...`
        );
        enrichedLatestMovies = await fetchMovieDetailsWithConcurrency(
          latestMovies,
          "latest"
        );
      }
    }

    // Deduplicate by title, keep highest quality
    enrichedPopularMovies = dedupeMoviesByTitleHighestQuality(
      enrichedPopularMovies
    );
    enrichedLatestMovies =
      dedupeMoviesByTitleHighestQuality(enrichedLatestMovies);

    const processingTime = Date.now() - startTime;
    const totalMovies =
      enrichedPopularMovies.length + enrichedLatestMovies.length;

    console.info(
      `Homepage scrape completed in ${processingTime}ms, found ${totalMovies} movies (${
        enrichedPopularMovies.length
      } popular, ${enrichedLatestMovies.length} latest)${
        includeDetails ? " with details" : ""
      }`
    );

    const result = {
      popular: enrichedPopularMovies,
      latest: enrichedLatestMovies,
      total: totalMovies,
      popularCount: enrichedPopularMovies.length,
      latestCount: enrichedLatestMovies.length,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": includeDetails
          ? "public, max-age=600, stale-while-revalidate=1200" // 10 min cache for detailed results
          : "public, max-age=300, stale-while-revalidate=600", // 5 min cache for basic results
        "X-Processing-Time": processingTime.toString(),
        "X-Popular-Movies": enrichedPopularMovies.length.toString(),
        "X-Latest-Movies": enrichedLatestMovies.length.toString(),
        "X-Total-Movies": totalMovies.toString(),
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
