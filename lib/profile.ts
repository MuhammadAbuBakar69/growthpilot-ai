/**
 * The profile: what we know about one business, and the version of the model that scored it.
 */

export type Goal = "leads" | "sales" | "retention" | "awareness";

/**
 * Bumped whenever weights, questions or rules change what a score means. A saved profile carries the
 * version it was scored under, so the UI can say "these answers predate the current model" rather than
 * presenting an old number as if it were current.
 */
export const SCORING_VERSION = 2;

export interface Profile {
  id: string;
  name: string;
  website: string;
  industry: string;
  description: string;
  audience: string;
  offer: string;
  goal: Goal;
  monthlyRevenue: number | null;
  channels: string[];
  answers: Record<string, number>;
  /** Facts parsed from HTML the user supplied, if any. */
  site: SiteFacts | null;
  createdAt: string;
  updatedAt: string;
  scoringVersion?: number;
}

export interface SiteFacts {
  url: string | null;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  h1: string[];
  h2Count: number;
  h3Count: number;
  wordCount: number;
  ctaMatches: number;
  ctaSamples: string[];
  hasPhone: boolean;
  hasEmail: boolean;
  hasForm: boolean;
  imageCount: number;
  imagesMissingAlt: number;
  socialLinks: string[];
  mentionsPrice: boolean;
  priceSamples: string[];
  viewportMeta: boolean;
  lang: boolean;
  structuredData: boolean;
  analytics: string | null;
  testimonialSamples: string[];
  /**
   * A quoted block with an attribution attached, and a published rating figure. Both are evidence; the
   * word "reviews" in a sentence is not, which is why it is counted separately.
   */
  attributedQuotes?: string[];
  ratingFigure?: string | null;
  proofSamples: string[];
  guaranteeSamples: string[];
  blockquotes: number;
  navItems: string[];
  internalLinks: number;
  externalLinks: number;
  textSample: string;
  source: "supplied-html";
}

export const emptyProfile = (): Profile => ({
  id: `biz_${Date.now().toString(36)}`,
  name: "",
  website: "",
  industry: "",
  description: "",
  audience: "",
  offer: "",
  goal: "leads",
  monthlyRevenue: null,
  channels: [],
  answers: {},
  site: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
