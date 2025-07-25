import { getskyBapUrl } from "@/config";
import { Category } from "@/types/movie";
import {
  ScrapingError,
  createErrorResponse,
  createHttpClient,
  getRandomUserAgent,
  parseCategoryElement,
  withRetry,
} from "@/utils/scraper";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";

const getCategories = async (baseUrl: string): Promise<Category[]> => {
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
  const categories: Category[] = [];

  // Find all movie divs with class "L"
  const categoryElements = $('div.Bolly[align="left"]').toArray();

  if (categoryElements.length === 0) {
    console.warn(
      '[SkyBap] No category elements found with selector div.Bolly[align="left"]'
    );
  }

  // Process movies in parallel with concurrency limit
  const categoryPromises = categoryElements.map((element) =>
    parseCategoryElement(element, $)
  );
  const categoryResults = await Promise.allSettled(categoryPromises);

  categoryResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      categories.push(result.value);
    } else if (result.status === "rejected") {
      console.warn(
        `[SkyBap] Failed to process category at index ${index}:`,
        result.reason
      );
    }
  });
  return categories;
};

export async function GET() {
  const SKYBAP_URL = await getskyBapUrl();

  try {
    const [categories] = await Promise.all([
      withRetry(() => getCategories(SKYBAP_URL)),
    ]);

    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, 0);

    return NextResponse.json(errorResponse.json, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
}
