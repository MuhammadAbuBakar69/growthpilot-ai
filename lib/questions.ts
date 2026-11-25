/**
 * The question bank and the dimension model.
 *
 * Weights live here, next to the questions they weight, so a user can read the arithmetic instead of
 * trusting an oracle. A dimension nobody answered stays `unavailable` rather than becoming a zero.
 */

export type Evidence = "measured" | "inferred" | "hypothesis" | "unavailable";

export type DimensionId =
  | "positioning"
  | "offer"
  | "conversion"
  | "content"
  | "acquisition"
  | "trust"
  | "measurement";

export interface Dimension {
  id: DimensionId;
  label: string;
  weight: number;
  why: string;
}

export const DIMENSIONS: Dimension[] = [
  { id: "positioning", label: "Positioning", weight: 0.15, why: "If a visitor cannot tell what you sell and for whom, every other improvement is spent explaining instead of selling." },
  { id: "offer", label: "Offer & pricing", weight: 0.15, why: "A clear offer with a next step converts traffic you already have; an unclear one wastes it." },
  { id: "conversion", label: "Website conversion", weight: 0.2, why: "The cheapest growth available to most businesses is the traffic already arriving and leaving without acting." },
  { id: "content", label: "Content & findability", weight: 0.15, why: "Search and social both reward a page that answers a specific question well." },
  { id: "acquisition", label: "Acquisition", weight: 0.15, why: "One channel that works beats five that might; two that work beat one that breaks." },
  { id: "trust", label: "Trust & proof", weight: 0.1, why: "Proof lowers the risk of the first purchase, which is where most deals are lost." },
  { id: "measurement", label: "Measurement", weight: 0.1, why: "Without numbers you cannot tell an improvement from a coincidence." },
];

export interface Option {
  label: string;
  points: 0 | 1 | 2 | 3;
}

export interface Question {
  id: string;
  dimension: DimensionId;
  text: string;
  help?: string;
  options: Option[];
}

const NO_PARTIAL = (no: string, yes = "Yes, clearly") => [
  { label: no, points: 0 as const },
  { label: "Roughly", points: 1 as const },
  { label: "Mostly", points: 2 as const },
  { label: yes, points: 3 as const },
];

export const QUESTIONS: Question[] = [
  { id: "pos_what", dimension: "positioning", text: "Can a stranger tell what you sell in one sentence?", options: NO_PARTIAL("No, it takes a conversation") },
  { id: "pos_who", dimension: "positioning", text: "Does it say who it is for, specifically enough to exclude someone?", options: NO_PARTIAL("No, it is for everyone") },
  { id: "pos_why", dimension: "positioning", text: "Does it say why you rather than the obvious alternative?", options: NO_PARTIAL("No, we look the same") },

  { id: "off_price", dimension: "offer", text: "Is a price or price range published?", options: [{ label: "No price anywhere", points: 0 }, { label: "Only after a call", points: 1 }, { label: "A range", points: 2 }, { label: "Exact prices", points: 3 }] },
  { id: "off_focus", dimension: "offer", text: "Is there one primary offer, rather than several competing ones?", options: NO_PARTIAL("Five or more, all equal") },
  { id: "off_step", dimension: "offer", text: "Is there a low-risk first step (quote, call, trial, sample)?", options: NO_PARTIAL("No, it is buy or leave") },

  { id: "con_cta", dimension: "conversion", text: "Does every page end with one clear call to action?", options: NO_PARTIAL("No, or several competing") },
  { id: "con_fold", dimension: "conversion", text: "Is the main action visible on a phone without scrolling?", options: NO_PARTIAL("No, it is far down") },
  { id: "con_steps", dimension: "conversion", text: "Can someone enquire in two steps or fewer?", options: [{ label: "Four or more", points: 0 }, { label: "Three", points: 1 }, { label: "Two", points: 2 }, { label: "One", points: 3 }] },
  { id: "con_contact", dimension: "conversion", text: "Are a form, phone or WhatsApp visible without hunting?", options: NO_PARTIAL("Hidden in a footer") },

  { id: "cnt_title", dimension: "content", text: "Does the homepage title describe the offer rather than the company name?", options: NO_PARTIAL("Just the company name") },
  { id: "cnt_cadence", dimension: "content", text: "Do you publish anything on a predictable schedule?", options: [{ label: "Never", points: 0 }, { label: "Rarely", points: 1 }, { label: "Sometimes", points: 2 }, { label: "Weekly or better", points: 3 }] },
  { id: "cnt_pages", dimension: "content", text: "Does each product or service have its own page?", options: NO_PARTIAL("Everything on one page") },

  { id: "acq_channels", dimension: "acquisition", text: "How many channels produced a paying customer in the last 90 days?", options: [{ label: "None", points: 0 }, { label: "One", points: 1 }, { label: "Two", points: 2 }, { label: "Three or more", points: 3 }] },
  { id: "acq_routine", dimension: "acquisition", text: "Is there a repeatable routine (outreach, content, referrals) that runs without you remembering?", options: NO_PARTIAL("Nothing repeatable") },
  { id: "acq_source", dimension: "acquisition", text: "Do you know where each customer came from?", options: NO_PARTIAL("No idea") },

  { id: "tru_testimonial", dimension: "trust", text: "Are there testimonials with a name and company?", options: NO_PARTIAL("None, or anonymous") },
  { id: "tru_proof", dimension: "trust", text: "Is there visual proof of real work (photos, screenshots, samples)?", options: NO_PARTIAL("Stock images only") },
  { id: "tru_policy", dimension: "trust", text: "Is there a guarantee, returns policy or named delivery promise?", options: NO_PARTIAL("Nothing stated") },

  { id: "mea_analytics", dimension: "measurement", text: "Is analytics installed and actually looked at?", options: NO_PARTIAL("No analytics") },
  { id: "mea_review", dimension: "measurement", text: "Do you review the numbers weekly?", options: NO_PARTIAL("Never") },
  { id: "mea_cac", dimension: "measurement", text: "Do you know what a customer costs you to acquire?", options: NO_PARTIAL("No idea") },
];

export const questionsFor = (dimension: DimensionId): Question[] =>
  QUESTIONS.filter((q) => q.dimension === dimension);
