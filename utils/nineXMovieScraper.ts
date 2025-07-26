import * as cheerio from "cheerio";
import { Movie, DownloadLink } from "@/types/movie";
import {
  createHttpClient,
  withRetry,
  sanitizeText,
  validateUrl,
  ScrapingError,
  getRandomUserAgent,
} from "./scraper";

const BASE_URL = "https://9xmoviie.me";

/**
 * Scrape movies from 9xmoviie.me home page or search results
 */
export const scrape9xMovieMovies = async (
  searchQuery?: string,
  page: number = 1
): Promise<{ movies: Movie[]; hasMore: boolean }> => {
  const client = createHttpClient();

  return withRetry(async () => {
    let url = BASE_URL;
    let method = "GET";
    let data: any = undefined;

    // Handle search vs home page
    if (searchQuery) {
      method = "POST";
      data = new URLSearchParams({
        do: "search",
        subaction: "search",
        story: searchQuery,
      });
      client.defaults.headers["Content-Type"] =
        "application/x-www-form-urlencoded";
    } else if (page > 1) {
      url = `${BASE_URL}/page/${page}/`;
    }

    client.defaults.headers["User-Agent"] = getRandomUserAgent();

    const response = await client({
      method,
      url,
      data,
    });

    const $ = cheerio.load(response.data);
    const movies: Movie[] = [];

    // Find the home-wrapper thumbnail-wrapper section
    const movieContainer = $(".home-wrapper.thumbnail-wrapper");

    if (movieContainer.length === 0) {
      console.warn("No movie container found on page");
      return { movies: [], hasMore: false };
    }

    // Get each movie div with class "thumb"
    const movieElements = movieContainer.find(".thumb");

    for (const element of movieElements.toArray()) {
      const movie = parse9xMovieElement($, $(element));
      if (movie) {
        movies.push(movie);
      }
    }

    // Check if there are more pages (simple heuristic)
    const hasMore = movies.length >= 20 && !searchQuery; // Search results don't have pagination

    return { movies, hasMore };
  });
};

/**
 * Parse individual movie element from 9xmoviie.me
 */
const parse9xMovieElement = (
  $: cheerio.CheerioAPI,
  $element: cheerio.Cheerio<any>
): Movie | null => {
  try {
    const $figure = $element.find("figure");
    const $link = $figure.find("a").first();
    const $img = $link.find("img");
    const $titleLink = $figure.find("a.thumbtitle");

    if (!$link.length || !$titleLink.length) {
      return null;
    }

    const href = $link.attr("href");
    const title = sanitizeText($titleLink.text());
    const thumbnail = $img.attr("src");

    if (!href || !title) {
      return null;
    }

    // Ensure full URL
    const fullLink = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const fullThumbnail =
      thumbnail && !thumbnail.startsWith("http")
        ? `${BASE_URL}${thumbnail}`
        : thumbnail;

    if (!validateUrl(fullLink)) {
      return null;
    }

    return {
      title,
      link: fullLink,
      thumbnail: fullThumbnail,
    };
  } catch (error) {
    console.warn("Error parsing 9xmovie element:", error);
    return null;
  }
};

/**
 * Get detailed movie information from 9xmoviie.me movie page
 */
export const get9xMovieDetails = async (
  movieUrl: string
): Promise<Movie | null> => {
  const client = createHttpClient();

  return withRetry(async () => {
    client.defaults.headers["User-Agent"] = getRandomUserAgent();

    const response = await client.get(movieUrl);
    const $ = cheerio.load(response.data);

    // Find the movie information section
    const $movieInfoHeader = $("h2:contains('Movie Information')");
    if (!$movieInfoHeader.length) {
      console.warn("Movie Information section not found");
      return null;
    }

    // Get the description div (next sibling of h2)
    const $descriptionDiv = $movieInfoHeader.next(".description");
    if (!$descriptionDiv.length) {
      console.warn("Description div not found");
      return null;
    }

    // Parse movie details
    const movieDetails = parseMovieDetails($, $descriptionDiv);

    // Get download links
    const downloadLinks = parseDownloadLinks($);

    // Get basic info from the page
    const title =
      $("title").text().trim() || movieDetails.title || "Unknown Title";

    return {
      title,
      link: movieUrl,
      ...movieDetails,
      downloadLinks,
    };
  });
};

/**
 * Parse movie details from the description div
 */
const parseMovieDetails = (
  $: cheerio.CheerioAPI,
  $descriptionDiv: cheerio.Cheerio<any>
) => {
  const details: Partial<Movie> = {};

  $descriptionDiv.find("div").each((_, element) => {
    const $div = $(element);
    const text = $div.text().trim();
    const $bold = $div.find("b");

    if (!$bold.length) return;

    const label = $bold.text().trim().toLowerCase();
    const $span = $div.find("span em");
    const value = $span.length ? sanitizeText($span.text()) : "";

    switch (label) {
      case "category:":
        if (value) {
          details.genre = value
            .split(",")
            .map((g) => g.trim())
            .filter((g) => g);
        }
        break;
      case "movie name":
        if (value.startsWith(":")) {
          details.title = value.substring(1).trim();
        }
        break;
      case "release year:":
        details.releaseDate = value;
        break;
      case "language:":
        details.language = value;
        break;
      case "size:":
        details.size = value;
        break;
      case "format:":
        details.format = value;
        break;
      case "quality:":
        details.quality = value;
        break;
      case "genres:":
        if (value && !details.genre) {
          details.genre = value
            .split(",")
            .map((g) => g.trim())
            .filter((g) => g);
        }
        break;
      case "cast:":
        details.stars = value;
        break;
      case "description:":
        details.story = value;
        break;
    }
  });

  return details;
};

/**
 * Parse download links from the page
 */
const parseDownloadLinks = ($: cheerio.CheerioAPI): DownloadLink[] => {
  const downloadLinks: DownloadLink[] = [];
  const $downloadDivs = $(".description.tCenter");

  if ($downloadDivs.length === 0) {
    return downloadLinks;
  }

  // Track labels to handle duplicates
  const labelCounts = new Map<string, number>();

  // Process divs in pairs (label, link, label, link, ...)
  for (let i = 0; i < $downloadDivs.length - 1; i += 2) {
    const $labelDiv = $downloadDivs.eq(i);
    const $linkDiv = $downloadDivs.eq(i + 1);

    // Get label from first div
    const label = sanitizeText($labelDiv.text());

    // Get link from second div
    const $link = $linkDiv.find("a.dwnLink");
    const href = $link.attr("href");
    const linkText = sanitizeText($link.text());

    if (label && href && linkText) {
      // Extract size from link text if available
      const sizeMatch = linkText.match(/\[(.*?)\]/);
      const size = sizeMatch ? sizeMatch[1] : "";

      let baseLabel = size ? `${label} (${size})` : label;

      // Normalize the label for comparison (remove extra spaces and standardize format)
      const normalizedLabel = baseLabel
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/\s+\(/g, "(") // Remove space before opening parenthesis
        .replace(/\(\s+/g, "(") // Remove space after opening parenthesis
        .trim();

      // Handle duplicate labels by adding "Backup" suffix
      if (labelCounts.has(normalizedLabel)) {
        labelCounts.set(normalizedLabel, labelCounts.get(normalizedLabel)! + 1);
        baseLabel = `${normalizedLabel} Backup`;
      } else {
        labelCounts.set(normalizedLabel, 1);
        baseLabel = normalizedLabel; // Use normalized label as the final label
      }

      downloadLinks.push({
        label: baseLabel,
        url: href,
      });
    }
  }

  return downloadLinks;
};

/**
 * Search movies on 9xmoviie.me
 */
export const search9xMovies = async (query: string): Promise<Movie[]> => {
  if (!query.trim()) {
    throw new ScrapingError("Search query cannot be empty");
  }

  const result = await scrape9xMovieMovies(query);
  return result.movies;
};

/**
 * Get latest movies from 9xmoviie.me home page
 */
export const get9xLatestMovies = async (
  page: number = 1
): Promise<{ movies: Movie[]; hasMore: boolean }> => {
  return scrape9xMovieMovies(undefined, page);
};
