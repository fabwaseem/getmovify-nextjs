import { DownloadLink, Movie } from "@/types/movie";
import * as cheerio from "cheerio";
import {
  createHttpClient,
  extractQualityFromText,
  extractSizeFromText,
  getRandomUserAgent,
  isValidImageUrl,
  parseDownloadLink,
  processMoviesWithConcurrency,
  sanitizeText,
  SCRAPER_CONFIG,
  ScrapingError,
  validateUrl,
  withRetry,
} from "./scraper";

export const parsePopularMovieElementSkyBap = (
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

    const fullLink = href.startsWith("http")
      ? href
      : `${baseUrl}/${href}`;

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

export const parseLatestMovieElementSkyBap = (
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

    // Handle relative URLs for latest movies
    const fullLink = href.startsWith("http")
      ? href
      : href.startsWith("/")
      ? `${baseUrl}${href}`
      : `${baseUrl}/${href}`;

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

export const scrapePopularMoviesSkyBap = async (
  baseUrl: string
): Promise<Movie[]> => {
  const client = createHttpClient();

  const response = await client.get(baseUrl, {
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

  // Find all popular movie divs with class "Let"
  const popularElements = $('div.Let[align="left"]').toArray();

  console.info(`Found ${popularElements.length} popular movie elements`);

  // Process movies in parallel
  const moviePromises = popularElements.map((element) =>
    parsePopularMovieElementSkyBap(element, $, baseUrl)
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

export const scrapeLatestMoviesSkyBap = async (
  baseUrl: string
): Promise<Movie[]> => {
  const client = createHttpClient();

  const response = await client.get(baseUrl, {
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

  // Find all latest movie divs with class "Fmvideo"
  const latestElements = $('div.Fmvideo[align="left"]').toArray();

  console.info(`Found ${latestElements.length} latest movie elements`);

  // Process movies in parallel
  const moviePromises = latestElements.map((element) =>
    parseLatestMovieElementSkyBap(element, $, baseUrl)
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

export const fetchMovieDetailsWithConcurrencySkyBap = async (
  movies: Movie[],
  type: string,
  baseUrl: string
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
        const details = await withRetry(() =>
          fetchMovieDetailsSkyBap(movie.link, baseUrl)
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

export const fetchMovieDetailsSkyBap = async (
  movieUrl: string,
  baseUrl: string
) => {
  const client = createHttpClient(20000); // 20 seconds timeout for movie details

  const response = await client.get(movieUrl, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Referer: baseUrl,
    },
  });

  if (!response.data || typeof response.data !== "string") {
    throw new ScrapingError("Invalid response format received");
  }

  const $ = cheerio.load(response.data);

  // Extract thumbnail with multiple strategies
  const thumbnail = extractThumbnail($, baseUrl);

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

export const extractThumbnail = (
  $: cheerio.CheerioAPI,
  baseUrl: string
): string => {
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
              : new URL(src, baseUrl).href;
          }
        }
      }
    } catch (error) {
      console.warn(`Error with thumbnail selector ${selector}:`, error);
    }
  }

  return "";
};

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
