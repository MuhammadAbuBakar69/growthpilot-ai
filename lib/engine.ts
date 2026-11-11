/**
 * GrowthPilot's analysis engine.
 *
 * Three rules make the output trustworthy, and they are enforced here rather than in the UI:
 *
 *  1. Nothing is invented. A dimension nobody answered is `unavailable`, not zero. An unanswered
 *     question is missing data, and a score that silently treats it as failure is a lie that then
 *     drives the whole plan.
 *  2. Every number shows its formula. A score is a weighted sum of named answers, and the weights are
 *     in this file, so a user can disagree with the arithmetic instead of with an oracle.
 *  3. Every claim carries its evidence class. Facts parsed from the user's own HTML are `measured`;
 *     conclusions drawn from their answers are `inferred`; anything that needs data we do not have is
 *     `unavailable` and is never rendered as a finding.
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

export type Goal = "leads" | "sales" | "retention" | "awareness";

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
}

export interface SiteFacts {
  url: string | null;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  h1: string[];
  h2Count: number;
  wordCount: number;
  ctaMatches: number;
  hasPhone: boolean;
  hasEmail: boolean;
  hasForm: boolean;
  imageCount: number;
  imagesMissingAlt: number;
  socialLinks: string[];
  mentionsPrice: boolean;
  viewportMeta: boolean;
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

// ---------------------------------------------------------------- scoring

export interface DimensionScore {
  id: DimensionId;
  label: string;
  weight: number;
  score: number | null;
  earned: number;
  possible: number;
  answered: number;
  asked: number;
  evidence: Evidence;
}

export interface ScoreResult {
  overall: number | null;
  band: Band | null;
  dimensions: DimensionScore[];
  answered: number;
  asked: number;
  completeness: number;
}

export interface Band {
  key: "fragile" | "early" | "solid" | "compounding";
  label: string;
  meaning: string;
}

const BANDS: Band[] = [
  { key: "fragile", label: "Fragile", meaning: "Growth depends on the owner remembering to do things. Fix the basics before spending on traffic." },
  { key: "early", label: "Early", meaning: "The pieces exist but do not reinforce each other. A small number of changes can move the number a lot." },
  { key: "solid", label: "Solid", meaning: "The machine works when fed. The next gain comes from widening one channel, not fixing five." },
  { key: "compounding", label: "Compounding", meaning: "Each channel feeds the next. Protect what works and raise price or volume deliberately." },
];

export const bandFor = (overall: number): Band =>
  overall >= 75 ? BANDS[3] : overall >= 60 ? BANDS[2] : overall >= 40 ? BANDS[1] : BANDS[0];

export function scoreDimension(dimension: Dimension, answers: Record<string, number>): DimensionScore {
  const asked = questionsFor(dimension.id);
  let earned = 0;
  let possible = 0;
  let answered = 0;
  for (const q of asked) {
    const value = answers[q.id];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    const clamped = Math.max(0, Math.min(3, value));
    earned += clamped;
    possible += 3;
    answered += 1;
  }
  return {
    id: dimension.id,
    label: dimension.label,
    weight: dimension.weight,
    // An unanswered dimension has no score. Reporting 0 would invent a fact.
    score: possible === 0 ? null : Math.round((earned / possible) * 100),
    earned,
    possible,
    answered,
    asked: asked.length,
    evidence: possible === 0 ? "unavailable" : "inferred",
  };
}

export function scoreProfile(profile: Profile): ScoreResult {
  const dimensions = DIMENSIONS.map((d) => scoreDimension(d, profile.answers));
  const scored = dimensions.filter((d) => d.score !== null);
  const totalWeight = scored.reduce((sum, d) => sum + d.weight, 0);
  // Weights are renormalised over what was actually answered, and completeness says how much of the
  // picture that is. The alternative - scoring unanswered dimensions as zero - punishes a user for a
  // question they never saw.
  const overall =
    totalWeight === 0
      ? null
      : Math.round(scored.reduce((sum, d) => sum + d.weight * (d.score as number), 0) / totalWeight);
  const asked = dimensions.reduce((sum, d) => sum + d.asked, 0);
  const answered = dimensions.reduce((sum, d) => sum + d.answered, 0);
  return {
    overall,
    band: overall === null ? null : bandFor(overall),
    dimensions,
    answered,
    asked,
    completeness: asked === 0 ? 0 : Math.round((answered / asked) * 100),
  };
}

export interface Leverage {
  id: DimensionId;
  label: string;
  gain: number;
  score: number;
}

/**
 * Where the next point of score is cheapest: weight x distance from perfect. It is a plan, not a
 * prediction - it says what the arithmetic rewards, and the roadmap turns it into actions.
 */
export function leverage(profile: Profile): Leverage[] {
  return DIMENSIONS.map((d) => {
    const s = scoreDimension(d, profile.answers);
    return { id: d.id, label: d.label, score: s.score ?? 0, gain: Number((d.weight * (100 - (s.score ?? 0))).toFixed(1)) };
  })
    .filter((l) => l.gain > 0)
    .sort((a, b) => b.gain - a.gain);
}

// ---------------------------------------------------------------- findings

export type Severity = "critical" | "high" | "medium" | "low";
export type Effort = "S" | "M" | "L";

export interface Finding {
  id: string;
  dimension: DimensionId;
  severity: Severity;
  evidence: Evidence;
  title: string;
  why: string;
  action: string;
  effort: Effort;
  impact: 1 | 2 | 3 | 4 | 5;
  /** Points of overall score this unlocks, so the list can be ordered by arithmetic, not opinion. */
  unlocks: number;
}

interface Rule {
  id: string;
  dimension: DimensionId;
  severity: Severity;
  effort: Effort;
  impact: 1 | 2 | 3 | 4 | 5;
  when: (p: Profile) => boolean;
  evidence?: Evidence;
  /** Static, or computed from the profile when the wording depends on the fact that fired. */
  title: string | ((p: Profile) => string);
  why: string;
  action: string;
}

const answeredAs = (p: Profile, id: string): number | null => {
  const v = p.answers[id];
  return typeof v === "number" ? v : null;
};

const RULES: Rule[] = [
  { id: "pos-missing", dimension: "positioning", severity: "critical", effort: "S", impact: 5,
    when: (p) => [answeredAs(p, "pos_what"), answeredAs(p, "pos_who")].some((v) => v !== null && v <= 1),
    title: "Visitors cannot repeat what you sell back to you",
    why: "Positioning scored at or below 'roughly'. Ambiguity is not neutral: the visitor who cannot place you leaves, and the ad or link that brought them is paid for anyway.",
    action: "Rewrite the first screen as: what it is, who it is for, what changes for them. Delete every sentence that does not serve those three." },
  { id: "pos-why", dimension: "positioning", severity: "medium", effort: "S", impact: 3,
    when: (p) => { const v = answeredAs(p, "pos_why"); return v !== null && v <= 1; },
    title: "No reason to choose you over the obvious alternative",
    why: "Buyers compare against something - a competitor, a spreadsheet, doing nothing. Without a stated difference the decision defaults to price.",
    action: "Name the alternative explicitly and state the one thing you do better that a customer already confirmed." },
  { id: "offer-price", dimension: "offer", severity: "high", effort: "S", impact: 4,
    when: (p) => { const v = answeredAs(p, "off_price"); return v !== null && v <= 1; },
    title: "No price shown, so every visitor must start a conversation",
    why: "Hiding price filters nobody; it just moves the filtering into a call you pay attention for. Published ranges remove the buyers who were never going to afford you.",
    action: "Publish a starting price or a range with what moves it. Quote from there." },
  { id: "offer-focus", dimension: "offer", severity: "high", effort: "M", impact: 4,
    when: (p) => { const v = answeredAs(p, "off_focus"); return v !== null && v <= 1; },
    title: "Several offers compete for the same attention",
    why: "Five equal offers read as no offer. The visitor has to do the deciding work you were supposed to do.",
    action: "Pick the offer with the best margin and repeat rate as the primary one; demote the rest to a secondary menu." },
  { id: "offer-step", dimension: "offer", severity: "medium", effort: "S", impact: 3,
    when: (p) => { const v = answeredAs(p, "off_step"); return v !== null && v <= 1; },
    title: "No low-risk first step between interest and purchase",
    why: "Asking for a large commitment on the first contact converts only the already-convinced.",
    action: "Add one small first step: a quote, a 15-minute call, a sample, a paid pilot." },
  { id: "con-cta", dimension: "conversion", severity: "critical", effort: "S", impact: 5,
    when: (p) => { const v = answeredAs(p, "con_cta"); return v !== null && v <= 1; },
    title: "Pages end without a single clear action",
    why: "Every additional competing action splits intent. A page that does not ask for something specific gets nothing specific.",
    action: "One primary action per page, repeated at the top, middle and end. Everything else becomes a text link." },
  { id: "con-fold", dimension: "conversion", severity: "high", effort: "S", impact: 4,
    when: (p) => { const v = answeredAs(p, "con_fold"); return v !== null && v <= 1; },
    title: "The main action is below the fold on a phone",
    why: "Most visits to a local or service business are mobile. An action that needs scrolling loses the visitors who decided fastest.",
    action: "Put the primary action in the first screen at 375px wide, and keep it reachable while scrolling." },
  { id: "con-steps", dimension: "conversion", severity: "medium", effort: "S", impact: 3,
    when: (p) => { const v = answeredAs(p, "con_steps"); return v !== null && v <= 1; },
    title: "Enquiring takes more than two steps",
    why: "Each step is a place to abandon. A long form asks the visitor to work before they get value.",
    action: "Cut the form to name, contact and one line of need. Collect the rest later." },
  { id: "con-contact", dimension: "conversion", severity: "high", effort: "S", impact: 4,
    when: (p) => { const v = answeredAs(p, "con_contact"); return v !== null && v <= 1; },
    title: "Contact details are hidden in the footer",
    why: "In markets where buyers message rather than fill forms, a visible WhatsApp or phone is the shortest path to a conversation.",
    action: "Put a message channel in the header and repeat it at the end of every page." },
  { id: "cnt-title", dimension: "content", severity: "medium", effort: "S", impact: 3,
    when: (p) => { const v = answeredAs(p, "cnt_title"); return v !== null && v <= 1; },
    title: "The page title describes the company, not the offer",
    why: "The title is what a search result and a browser tab promise. A company name promises nothing to someone who has not heard of you.",
    action: "Title = what it is + who for + where it applies. Keep the company name at the end." },
  { id: "cnt-pages", dimension: "content", severity: "medium", effort: "L", impact: 4,
    when: (p) => { const v = answeredAs(p, "cnt_pages"); return v !== null && v <= 1; },
    title: "Everything lives on one page, so nothing can rank",
    why: "One page can only target one intent. Buyers searching for a specific service have nothing to land on.",
    action: "One page per service with its own title, proof and call to action. Six good pages beat sixty thin ones." },
  { id: "cnt-cadence", dimension: "content", severity: "low", effort: "M", impact: 2,
    when: (p) => { const v = answeredAs(p, "cnt_cadence"); return v !== null && v <= 1; },
    title: "Nothing is published on a schedule",
    why: "Irregular publishing never compounds: search and audience both reward a rhythm they can rely on.",
    action: "Pick one format you can sustain monthly, and schedule it. Consistency beats brilliance." },
  { id: "acq-one", dimension: "acquisition", severity: "high", effort: "M", impact: 4,
    when: (p) => { const v = answeredAs(p, "acq_channels"); return v !== null && v <= 1; },
    title: "Growth depends on a single channel",
    why: "One channel is one point of failure: an algorithm change, a price rise or a ban removes the pipeline overnight.",
    action: "Add a second channel that does not share the first one's platform risk - for most service businesses, referrals or direct outreach." },
  { id: "acq-routine", dimension: "acquisition", severity: "medium", effort: "M", impact: 3,
    when: (p) => { const v = answeredAs(p, "acq_routine"); return v !== null && v <= 1; },
    title: "Acquisition depends on remembering to do it",
    why: "Work that has no slot in the week happens in bursts after a quiet month, which is the most expensive way to sell.",
    action: "Put one hour in the calendar weekly with a fixed list of who to contact and what to send." },
  { id: "acq-source", dimension: "acquisition", severity: "high", effort: "S", impact: 3,
    when: (p) => { const v = answeredAs(p, "acq_source"); return v !== null && v <= 1; },
    title: "Customer source is not recorded",
    why: "Without source data you cannot tell which channel to double, so budget follows whichever channel feels active.",
    action: "Add one question to intake: 'how did you hear about us?' Record it with every deal." },
  { id: "tru-testimonial", dimension: "trust", severity: "medium", effort: "S", impact: 3,
    when: (p) => { const v = answeredAs(p, "tru_testimonial"); return v !== null && v <= 1; },
    title: "No attributed testimonials",
    why: "Anonymous praise reads as marketing. A name, a company and a specific result reads as evidence.",
    action: "Ask your three happiest customers for two sentences, a name and a company. Publish them verbatim." },
  { id: "tru-proof", dimension: "trust", severity: "medium", effort: "M", impact: 3,
    when: (p) => { const v = answeredAs(p, "tru_proof"); return v !== null && v <= 1; },
    title: "No visual proof of real work",
    why: "Stock imagery signals a template. Real photos of work signal a business that exists.",
    action: "Photograph three finished jobs or record a 20-second clip of the work in progress." },
  { id: "tru-policy", dimension: "trust", severity: "low", effort: "S", impact: 2,
    when: (p) => { const v = answeredAs(p, "tru_policy"); return v !== null && v <= 1; },
    title: "No stated guarantee or delivery promise",
    why: "The first purchase carries the most perceived risk. An explicit promise transfers some of it.",
    action: "State one promise you can keep every time, and what happens if you miss it." },
  { id: "mea-analytics", dimension: "measurement", severity: "high", effort: "S", impact: 3,
    when: (p) => { const v = answeredAs(p, "mea_analytics"); return v !== null && v <= 1; },
    title: "No analytics, so no way to tell improvement from luck",
    why: "A recommendation only earns its place if the result can be checked. Without measurement, every change is a guess with extra work.",
    action: "Install a privacy-respecting analytics script and define the one event that counts as a lead." },
  { id: "mea-review", dimension: "measurement", severity: "medium", effort: "S", impact: 2,
    when: (p) => { const v = answeredAs(p, "mea_review"); return v !== null && v <= 1; },
    title: "Numbers are not reviewed on a rhythm",
    why: "Data that is not looked at weekly cannot change a decision inside the month it matters.",
    action: "A 15-minute Monday review of three numbers: visits, enquiries, closed." },
  { id: "mea-cac", dimension: "measurement", severity: "medium", effort: "M", impact: 3,
    when: (p) => { const v = answeredAs(p, "mea_cac"); return v !== null && v <= 1; },
    title: "Cost to acquire a customer is unknown",
    why: "Without it, a channel that looks busy can be losing money, and a quiet channel can be the profitable one.",
    action: "Divide last quarter's marketing spend by new customers won in the same period, per channel." },

  // Rules that only fire on measured facts from supplied HTML.
  { id: "site-title", dimension: "content", severity: "medium", effort: "S", impact: 3, evidence: "measured",
    when: (p) => !!p.site && (p.site.title === null || p.site.titleLength < 15 || p.site.titleLength > 65),
    title: "Page title is outside the useful length",
    why: "A title shorter than about 15 characters says too little for a search result; longer than about 65 gets cut, so the useful part disappears.",
    action: "Rewrite the title to 15-65 characters: service, audience, location." },
  { id: "site-meta", dimension: "content", severity: "low", effort: "S", impact: 2, evidence: "measured",
    when: (p) => !!p.site && !p.site.metaDescription,
    title: "No meta description, so search engines invent one",
    why: "The description is the pitch under your link. Left empty, a machine picks a sentence that may not be the one that sells.",
    action: "Write 120-155 characters that state the offer and the next step." },
  { id: "site-h1", dimension: "positioning", severity: "medium", effort: "S", impact: 3, evidence: "measured",
    when: (p) => !!p.site && p.site.h1.length !== 1,
    title: (p) => (p.site && p.site.h1.length === 0 ? "The page has no H1 headline" : "The page has several H1 headlines"),
    why: "One H1 is the machine-readable version of 'what is this page'. Zero leaves it undefined; several make it competing.",
    action: "One H1 stating the offer. Demote the rest to H2." },
  { id: "site-viewport", dimension: "conversion", severity: "high", effort: "S", impact: 4, evidence: "measured",
    when: (p) => !!p.site && !p.site.viewportMeta,
    title: "No viewport tag, so phones render a shrunken desktop page",
    why: "Without the viewport meta tag a mobile browser scales the desktop layout down. Text becomes unreadable and taps miss.",
    action: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' },
  { id: "site-form", dimension: "conversion", severity: "medium", effort: "M", impact: 3, evidence: "measured",
    when: (p) => !!p.site && !p.site.hasForm && !p.site.hasPhone && !p.site.hasEmail,
    title: "No form, phone or email found in the page source",
    why: "The page asks for attention but offers no route back. Parsed from your HTML, so a form rendered by script would not appear.",
    action: "Add a form or a visible contact channel in the first screen." },
  { id: "site-alt", dimension: "content", severity: "low", effort: "S", impact: 2, evidence: "measured",
    when: (p) => !!p.site && p.site.imagesMissingAlt > 0,
    title: "Images without alt text",
    why: "Alt text is what search engines and screen readers use when the image cannot be seen. Missing it loses both.",
    action: "Describe each image in a short sentence that names the thing and, where useful, the place." },
  { id: "site-thin", dimension: "content", severity: "medium", effort: "M", impact: 3, evidence: "measured",
    when: (p) => !!p.site && p.site.wordCount > 0 && p.site.wordCount < 250,
    title: "The page carries under 250 words",
    why: "Thin pages give a search engine and a buyer very little to match against. Parsed word count excludes text loaded by script.",
    action: "Add the questions customers actually ask, answered in their words." },
];

export function findings(profile: Profile): Finding[] {
  const dims = new Map(DIMENSIONS.map((d) => [d.id, d]));
  const scored = new Map(scoreProfile(profile).dimensions.map((d) => [d.id, d]));

  return RULES.filter((rule) => {
    try {
      return rule.when(profile);
    } catch {
      return false;
    }
  })
    .map((rule) => {
      const dim = dims.get(rule.dimension);
      const score = scored.get(rule.dimension);
      const headroom = score?.score === null || score?.score === undefined ? 100 : 100 - score.score;
      // Unlocks = this dimension's weight spread across its open findings, scaled by impact and by how
      // much headroom the dimension has. It orders the list; it does not promise a score increase.
      const open = RULES.filter((r) => r.dimension === rule.dimension).length;
      const unlocks = Number((((dim?.weight ?? 0.1) * headroom * rule.impact) / (5 * Math.max(1, open))).toFixed(1));
      return {
        id: rule.id,
        dimension: rule.dimension,
        severity: rule.severity,
        evidence: rule.evidence ?? "inferred",
        title: typeof rule.title === "function" ? rule.title(profile) : rule.title,
        why: rule.why,
        action: rule.action,
        effort: rule.effort,
        impact: rule.impact,
        unlocks,
      } satisfies Finding;
    })
    .sort((a, b) => b.unlocks - a.unlocks || b.impact - a.impact);
}

// ---------------------------------------------------------------- roadmap

export interface RoadmapStage {
  window: "30 days" | "60 days" | "90 days";
  focus: string;
  items: Finding[];
}

const EFFORT_WEIGHT: Record<Effort, number> = { S: 0, M: 1, L: 2 };

export function roadmap(profile: Profile): RoadmapStage[] {
  const all = findings(profile);
  const small = all.filter((f) => f.effort === "S").slice(0, 4);
  const chosen = new Set(small.map((f) => f.id));
  const medium = all.filter((f) => f.effort === "M" && !chosen.has(f.id)).slice(0, 4);
  medium.forEach((f) => chosen.add(f.id));
  const large = all.filter((f) => f.effort === "L" && !chosen.has(f.id)).slice(0, 3);

  const top = leverage(profile)[0];
  const focusFor = (fallback: string) => (top ? fallback.replace("{dim}", top.label.toLowerCase()) : fallback.replace("{dim}", "the weakest dimension"));

  return [
    { window: "30 days", focus: focusFor("Quick fixes in {dim}: each is a small effort with a visible effect."), items: small },
    { window: "60 days", focus: "Structural work that needs a few weeks of consistency, not a weekend."+"" , items: medium },
    { window: "90 days", focus: "Bets that change what the business can reach: new surfaces, new offers, new proof.", items: large },
  ];
}

export const effortWeight = (e: Effort): number => EFFORT_WEIGHT[e];

// ---------------------------------------------------------------- site facts

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

/**
 * Parse facts out of HTML the user supplied. Pure and sync: the same HTML always yields the same
 * facts, so a finding built from them can be reproduced and argued with.
 */
export function extractSiteFacts(html: string, url: string | null = null): SiteFacts {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
  ) ?? firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);

  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  const h2Count = [...html.matchAll(/<h2[^>]*>/gi)].length;
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imagesMissingAlt = images.filter((tag) => !/\balt\s*=\s*["'][^"']+["']/i.test(tag)).length;

  const links = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1].toLowerCase());
  const socialLinks = SOCIAL.filter((s) => links.some((l) => l.includes(s)));

  const text = stripTags(html);
  const ctaMatches = (text.match(CTA_WORDS) ?? []).length;

  return {
    url,
    title: title ? stripTags(title) : null,
    titleLength: title ? stripTags(title).length : 0,
    metaDescription: metaDescription ? metaDescription.trim() : null,
    h1,
    h2Count,
    wordCount: text ? text.split(/\s+/).length : 0,
    ctaMatches,
    hasPhone: /href\s*=\s*["']tel:/i.test(html) || /\+\d[\d\s()-]{7,}/.test(text),
    hasEmail: /href\s*=\s*["']mailto:/i.test(html) || /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
    hasForm: /<form\b/i.test(html),
    imageCount: images.length,
    imagesMissingAlt,
    socialLinks,
    mentionsPrice: /(\bprice|\bpkr\b|\busd\b|\brs\.?\b|\$|₨|₹)/i.test(text),
    viewportMeta: /<meta[^>]+name=["']viewport["']/i.test(html),
    source: "supplied-html",
  };
}
