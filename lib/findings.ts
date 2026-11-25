import { DIMENSIONS, questionsFor, type DimensionId, type Evidence } from "./questions";
import type { Profile } from "./profile";
import { scoreProfile } from "./scoring";

/**
 * Findings: the rules that turn a profile into specific, evidenced work, ordered by the score they unlock.
 */

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
  const model = scoreProfile(profile);
  const scored = new Map(model.dimensions.map((d) => [d.id, d]));
  // Same renormalisation as leverage: a dimension's share of the score depends on how much of the model
  // has been answered, so "unlocks" has to be computed from that share rather than the raw weight.
  const totalWeight = model.dimensions.reduce((sum, d) => (d.score === null ? sum : sum + d.weight), 0);

  const fired = RULES.filter((rule) => {
    try {
      return rule.when(profile);
    } catch {
      return false;
    }
  });
  // Count the findings that actually fired in each dimension. Counting every defined rule instead
  // diluted a dimension whose other rules happen not to apply to this business, so the list was ordered
  // by a number that did not describe the finding it was attached to.
  const openByDimension = new Map<string, number>();
  for (const rule of fired) {
    openByDimension.set(rule.dimension, (openByDimension.get(rule.dimension) ?? 0) + 1);
  }

  return fired
    .map((rule) => {
      const dim = dims.get(rule.dimension);
      const score = scored.get(rule.dimension);
      const headroom = score?.score === null || score?.score === undefined ? 100 : 100 - score.score;
      // Unlocks = this dimension's weight spread across its open findings, scaled by impact and by how
      // much headroom the dimension has. It orders the list; it does not promise a score increase.
      const open = openByDimension.get(rule.dimension) ?? 1;
      const share = totalWeight === 0 ? 0 : (dim?.weight ?? 0.1) / totalWeight;
      const unlocks = Number(((share * headroom * rule.impact) / (5 * Math.max(1, open))).toFixed(1));
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
