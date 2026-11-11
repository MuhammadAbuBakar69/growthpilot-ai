import { describe, expect, it } from "vitest";
import { auditSite, crossCheck } from "./audit";
import { emptyProfile, extractSiteFacts, type Profile } from "./engine";

const profile = (html: string | null, answers: Record<string, number>): Profile => ({
  ...emptyProfile(),
  id: "t",
  answers,
  site: html === null ? null : extractSiteFacts(html),
});

const WEAK = `<html lang="en"><head><title>Stitch</title></head><body>
<h1>Embroidery</h1><h1>Uniforms</h1><img src="a.jpg"><p>We embroider.</p></body></html>`;

const STRONG = `<html lang="en"><head>
<title>Custom uniform embroidery in Karachi | Stitch Co</title>
<meta name="description" content="Small-batch embroidery for hotels and uniform suppliers.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>gtag('config','G-1')</script>
<script type="application/ld+json">{}</script>
</head><body>
<nav><a href="/work">Work</a><a href="/pricing">Pricing</a><a href="/contact">Contact</a></nav>
<h1>Embroidery for hotel uniforms</h1>
<h2>What clients say</h2>
<blockquote>"Delivered 400 uniforms in nine days." — Ayesha, Pearl Continental</blockquote>
<h2>Our work</h2>
<p>Our portfolio covers 60 hotels. Reviews on Google rate us 4.9 stars.
Prices from 25 PKR per piece. Guarantee: remake within 7 days.</p>
<h2>Contact</h2>
<a href="tel:+923001234567">+92 300 1234567</a>
<a href="mailto:hello@stitch.co">Email us</a>
<a href="https://instagram.com/stitchco">Instagram</a>
<form action="/q"><input name="a"></form>
<p>We have been embroidering uniforms for hotels, restaurants and hospitals in Karachi since 2014,
working in small batches so that a reorder six months later looks exactly like the first delivery.</p>
</body></html>`;

describe("site audit", () => {
  it("marks a thin page as missing the things that sell", () => {
    const signals = auditSite(extractSiteFacts(WEAK));
    const byId = new Map(signals.map((s) => [s.id, s]));
    expect(byId.get("h1")?.status).toBe("unclear");
    expect(byId.get("testimonials")?.status).toBe("missing");
    expect(byId.get("price")?.status).toBe("missing");
    expect(byId.get("viewport")?.status).toBe("missing");
    expect(byId.get("analytics")?.status).toBe("missing");
    expect(byId.get("alt")?.status).toBe("missing");
  });

  it("finds what a complete page actually proves, with the snippet as evidence", () => {
    const signals = auditSite(extractSiteFacts(STRONG));
    const byId = new Map(signals.map((s) => [s.id, s]));
    expect(byId.get("h1")?.status).toBe("found");
    expect(byId.get("testimonials")?.status).toBe("found");
    expect(byId.get("testimonials")?.evidence).toMatch(/review|testimonial|stars/i);
    expect(byId.get("price")?.status).toBe("found");
    expect(byId.get("guarantee")?.status).toBe("found");
    expect(byId.get("viewport")?.status).toBe("found");
    expect(byId.get("analytics")?.status).toBe("found");
    expect(byId.get("structured")?.status).toBe("found");
    expect(byId.get("contact")?.detail).toContain("phone");
    expect(signals.every((s) => s.consequence.length > 20 && s.fix.length > 10)).toBe(true);
  });

  it("returns null without a page, and never invents a contradiction", () => {
    expect(crossCheck(profile(null, { tru_testimonial: 3 }))).toBeNull();
    const checks = crossCheck(profile(WEAK, {}));
    expect(checks?.contradictions).toEqual([]);
    expect(checks?.checked).toBe(0);
  });

  it("flags a strong claim the page does not support", () => {
    const checks = crossCheck(profile(WEAK, { tru_testimonial: 3, off_price: 3, mea_analytics: 2 }));
    const ids = checks?.contradictions.map((c) => c.id) ?? [];
    expect(ids).toContain("testimonials");
    expect(ids).toContain("price");
    expect(ids).toContain("analytics");
    // A weak claim is not a contradiction: the owner already agrees with the page.
    const weak = crossCheck(profile(WEAK, { tru_testimonial: 0 }));
    expect(weak?.contradictions).toEqual([]);
  });

  it("confirms claims the page does support instead of contradicting them", () => {
    const checks = crossCheck(profile(STRONG, { tru_testimonial: 3, off_price: 3, mea_analytics: 3, con_contact: 3 }));
    expect(checks?.contradictions.length).toBe(0);
    expect(checks?.confirmed.map((c) => c.id).sort()).toEqual(["analytics", "contact", "price", "testimonials"]);
  });
});
