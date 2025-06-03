import * as cheerio from "cheerio";

export const getskyBapUrl = async () => {
  const page = await fetch("https://skybap.com");
  const html = await page.text();
  const $ = cheerio.load(html);
  const span = $("span.badge.rounded-pill.bg-warning");
  const href = span.find("a").attr("href");
  // remove trailing slash
  const baseUrl = href?.replace(/\/$/, "") ?? "https://skymovieshd.dance";
  console.log("baseUrl", baseUrl);
  return baseUrl;
};
