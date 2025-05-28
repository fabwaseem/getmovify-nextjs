import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import { Movie, DownloadLink } from "@/types/movie";

// Configuration for optimized scraping
export const SCRAPER_CONFIG = {
  timeout: 15000, // 15 seconds default timeout
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  maxConcurrent: 50,
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

// Rate limiting utility
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        console.info(`Rate limit reached, waiting ${waitTime}ms`);
        await sleep(waitTime);
      }
    }

    this.requests.push(now);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(20, 60000); // 20 requests per minute

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
  const formatMatch = text.match(/(BluRay|WEBRip|HDRip|HDTV|DVDRip|HD|SD)/i);
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
 * Extract thumbnail with multiple fallback strategies
 */
export const extractThumbnail = ($: cheerio.CheerioAPI): string => {
  const selectors = [
    'div.movielist[align="center"] img',
    ".movie-poster img",
    ".poster img",
    ".thumbnail img",
    'img[src*="poster"]',
    'img[src*="thumb"]',
    'img[src*="image"]',
    ".movie-image img",
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ];

  for (const selector of selectors) {
    try {
      if (selector.startsWith("meta")) {
        const content = $(selector).attr("content");
        if (content && isValidImageUrl(content)) {
          return content;
        }
      } else {
        const $img = $(selector);
        if ($img.length > 0) {
          const src =
            $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy");
          if (src && isValidImageUrl(src)) {
            // Convert relative URLs to absolute
            return src.startsWith("http")
              ? src
              : new URL(src, "https://skymovieshd.blue").href;
          }
        }
      }
    } catch (error) {
      console.warn(`Error with thumbnail selector ${selector}:`, error);
    }
  }

  return "";
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

/**
 * Extract download links with enhanced parsing and sorting
 */
export const extractDownloadLinks = ($: cheerio.CheerioAPI): DownloadLink[] => {
  const downloadLinks: DownloadLink[] = [];
  const processedUrls = new Set<string>(); // Prevent duplicates

  // Primary selector
  const $downloadDiv = $("div.Bolly");

  if ($downloadDiv.length > 0) {
    $downloadDiv.find("a").each((index, element) => {
      const link = parseDownloadLink($, $(element), processedUrls);
      if (link) downloadLinks.push(link);
    });
  }

  // Fallback selectors if primary doesn't work
  if (downloadLinks.length === 0) {
    const fallbackSelectors = [
      ".download-links a",
      ".movie-downloads a",
      ".download-section a",
      'a[href*="download"]',
      'a[href*=".mp4"]',
      'a[href*=".mkv"]',
      'a[href*=".avi"]',
    ];

    for (const selector of fallbackSelectors) {
      $(selector).each((index, element) => {
        const link = parseDownloadLink($, $(element), processedUrls);
        if (link) downloadLinks.push(link);
      });

      if (downloadLinks.length > 0) {
        break;
      }
    }
  }

  // Sort by quality (higher quality first) based on label text
  return downloadLinks.sort((a, b) => {
    const qualityOrder = [
      "4K",
      "2160p",
      "1440p",
      "1080p",
      "720p",
      "480p",
      "360p",
    ];
    const aIndex = qualityOrder.findIndex((q) => a.label.includes(q));
    const bIndex = qualityOrder.findIndex((q) => b.label.includes(q));

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });
};

/**
 * Extract detailed movie information from movie page HTML
 */
export const extractMovieDetailsFromHTML = ($: cheerio.CheerioAPI) => {
  const movieDetails: any = {};

  // Extract genre from the specific structure
  const genreLink = $('div.L:contains("Genre") a').first();
  if (genreLink.length > 0) {
    const genreText = genreLink.text().trim();
    if (genreText) {
      movieDetails.genre = genreText
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g.length > 0);
    }
  }

  // Extract size from the Let div
  const sizeDiv = $('div.Let:contains("Size")');
  if (sizeDiv.length > 0) {
    const sizeMatch = sizeDiv.text().match(/Size\s*:\s*(.+)/i);
    if (sizeMatch && sizeMatch[1]) {
      movieDetails.size = sizeMatch[1].trim();
    }
  }

  // Extract language
  const languageDiv = $('div.Let:contains("Language")');
  if (languageDiv.length > 0) {
    const languageMatch = languageDiv.text().match(/Language\s*:\s*(.+)/i);
    if (languageMatch && languageMatch[1]) {
      movieDetails.language = languageMatch[1].trim();
    }
  }

  // Extract format
  const formatDiv = $('div.Let:contains("Format")');
  if (formatDiv.length > 0) {
    const formatMatch = formatDiv.text().match(/Format\s*:\s*(.+)/i);
    if (formatMatch && formatMatch[1]) {
      movieDetails.format = formatMatch[1].trim();
    }
  }

  // Extract release date
  const releaseDateDiv = $('div.Let:contains("Release Date")');
  if (releaseDateDiv.length > 0) {
    const releaseDateMatch = releaseDateDiv
      .text()
      .match(/Release Date\s*:\s*(.+)/i);
    if (releaseDateMatch && releaseDateMatch[1]) {
      movieDetails.releaseDate = releaseDateMatch[1].trim();
    }
  }

  // Extract stars/cast
  const starsDiv = $('div.Let:contains("Stars")');
  if (starsDiv.length > 0) {
    const starsMatch = starsDiv.text().match(/Stars\s*:\s*(.+)/i);
    if (starsMatch && starsMatch[1]) {
      movieDetails.stars = starsMatch[1].trim();
    }
  }

  // Extract story/plot
  const storyDiv = $('div.Let:contains("Story")');
  if (storyDiv.length > 0) {
    const storyMatch = storyDiv.text().match(/Story\s*:\s*(.+)/i);
    if (storyMatch && storyMatch[1]) {
      movieDetails.story = storyMatch[1].trim();
    }
  }

  return movieDetails;
};

/**
 * Parse movie element from search results
 */
export const parseMovieElement = (
  element: any,
  $: cheerio.CheerioAPI,
  baseUrl: string = "https://skymovieshd.blue"
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
 * Extracts all image URLs from <div class="L"> containing <center><img ...></center> blocks
 */
function extractMovieImages($: cheerio.CheerioAPI): string[] {
  const images: string[] = [];
  // Find all <div class="L"> elements
  $("div.L").each((_, div) => {
    const $div = $(div);
    // Find all <center><img ...></center> inside this div
    $div.find("center > img").each((_, img) => {
      const src = $(img).attr("src");
      if (src && isValidImageUrl(src)) {
        images.push(src);
      }
    });
  });
  return images;
}

/**
 * Fetch complete movie details from movie page
 */
export const fetchMovieDetails = async (movieUrl: string) => {
  const client = createHttpClient(20000); // 20 seconds timeout for movie details

  const response = await client.get(movieUrl, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Referer: "https://skymovieshd.blue/",
    },
  });

  if (!response.data || typeof response.data !== "string") {
    throw new ScrapingError("Invalid response format received");
  }

  const $ = cheerio.load(response.data);

  // Extract thumbnail with multiple strategies
  const thumbnail = extractThumbnail($);

  // Extract download links with enhanced parsing
  const downloadLinks = extractDownloadLinks($);

  // Extract basic metadata
  const title = $("title").text().trim() || $("h1").first().text().trim() || "";

  // Extract detailed movie information from the structured HTML
  const movieDetails = extractMovieDetailsFromHTML($);

  // Extract all images from <div class="L"><center><img ...></center></div>
  const images = extractMovieImages($);

  return {
    thumbnail,
    downloadLinks,
    ...(title && { title }),
    ...movieDetails,
    ...(images.length > 0 && { images }),
  };
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
