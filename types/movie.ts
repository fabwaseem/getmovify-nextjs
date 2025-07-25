/**
 * Represents a movie with basic information and optional details
 */
export interface Movie {
  /** The title of the movie */
  title: string;
  /** Direct link to the movie page */
  link: string;
  /** Optional thumbnail/poster image URL */
  thumbnail?: string;
  /** Optional array of download links */
  downloadLinks?: DownloadLink[];
  /** Optional genre information */
  genre?: string[];
  /** Optional quality indicator (extracted from title/URL) */
  quality?: string;
  /** Optional file size information (extracted from title/URL) */
  size?: string;
  /** Optional language information */
  language?: string;
  /** Optional video format */
  format?: string;
  /** Optional release date */
  releaseDate?: string;
  /** Optional cast/stars information */
  stars?: string;
  /** Optional movie story/plot */
  story?: string;
  /** Optional array of image URLs */
  images?: string[];
}

/**
 * Represents a download link with label and URL only
 */
export interface DownloadLink {
  /** Display label for the download link */
  label: string;
  /** Direct download URL */
  url: string;
}

/**
 * API response structure for search results
 */
export interface SearchResult {
  /** Array of movies found */
  movies: Movie[];
  /** The search query that was used */
  query: string;
  /** Total number of results (for pagination) */
  total?: number;
  /** Current page number */
  page?: number;
  /** Whether there are more results available */
  hasMore?: boolean;
}

export interface CategoryResult {
  category: string;
  movies: Movie[];
  total: number;
  hasMore?: boolean;
}

export interface Category {
  name: string;
  slug: string;
}
