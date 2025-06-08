import { DownloadLink, Movie } from "@/types/movie";
import * as cheerio from "cheerio";
import {
  createHttpClient,
  extractQualityFromText,
  extractSizeFromText,
  getRandomUserAgent,
  isValidImageUrl,
  processMoviesWithConcurrency,
  sanitizeText,
  SCRAPER_CONFIG,
  ScrapingError,
  validateUrl,
  withRetry,
} from "./scraper";

export const parseLatestMovieElementFilmyWap = (
  element: any,
  $: cheerio.CheerioAPI,
  baseUrl: string
): Movie | null => {
  try {
    const $element = $(element);
    const $link = $element.find("a.ins");

    if ($link.length === 0) {
      return null;
    }

    const href = $link.attr("href");
    const $img = $link.find("img");
    const thumbnail = $img.attr("src");
    const rawTitle = $link.find("div:last-child").text().trim();

    if (!href || !rawTitle) {
      return null;
    }

    const title = sanitizeText(rawTitle);
    if (!title || title.length < 2) {
      return null;
    }

    const fullLink = href.startsWith("http") ? href : `${baseUrl}/${href}`;

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
      thumbnail: thumbnail || "",
      ...(quality && { quality }),
      ...(size && { size }),
    };
  } catch (error) {
    console.warn("Error parsing latest movie element:", error);
    return null;
  }
};

export const scrapeLatestMoviesFilmyWap = async (
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

  // Find all latest movie divs with class "update"
  const latestElements = $("div.updates > div.update").toArray();

  console.info(`Found ${latestElements.length} latest movie elements`);

  // Process movies in parallel
  const moviePromises = latestElements.map((element) =>
    parseLatestMovieElementFilmyWap(element, $, baseUrl)
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

export const fetchMovieDetailsFilmyWap = async (
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

  // Extract thumbnail from the content div
  const thumbnail = extractThumbnailFilmyWap($, baseUrl);

  // Extract download links
  const downloadLinks = extractDownloadLinksFilmyWap($);

  // Extract movie details from the content div
  const movieDetails = extractMovieDetailsFromHTMLFilmyWap($);

  return {
    thumbnail,
    downloadLinks,
    ...movieDetails,
  };
};

function extractThumbnailFilmyWap(
  $: cheerio.CheerioAPI,
  baseUrl: string
): string {
  const $img = $("#content img.posterss");
  if ($img.length > 0) {
    const src = $img.attr("src");
    if (src && isValidImageUrl(src)) {
      return src.startsWith("http") ? src : new URL(src, baseUrl).href;
    }
  }
  return "";
}

function extractDownloadLinksFilmyWap($: cheerio.CheerioAPI): DownloadLink[] {
  const downloadLinks: DownloadLink[] = [];
  const processedUrls = new Set<string>();

  $("div.listed_new").each((_, element) => {
    const $element = $(element);
    const $link = $element.find("a.btn_d");
    const href = $link.attr("href");
    const label = $link.find(".dnld").text().trim();

    if (href && label && !processedUrls.has(href)) {
      processedUrls.add(href);
      downloadLinks.push({
        url: href,
        label: label,
      });
    }
  });

  // Sort by quality (higher quality first)
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
}

function extractMovieDetailsFromHTMLFilmyWap($: cheerio.CheerioAPI) {
  const movieDetails: any = {};

  // Helper function to extract value from menu_list div
  const extractValue = (label: string): string | undefined => {
    const div = $(`div.menu_list:contains("${label}")`);
    if (div.length > 0) {
      const text = div.text();
      const match = text.match(new RegExp(`${label}\\s*-\\s*(.+)$`, "i"));
      return match ? match[1].trim() : undefined;
    }
    return undefined;
  };

  // Extract title
  const titleDiv = $('div.menu_list:contains("Movie Name")');
  if (titleDiv.length > 0) {
    const titleMatch = titleDiv.text().match(/Movie Name:\s*-\s*(.+)$/i);
    if (titleMatch) {
      movieDetails.title = titleMatch[1].trim();
    }
  }

  // Extract genre
  const genre = extractValue("Genre");
  if (genre) {
    movieDetails.genre = genre.split(",").map((g: string) => g.trim());
  }

  // Extract duration
  movieDetails.duration = extractValue("Duration");

  // Extract stars/cast
  const stars = extractValue("Starcast");
  if (stars) {
    movieDetails.stars = stars.split(",").map((s: string) => s.trim());
  }

  // Extract release date
  movieDetails.releaseDate = extractValue("Release Date");

  // Extract language
  movieDetails.language = extractValue("Language/Audio");

  // Extract quality
  movieDetails.quality = extractValue("Movie Quality");

  // Extract story/plot
  movieDetails.story = extractValue("Story/Plot");

  return movieDetails;
}

export const fetchMovieDetailsWithConcurrencyFilmyWap = async (
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
          fetchMovieDetailsFilmyWap(movie.link, baseUrl)
        );

        return {
          ...movie,
          thumbnail: details.thumbnail || movie.thumbnail,
          downloadLinks: details.downloadLinks,
          // Merge all detailed movie information
          ...(details.title && { title: details.title }),
          ...(details.genre && { genre: details.genre }),
          ...(details.duration && { duration: details.duration }),
          ...(details.stars && { stars: details.stars }),
          ...(details.releaseDate && { releaseDate: details.releaseDate }),
          ...(details.language && { language: details.language }),
          ...(details.quality && { quality: details.quality }),
          ...(details.story && { story: details.story }),
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
