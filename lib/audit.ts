/**
 * What the page itself proves, and where the owner's own answers disagree with it.
 *
 * This is the part a quiz cannot do: the owner says "we have testimonials", the page source has no
 * testimonial, no quote, no review markup. One of those is wrong, and both of them cost money. Every
 * claim here names which side is which - the owner's answer is `inferred`, the page is `measured`.
 */
import type { Evidence, Profile, Severity, SiteFacts } from "./engine";

export type SignalGroup = "positioning" | "offer" | "proof" | "conversion" | "content" | "technical";
export type SignalStatus = "found" | "missing" | "unclear";

export interface SiteSignal {
  id: string;
  group: SignalGroup;
  label: string;
  status: SignalStatus;
  detail: string;
  evidence: string | null;
  consequence: string;
  fix: string;
}

export const GROUPS: { id: SignalGroup; label: string; question: string }[] = [
  { id: "positioning", label: "Positioning", question: "Can a stranger tell what this is and who it is for?" },
  { id: "offer", label: "Offer & pricing", question: "Is there a clear offer, a price and a first step?" },
  { id: "proof", label: "Proof", question: "Is there evidence that this business delivers?" },
  { id: "conversion", label: "Conversion", question: "Can an interested visitor act without hunting?" },
  { id: "content", label: "Content", question: "Can it be found and read?" },
  { id: "technical", label: "Technical", question: "Does the page render and get measured?" },
];

const sig = (s: SiteSignal): SiteSignal => s;

export function auditSite(facts: SiteFacts): SiteSignal[] {
  const hasContact = facts.hasPhone || facts.hasEmail || facts.hasForm;
  return [
    sig({
      id: "h1", group: "positioning", label: "One headline stating the offer",
      status: facts.h1.length === 1 ? "found" : facts.h1.length === 0 ? "missing" : "unclear",
      detail: facts.h1.length === 0 ? "No H1 on the page" : `${facts.h1.length} H1 headline${facts.h1.length > 1 ? "s" : ""}`,
      evidence: facts.h1[0] ?? null,
      consequence: "The H1 is what a visitor reads first and what a search engine treats as the page's subject. Several compete; none leaves the subject undefined.",
      fix: "One H1 that names the offer and the audience. Demote the rest to H2.",
    }),
    sig({
      id: "title", group: "positioning", label: "Title written for a search result",
      status: facts.titleLength >= 15 && facts.titleLength <= 65 ? "found" : "missing",
      detail: facts.title === null ? "No title element" : `${facts.titleLength} characters`,
      evidence: facts.title,
      consequence: "The title is the clickable line in a search result. Company names mean nothing to someone who has not heard of you.",
      fix: "Service, audience, place, then the company name. 15-65 characters.",
    }),
    sig({
      id: "meta", group: "positioning", label: "Meta description",
      status: facts.metaDescription ? "found" : "missing",
      detail: facts.metaDescription ? `${facts.metaDescription.length} characters` : "None, so search engines invent one",
      evidence: facts.metaDescription,
      consequence: "The description is the pitch under your link. Left empty, a machine picks a sentence that may not sell.",
      fix: "120-155 characters: the offer, the proof, the next step.",
    }),
    sig({
      id: "nav", group: "positioning", label: "Navigable structure",
      status: facts.navItems.length >= 3 ? "found" : "missing",
      detail: facts.navItems.length ? `${facts.navItems.length} nav links` : "No nav element with links",
      evidence: facts.navItems.length ? facts.navItems.join(" · ") : null,
      consequence: "A visitor arrives on a page, not a site. Without visible structure they cannot tell what else you do.",
      fix: "Nav with the 3-5 things people actually buy, in their words.",
    }),

    sig({
      id: "price", group: "offer", label: "Price or price range visible",
      status: facts.mentionsPrice ? "found" : "missing",
      detail: facts.mentionsPrice ? "A price signal was found in the text" : "No price, range or 'from' figure anywhere",
      evidence: facts.priceSamples[0] ?? null,
      consequence: "Hiding price does not filter anyone; it moves the filtering into calls you have to attend. Published ranges drop the buyers who were never going to afford you.",
      fix: "A starting price or a range, with what moves it up.",
    }),
    sig({
      id: "cta", group: "offer", label: "One primary action",
      status: facts.ctaMatches === 0 ? "missing" : facts.ctaMatches > 12 ? "unclear" : "found",
      detail: facts.ctaMatches === 0 ? "No action wording found" : `${facts.ctaMatches} action phrases`,
      evidence: facts.ctaSamples[0] ?? null,
      consequence: "An action the visitor has to guess is an action they skip. More than a dozen competing phrases reads as no priority.",
      fix: "One primary action, repeated. Everything else becomes a text link.",
    }),
    sig({
      id: "first-step", group: "offer", label: "Low-risk first step",
      status: hasContact ? "found" : "missing",
      detail: hasContact ? "A route to start a conversation exists" : "No form, phone or email",
      evidence: null,
      consequence: "Asking for a purchase on first contact converts only the already-convinced.",
      fix: "A quote request, a 15-minute call, a sample. Something smaller than the sale.",
    }),

    sig({
      id: "testimonials", group: "proof", label: "Testimonials or reviews",
      status: facts.testimonialSamples.length > 0 ? "found" : "missing",
      detail: facts.testimonialSamples.length > 0 ? `${facts.testimonialSamples.length} mention${facts.testimonialSamples.length > 1 ? "s" : ""} of reviews or testimonials` : "No testimonial, review or rating language found",
      evidence: facts.testimonialSamples[0] ?? null,
      consequence: "This is the single most common gap on small-business sites: the owner knows the work is good, the page never shows it, so the buyer pays for that ignorance with hesitation.",
      fix: "Three customers, two sentences each, with a name and a company. Verbatim beats polished.",
    }),
    sig({
      id: "quotes", group: "proof", label: "Actual quoted text on the page",
      status: facts.blockquotes > 0 ? "found" : "missing",
      detail: facts.blockquotes > 0 ? `${facts.blockquotes} blockquote element${facts.blockquotes > 1 ? "s" : ""}` : "No blockquote markup",
      evidence: null,
      consequence: "A claim about quality is marketing; a customer's own words are evidence. Markup also tells a machine what it is reading.",
      fix: "Use blockquote with the person's name and role next to it.",
    }),
    sig({
      id: "work-proof", group: "proof", label: "Proof of real work",
      status: facts.proofSamples.length > 0 ? "found" : "missing",
      detail: facts.proofSamples.length > 0 ? "Portfolio or case-study language found" : "No portfolio, gallery or case-study language",
      evidence: facts.proofSamples[0] ?? null,
      consequence: "Stock imagery signals a template. Work you can point at signals a business that exists.",
      fix: "Three finished jobs with a photo each and one line on what changed for the client.",
    }),
    sig({
      id: "guarantee", group: "proof", label: "Guarantee or delivery promise",
      status: facts.guaranteeSamples.length > 0 ? "found" : "missing",
      detail: facts.guaranteeSamples.length > 0 ? "A promise signal was found" : "No guarantee, warranty or returns language",
      evidence: facts.guaranteeSamples[0] ?? null,
      consequence: "The first purchase carries the most perceived risk. A stated promise moves some of it off the buyer.",
      fix: "One promise you can keep every time, and what happens if you miss it.",
    }),

    sig({
      id: "contact", group: "conversion", label: "Contact route in the page",
      status: hasContact ? "found" : "missing",
      detail: [facts.hasPhone ? "phone" : null, facts.hasEmail ? "email" : null, facts.hasForm ? "form" : null].filter(Boolean).join(", ") || "None found",
      evidence: null,
      consequence: "Where buyers message rather than fill forms, a visible WhatsApp or phone is the shortest path to a conversation. A form only at the bottom of a long page is found by the already-convinced.",
      fix: "A message channel in the header and at the end of every page.",
    }),
    sig({
      id: "viewport", group: "conversion", label: "Mobile viewport tag",
      status: facts.viewportMeta ? "found" : "missing",
      detail: facts.viewportMeta ? "Present" : "Missing, so phones render a shrunken desktop page",
      evidence: null,
      consequence: "Most local and service traffic is mobile. Without this tag the text is unreadably small and taps miss.",
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    }),

    sig({
      id: "words", group: "content", label: "Enough text to be found and read",
      status: facts.wordCount >= 250 ? "found" : "missing",
      detail: `${facts.wordCount} words in the rendered text`,
      evidence: facts.textSample.slice(0, 180) + (facts.textSample.length > 180 ? "…" : ""),
      consequence: "A thin page gives a search engine nothing to match and a buyer nothing to decide with. Pages built by JavaScript also read thin here.",
      fix: "Answer the questions customers ask, in their words, on the page that sells that thing.",
    }),
    sig({
      id: "h2", group: "content", label: "Sections a reader can scan",
      status: facts.h2Count >= 3 ? "found" : "missing",
      detail: `${facts.h2Count} H2 section${facts.h2Count === 1 ? "" : "s"}`,
      evidence: null,
      consequence: "People scan before they read. Without section headings the page is one wall of text and gets abandoned.",
      fix: "Break the page into the questions a buyer asks, each with an H2.",
    }),
    sig({
      id: "alt", group: "content", label: "Images described in text",
      status: facts.imagesMissingAlt === 0 ? "found" : "missing",
      detail: facts.imageCount === 0 ? "No images found" : `${facts.imagesMissingAlt} of ${facts.imageCount} images have no alt text`,
      evidence: null,
      consequence: "Alt text is what search engines and screen readers use when the image cannot be seen.",
      fix: "One short sentence per image naming the thing and, where useful, the place.",
    }),
    sig({
      id: "social-links", group: "content", label: "Social profiles linked",
      status: facts.socialLinks.length > 0 ? "found" : "missing",
      detail: facts.socialLinks.length ? facts.socialLinks.join(", ") : "None found in links",
      evidence: null,
      consequence: "A buyer who wants to check you are real looks for a profile with history. Not linking one is a dead end at the point of doubt.",
      fix: "Link the profiles you actually maintain, not every platform you signed up for.",
    }),

    sig({
      id: "analytics", group: "technical", label: "Analytics installed",
      status: facts.analytics ? "found" : "missing",
      detail: facts.analytics ? `Detected: ${facts.analytics.replace(/\($/, "")}` : "No analytics or tag manager script",
      evidence: null,
      consequence: "Without measurement no improvement can be told apart from luck, so every change is work taken on faith.",
      fix: "One privacy-respecting script, and one event that counts as a lead.",
    }),
    sig({
      id: "lang", group: "technical", label: "Page language declared",
      status: facts.lang ? "found" : "missing",
      detail: facts.lang ? "lang attribute present" : "No lang attribute",
      evidence: null,
      consequence: "Screens readers and translation tools need it to pick the right voice; search uses it to serve the page to the right market.",
      fix: 'Set <html lang="en"> or the language you actually sell in.',
    }),
    sig({
      id: "structured", group: "technical", label: "Structured data for search",
      status: facts.structuredData ? "found" : "missing",
      detail: facts.structuredData ? "JSON-LD block found" : "None",
      evidence: null,
      consequence: "LocalBusiness schema is what puts hours, location and ratings into a search result instead of a plain blue link.",
      fix: "One LocalBusiness or Product JSON-LD block with name, address, phone and hours.",
    }),
  ];
}

export interface CrossCheck {
  id: string;
  severity: Severity;
  claim: string;
  claimed: string;
  page: string;
  note: string;
  fix: string;
}

interface Claim {
  id: string;
  questionId: string;
  severity: Severity;
  claim: string;
  /** true = the page supports it, false = it does not, null = cannot tell from this HTML. */
  pageSupports: (f: SiteFacts) => boolean | null;
  pageSays: (f: SiteFacts) => string;
  note: string;
  fix: string;
}

const CLAIMS: Claim[] = [
  {
    id: "testimonials", questionId: "tru_testimonial", severity: "high",
    claim: "You said testimonials exist",
    pageSupports: (f) => f.testimonialSamples.length > 0 || f.blockquotes > 0,
    pageSays: (f) => (f.testimonialSamples.length > 0 ? `${f.testimonialSamples.length} mention(s) of reviews or testimonials` : "no testimonial, review or rating language"),
    note: "One of the two is wrong. If the testimonials are real they are not on the page; if they are not on the page they are not doing any work.",
    fix: "Put three of them on the page, with names and companies, or correct the answer.",
  },
  {
    id: "price", questionId: "off_price", severity: "high",
    claim: "You said a price or range is published",
    pageSupports: (f) => f.mentionsPrice,
    pageSays: (f) => (f.mentionsPrice ? "a price signal was found" : "no price, range or 'from' figure"),
    note: "A price the buyer cannot find is a price you do not publish, whatever the intention.",
    fix: "Add a starting price where the offer is described.",
  },
  {
    id: "contact", questionId: "con_contact", severity: "high",
    claim: "You said contact details are easy to find",
    pageSupports: (f) => f.hasPhone || f.hasEmail || f.hasForm,
    pageSays: (f) => [f.hasPhone ? "phone" : null, f.hasEmail ? "email" : null, f.hasForm ? "form" : null].filter(Boolean).join(", ") || "no phone, email or form in the source",
    note: "The page you pasted is the page buyers land on. A contact route rendered by script would not appear here, so check the live page before changing anything.",
    fix: "A visible message channel in the first screen.",
  },
  {
    id: "cta", questionId: "con_cta", severity: "medium",
    claim: "You said every page ends with a clear action",
    pageSupports: (f) => f.ctaMatches > 0,
    pageSays: (f) => (f.ctaMatches > 0 ? `${f.ctaMatches} action phrase(s)` : "no action wording at all"),
    note: "If this page has none, the visitor is being asked to want something without being told how to get it.",
    fix: "One primary action, repeated down the page.",
  },
  {
    id: "guarantee", questionId: "tru_policy", severity: "medium",
    claim: "You said a guarantee or delivery promise is stated",
    pageSupports: (f) => f.guaranteeSamples.length > 0,
    pageSays: (f) => (f.guaranteeSamples.length > 0 ? "a promise signal was found" : "no guarantee, warranty or returns language"),
    note: "The promise may be made on a call. On the page it is absent, and the page is where the decision happens.",
    fix: "State it where the price is.",
  },
  {
    id: "analytics", questionId: "mea_analytics", severity: "high",
    claim: "You said analytics is installed",
    pageSupports: (f) => Boolean(f.analytics),
    pageSays: (f) => (f.analytics ? `detected ${f.analytics.replace(/\($/, "")}` : "no analytics or tag manager script in the source"),
    note: "If no script is in the HTML, nothing is being recorded. This is the cheapest thing on the list to fix and it makes every other change checkable.",
    fix: "Install one script and one lead event today.",
  },
  {
    id: "title", questionId: "cnt_title", severity: "low",
    claim: "You said the title describes the offer",
    pageSupports: (f) => f.titleLength >= 15 && f.titleLength <= 65,
    pageSays: (f) => (f.title ? `"${f.title}" (${f.titleLength} characters)` : "no title element"),
    note: "Short titles are usually the company name, which tells a stranger nothing.",
    fix: "Service, audience, place, then the name.",
  },
];

export interface CrossCheckResult {
  checked: number;
  contradictions: CrossCheck[];
  confirmed: { id: string; claim: string; page: string }[];
  skipped: number;
}

/**
 * Only answers the owner actually gave are checked, and only against facts the parser can see. A claim
 * the page neither supports nor contradicts is skipped, not guessed.
 */
export function crossCheck(profile: Profile): CrossCheckResult | null {
  const site = profile.site;
  if (!site) return null;
  const contradictions: CrossCheck[] = [];
  const confirmed: CrossCheckResult["confirmed"] = [];
  let checked = 0;
  let skipped = 0;

  for (const claim of CLAIMS) {
    const answer = profile.answers[claim.questionId];
    if (typeof answer !== "number") { skipped += 1; continue; }
    const supports = claim.pageSupports(site);
    if (supports === null) { skipped += 1; continue; }
    checked += 1;
    // A strong claim (2-3) the page does not support is a contradiction. A weak claim is not: the
    // owner already agreed with the page, so there is nothing to reconcile.
    if (answer >= 2 && !supports) {
      contradictions.push({
        id: claim.id, severity: claim.severity, claim: claim.claim,
        claimed: `answered ${answer}/3`, page: claim.pageSays(site),
        note: claim.note, fix: claim.fix,
      });
    } else if (supports) {
      confirmed.push({ id: claim.id, claim: claim.claim.replace(/^You said /, "Page confirms "), page: claim.pageSays(site) });
    }
  }

  return { checked, contradictions, confirmed, skipped };
}

export const evidenceOf = (kind: "answer" | "page"): Evidence => (kind === "page" ? "measured" : "inferred");
