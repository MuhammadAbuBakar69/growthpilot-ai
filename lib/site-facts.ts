import type { SiteFacts } from "./profile";

/**
 * Facts parsed from HTML the user supplied. Anything here is `measured`; the parser never guesses.
 */

const stripTags = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const firstMatch = (html: string, re: RegExp): string | null => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
};

const SOCIAL = ["instagram", "facebook", "linkedin", "tiktok", "youtube", "x.com", "twitter", "wa.me", "pinterest"];
const CTA_WORDS = /\b(book|call|contact|enquir|inquir|quote|order|buy|sign ?up|get started|whatsapp|message us|request)\b/gi;

const KEYWORDS = {
  testimonial: /testimonial|what (?:our|my) (?:clients|customers|buyers) say|reviews?|rated \d|★|\bstars\b|google reviews|trustpilot/i,
  proof: /case stud|before (?:and|&) after|portfolio|our work|gallery|completed projects|clients? includ/i,
  price: /(?:pkr|rs\.?|₹|\$|usd|aed|sar|aed)\s?\d[\d,.]*|from \d|starting (?:at|from)|price list|per (?:piece|item|hour|kg|sq ?ft|unit)/i,
  guarantee: /guarantee|warranty|money ?back|refund|returns? policy|free (?:delivery|shipping|installation)|satisfaction promise/i,
  analytics: /googletagmanager|gtag\(|google-analytics|plausible|umami|matomo|clarity\.ms|hotjar|fbq\(|posthog/i,
};

/**
 * Evidence, not vocabulary.
 *
 * `KEYWORDS.testimonial` matches the word "reviews" anywhere, so "we have no reviews yet" used to be
 * counted as proof that reviews exist. A testimonial claim is only supported by something a reader could
 * check: a quoted block, a person named with a role, or a rating figure.
 */
const ATTRIBUTION_ROLE =
  /\b(owner|founder|co-?founder|ceo|cto|manager|director|head of|buyer|client|customer|principal|teacher|doctor|chef|purchas\w*|operations)\b/i;

const RATING_FIGURE = /\b\d(?:[.,]\d)?\s*(?:\/\s*5|out of\s*5|stars?)\b|\brated\s+\d(?:[.,]\d)?/i;

const attributedQuotesFrom = (html: string): string[] =>
  [...html.matchAll(/<blockquote\b[\s\S]*?<\/blockquote>/gi)]
    .map((m) => stripTags(m[0]))
    .filter((quote) => quote.length > 0)
    .filter((quote) => /[—–-]\s*\S/.test(quote) || ATTRIBUTION_ROLE.test(quote))
    .slice(0, 3);

const snippets = (text: string, re: RegExp, limit = 3): string[] => {
  const out: string[] = [];
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const global = new RegExp(re.source, flags);
  let m: RegExpExecArray | null;
  while ((m = global.exec(text)) !== null && out.length < limit) {
    const start = Math.max(0, m.index - 55);
    const end = Math.min(text.length, m.index + m[0].length + 55);
    out.push(`${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`);
    if (m.index === global.lastIndex) global.lastIndex += 1;
  }
  return out;
};

/**
 * Parse facts out of HTML the user supplied. Pure and sync: the same HTML always yields the same
 * facts, so any finding built on them can be reproduced and argued with. No network, no headless
 * browser - which is also why a JavaScript-rendered page can look thin here, and is labelled as such.
 */
export function extractSiteFacts(html: string, url: string | null = null): SiteFacts {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
  ) ?? firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);

  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  const h2Count = [...html.matchAll(/<h2[^>]*>/gi)].length;
  const h3Count = [...html.matchAll(/<h3[^>]*>/gi)].length;
  const blockquotes = [...html.matchAll(/<blockquote\b/gi)].length;
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imagesMissingAlt = images.filter((tag) => !/\balt\s*=\s*["'][^"']+["']/i.test(tag)).length;

  const links = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const socialLinks = SOCIAL.filter((s) => links.some((l) => l.toLowerCase().includes(s)));
  const internalLinks = links.filter((l) => l.startsWith("/") || l.startsWith("#")).length;
  const externalLinks = links.filter((l) => /^https?:\/\//i.test(l)).length;
  const navItems = [...html.matchAll(/<nav[\s\S]*?<\/nav>/gi)]
    .flatMap((nav) => [...nav[0].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((a) => stripTags(a[1])))
    .filter(Boolean)
    .slice(0, 8);

  const text = stripTags(html);
  const ctaMatches = (text.match(CTA_WORDS) ?? []).length;
  const analyticsRaw = firstMatch(html, /(googletagmanager|gtag\(|google-analytics|plausible|umami|matomo|clarity\.ms|hotjar|posthog|fbq\()/i);

  return {
    url,
    title: title ? stripTags(title) : null,
    titleLength: title ? stripTags(title).length : 0,
    metaDescription: metaDescription ? metaDescription.trim() : null,
    h1,
    h2Count,
    h3Count,
    wordCount: text ? text.split(/\s+/).length : 0,
    ctaMatches,
    ctaSamples: snippets(text, CTA_WORDS, 3),
    hasPhone: /href\s*=\s*["']tel:/i.test(html) || /\+\d[\d\s()-]{7,}/.test(text),
    hasEmail: /href\s*=\s*["']mailto:/i.test(html) || /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
    hasForm: /<form\b/i.test(html),
    imageCount: images.length,
    imagesMissingAlt,
    socialLinks,
    mentionsPrice: KEYWORDS.price.test(text),
    priceSamples: snippets(text, KEYWORDS.price, 2),
    viewportMeta: /<meta[^>]+name=["']viewport["']/i.test(html),
    lang: /<html[^>]+lang=["'][a-z-]+["']/i.test(html),
    structuredData: /application\/ld\+json/i.test(html),
    analytics: analyticsRaw,
    testimonialSamples: snippets(text, KEYWORDS.testimonial, 3),
    attributedQuotes: attributedQuotesFrom(html),
    ratingFigure: (text.match(RATING_FIGURE) ?? [null])[0],
    proofSamples: snippets(text, KEYWORDS.proof, 2),
    guaranteeSamples: snippets(text, KEYWORDS.guarantee, 2),
    blockquotes,
    navItems,
    internalLinks,
    externalLinks,
    textSample: text.slice(0, 700),
    source: "supplied-html",
  };
}
