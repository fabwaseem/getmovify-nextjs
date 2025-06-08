import { FILMY_WAP_URL, getskyBapUrl } from "@/config";
import { Movie } from "@/types/movie";
import {
  createErrorResponse,
  dedupeMoviesByTitleHighestQuality,
  withRetry,
} from "@/utils/scraper";
import {
  fetchMovieDetailsWithConcurrencyFilmyWap,
  scrapeLatestMoviesFilmyWap,
} from "@/utils/filmywap";
import {
  fetchMovieDetailsWithConcurrencySkyBap,
  scrapeLatestMoviesSkyBap,
  scrapePopularMoviesSkyBap,
} from "@/utils/skybap";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const SKYBAP_URL = await getskyBapUrl();

  try {
    // Input validation
    const searchParams = request.nextUrl.searchParams;
    const includeDetails = searchParams.get("details") !== "false"; // Default to true
    const type = searchParams.get("type"); // "popular", "latest", or both (default)

    console.info(
      `[API] Starting homepage scrape (details: ${includeDetails}, type: ${
        type || "both"
      })`
    );

    let popularMovies: Movie[] = [];
    let latestMovies: Movie[] = [];

    // Scrape SkyBap
    if (!type || type === "both" || type === "popular") {
      console.info("[SkyBap] Scraping popular movies...");
      const popularMoviesSkyBap = await withRetry(() =>
        scrapePopularMoviesSkyBap(SKYBAP_URL)
      );
      const detailedPopularMoviesSkyBap =
        await fetchMovieDetailsWithConcurrencySkyBap(
          popularMoviesSkyBap,
          "popular",
          SKYBAP_URL
        );

      popularMovies = [...detailedPopularMoviesSkyBap];
    }

    if (!type || type === "both" || type === "latest") {
      console.info("[SkyBap] Scraping latest movies...");
      const latestMoviesSkyBap = await withRetry(() =>
        scrapeLatestMoviesSkyBap(SKYBAP_URL)
      );
      const detailedMoviesSkyBap = await fetchMovieDetailsWithConcurrencySkyBap(
        latestMoviesSkyBap,
        "latest",
        SKYBAP_URL
      );

      latestMovies = [...detailedMoviesSkyBap];
    }

    // Scrape FilmyWap
    if (!type || type === "both" || type === "latest") {
      console.info("[FilmyWap] Scraping latest movies...");
      const latestMoviesFilmyWap = await withRetry(() =>
        scrapeLatestMoviesFilmyWap(FILMY_WAP_URL)
      );
      const detailedMoviesFilmyWap =
        await fetchMovieDetailsWithConcurrencyFilmyWap(
          latestMoviesFilmyWap,
          "latest",
          FILMY_WAP_URL
        );

      latestMovies = [...latestMovies, ...detailedMoviesFilmyWap];
    }

    // Deduplicate by title, keep highest quality
    popularMovies = dedupeMoviesByTitleHighestQuality(popularMovies);
    latestMovies = dedupeMoviesByTitleHighestQuality(latestMovies);

    const processingTime = Date.now() - startTime;
    const totalMovies = popularMovies.length + latestMovies.length;

    console.info(
      `[API] Homepage scrape completed in ${processingTime}ms, found ${totalMovies} movies (${
        popularMovies.length
      } popular, ${latestMovies.length} latest)${
        includeDetails ? " with details" : ""
      }`
    );

    const result = {
      popular: popularMovies,
      latest: latestMovies,
      total: totalMovies,
      popularCount: popularMovies.length,
      latestCount: latestMovies.length,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": includeDetails
          ? "public, max-age=600, stale-while-revalidate=1200" // 10 min cache for detailed results
          : "public, max-age=300, stale-while-revalidate=600", // 5 min cache for basic results
        "X-Processing-Time": processingTime.toString(),
        "X-Popular-Movies": popularMovies.length.toString(),
        "X-Latest-Movies": latestMovies.length.toString(),
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
