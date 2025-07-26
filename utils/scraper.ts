import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import { Movie, DownloadLink } from "@/types/movie";

// Configuration for optimized scraping
export const SCRAPER_CONFIG = {
  timeout: 15000, // 15 seconds default timeout
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  maxConcurrent: 100,
  userAgents: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  ],
};

// Custom error classes for better error handling
export class ScrapingError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public originalError?: Error
  ) {
    super(message);
    this.name = "ScrapingError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Utility functions
export const getRandomUserAgent = (): string => {
  return SCRAPER_CONFIG.userAgents[
    Math.floor(Math.random() * SCRAPER_CONFIG.userAgents.length)
  ];
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const sanitizeText = (text: string): string => {
  return text
    .replace(/^.*>\s*/, "") // Remove arrow icon text
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidImageUrl = (url: string): boolean => {
  if (!url || !validateUrl(url)) return false;
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
  return (
    imageExtensions.test(url) ||
    url.includes("image") ||
    url.includes("poster") ||
    url.includes("thumb")
  );
};

// Enhanced HTTP client with retry logic
export const createHttpClient = (customTimeout?: number) => {
  const client = axios.create({
    timeout: customTimeout || SCRAPER_CONFIG.timeout,
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Cache-Control": "max-age=0",
    },
  });

  // Add response interceptor for better error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.code === "ECONNABORTED") {
        throw new ScrapingError(
          "Request timeout - server took too long to respond",
          408,
          error
        );
      }
      if (error.response?.status === 403) {
        throw new ScrapingError(
          "Access forbidden - possible rate limiting or blocking",
          403,
          error
        );
      }
      if (error.response?.status === 404) {
        throw new ScrapingError("Resource not found", 404, error);
      }
      if (error.response?.status && error.response.status >= 500) {
        throw new ScrapingError("Server error", error.response.status, error);
      }
      throw error;
    }
  );

  return client;
};

// Retry wrapper with exponential backoff
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = SCRAPER_CONFIG.maxRetries,
  baseDelay: number = SCRAPER_CONFIG.retryDelay
): Promise<T> => {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation errors or client errors (4xx)
      if (
        error instanceof ValidationError ||
        (error instanceof ScrapingError &&
          error.statusCode >= 400 &&
          error.statusCode < 500)
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await sleep(delay);
    }
  }

  throw new ScrapingError(
    `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
    500,
    lastError
  );
};

// Common error response helper
export const createErrorResponse = (error: unknown, processingTime: number) => {
  console.error("API error:", error);

  if (error instanceof ValidationError) {
    return {
      json: {
        error: error.message,
        code: "VALIDATION_ERROR",
      },
      status: 400,
      headers: {
        "X-Processing-Time": processingTime.toString(),
      },
    };
  }

  if (error instanceof ScrapingError) {
    return {
      json: {
        error: error.message,
        code: "SCRAPING_ERROR",
      },
      status: error.statusCode,
      headers: {
        "X-Processing-Time": processingTime.toString(),
      },
    };
  }

  // Generic error handling
  return {
    json: {
      error: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
    status: 500,
    headers: {
      "X-Processing-Time": processingTime.toString(),
    },
  };
};

// Movie parsing and extraction utilities

/**
 * Extract quality from title or URL, prioritizing resolution over format
 */
export const extractQualityFromText = (text: string): string | undefined => {
  // First check for resolution (prioritized)
  const resolutionMatch = text.match(/(4K|2160p|1440p|1080p|720p|480p|360p)/i);
  if (resolutionMatch) {
    return resolutionMatch[1].toUpperCase();
  }

  // If no resolution found, check for format
  const formatMatch = text.match(
    /(BluRay|WEBRip|HDRip|HDTV|DVDRip|HD|SD|Low Quality|)/i
  );
  if (formatMatch) {
    return formatMatch[1].toUpperCase();
  }

  return undefined;
};

/**
 * Extract file size from title or URL
 */
export const extractSizeFromText = (text: string): string | undefined => {
  const sizeMatch = text.match(/[\[\(]?(\d+(?:\.\d+)?\s*(?:GB|MB|KB))[\]\)]?/i);
  return sizeMatch ? sizeMatch[1] : undefined;
};

/**
 * Extract year from title
 */
export const extractYearFromTitle = (title: string): number | undefined => {
  const yearMatch = title.match(/\((\d{4})\)/);
  return yearMatch ? parseInt(yearMatch[1]) : undefined;
};

/**
 * Parse individual download link with simplified structure
 */
export const parseDownloadLink = (
  $: cheerio.CheerioAPI,
  $link: cheerio.Cheerio<any>,
  processedUrls: Set<string>
): DownloadLink | null => {
  try {
    const href = $link.attr("href");
    const text = sanitizeText($link.text());

    if (!href || !text || href === "" || text === "") {
      return null;
    }

    // Skip if already processed
    if (processedUrls.has(href)) {
      return null;
    }
    processedUrls.add(href);

    // Skip invalid or suspicious links
    if (!validateUrl(href) && !href.startsWith("/")) {
      return null;
    }

    return {
      label: text,
      url: href,
    };
  } catch (error) {
    console.warn("Error parsing download link:", error);
    return null;
  }
};

export const parseMovieElement = (
  element: any,
  $: cheerio.CheerioAPI,
  baseUrl: string
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

    const fullLink = href.startsWith("http") ? href : `${baseUrl}${href}`;

    if (!validateUrl(fullLink)) {
      console.warn(`Invalid URL generated: ${fullLink}`);
      return null;
    }

    // Extract metadata from title and URL
    const $parent = $element.parent();
    let genre: string[] | undefined;
    const quality = extractQualityFromText(title + " " + fullLink);
    const size = extractSizeFromText(title + " " + fullLink);

    // Try to extract genre information
    const genreText = $parent.find(".genre, .category").text().trim();
    if (genreText) {
      genre = genreText
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g.length > 0);
    }

    return {
      title,
      link: fullLink,
      ...(genre && genre.length > 0 && { genre }),
      ...(quality && { quality }),
      ...(size && { size }),
    };
  } catch (error) {
    console.warn("Error parsing movie element:", error);
    return null;
  }
};


/**
 * Process movies with concurrency control and rate limiting
 */
export const processMoviesWithConcurrency = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrencyLimit: number = SCRAPER_CONFIG.maxConcurrent
): Promise<R[]> => {
  const results: R[] = [];
  const actualLimit = Math.min(concurrencyLimit, items.length);

  console.info(
    `Processing ${items.length} items with concurrency limit of ${actualLimit}`
  );

  // Process items in batches to respect concurrency limits
  for (let i = 0; i < items.length; i += actualLimit) {
    const batch = items.slice(i, i + actualLimit);

    const batchPromises = batch.map(async (item, index) => {
      try {
        // Add small delay between requests to be respectful
        if (index > 0) {
          await sleep(100 * index);
        }

        return await processor(item, i + index);
      } catch (error) {
        console.warn(`Failed to process item at index ${i + index}:`, error);
        throw error;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    });

    // Small delay between batches
    if (i + actualLimit < items.length) {
      await sleep(500);
    }
  }

  return results;
};

/**
 * Deduplicate movies by normalized title, keeping only the highest quality version
 */
export function dedupeMoviesByTitleHighestQuality(movies: Movie[]): Movie[] {
  // Use the part of the title before the first '(' as the deduplication key
  const getBaseTitle = (title: string) => {
    const idx = title.indexOf("(");
    return (idx !== -1 ? title.slice(0, idx) : title).trim().toLowerCase();
  };

  const qualityOrder = [
    "4K",
    "2160P",
    "1440P",
    "1080P",
    "720P",
    "480P",
    "360P",
    "BLURAY",
    "WEBRIP",
    "HDRIP",
    "HDTV",
    "DVDRIP",
    "HD",
    "SD",
  ];

  const getQualityRank = (quality?: string) => {
    if (!quality) return 100;
    const idx = qualityOrder.indexOf(quality.toUpperCase());
    return idx === -1 ? 99 : idx;
  };

  const map = new Map<string, Movie>();
  for (const movie of movies) {
    const base = getBaseTitle(movie.title);
    if (!map.has(base)) {
      map.set(base, movie);
    } else {
      const existing = map.get(base)!;
      // Lower rank is better (higher quality)
      if (getQualityRank(movie.quality) < getQualityRank(existing.quality)) {
        map.set(base, movie);
      }
    }
  }
  return Array.from(map.values());
}
