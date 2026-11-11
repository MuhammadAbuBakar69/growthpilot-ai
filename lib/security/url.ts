/**
 * SSRF guard for anything that will fetch a user-supplied URL.
 *
 * Two hard truths about this class of bug: string checks are not enough, and a check at parse time is not
 * enough either, because DNS can resolve a public name to a private address and a 302 can point anywhere.
 * So this module (a) validates the literal URL, (b) exposes `isBlockedAddress` for the caller to apply to
 * resolved DNS answers, and (c) requires every redirect hop to pass the same validation before it is
 * followed. The server that owns the socket must do (b) on each hop; the tests here prove (a) and (c).
 */

export type BlockReason =
  | "empty" | "too_long" | "not_absolute" | "bad_scheme" | "credentials" | "bad_port"
  | "internal_hostname" | "ipv4_private" | "ipv6_private" | "metadata_endpoint" | "encoded_octal";

export class UnsafeUrlError extends Error {
  readonly reason: BlockReason;
  constructor(reason: BlockReason, detail: string) {
    super(`${reason}: ${detail}`);
    this.name = "UnsafeUrlError";
    this.reason = reason;
  }
}

const ALLOWED_PORTS = new Set([80, 443]);

const INTERNAL_SUFFIXES = [
  "localhost", ".localhost", ".local", ".internal", ".intranet", ".lan",
  ".home.arpa", ".corp", ".private", ".localdomain", ".onion",
];

const METADATA_HOSTS = ["metadata.google.internal", "metadata", "instance-data", "169.254.169.254", "[fd00:ec2::254]"];

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,          // link-local, includes cloud metadata
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  /^198\.(1[89])\./,      // benchmarking
  /^192\.0\.(0|2)\./,
  /^198\.51\.100\./, /^203\.0\.113\./, /^192\.0\.2\./, // documentation
  /^(22[4-9]|23\d|24\d|25[0-5])\./,                   // multicast and reserved
];

/** 2130706433 is 127.0.0.1. The WHATWG parser canonicalises what it can, but a raw host string from a
 *  resolver or a redirect Location header must not slip through as "not an IP". */
export function decimalToIpv4(value: string): string | null {
  if (!/^\d{1,10}$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > 0xffffffff) return null;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function isBlockedAddress(address: string): boolean {
  const host = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (METADATA_HOSTS.includes(host)) return true;
  const decimal = decimalToIpv4(host);
  if (decimal) return isBlockedAddress(decimal);

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return PRIVATE_V4.some((re) => re.test(host));

  // IPv6: loopback, unspecified, ULA, link-local, link-local mapped, and IPv4-mapped forms.
  if (host === "::1" || host === "::" || host === "0:0:0:0:0:0:0:1") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;           // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;           // fe80::/10 link local
  const mapped = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isBlockedAddress(mapped[1]);
  return false;
}

const isIpLiteral = (host: string): boolean =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^[0-9a-f:]+$/i.test(host) && host.includes(":");

/** Normalises the URL before any check: lowercase host, no fragment, no default port, tracking params dropped. */
export function normalizeUrl(raw: string): URL {
  const trimmed = raw.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.port === "80" && url.protocol === "http:") || (url.port === "443" && url.protocol === "https:")) url.port = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_\w*|gclid|fbclid|msclkid|ref|source)$/i.test(key)) url.searchParams.delete(key);
  }
  return url;
}

export function assertSafeUrl(raw: string): URL {
  if (!raw || !raw.trim()) throw new UnsafeUrlError("empty", "no URL supplied");
  if (raw.length > 2048) throw new UnsafeUrlError("too_long", `${raw.length} characters`);

  // A declared scheme that is not http(s) is rejected as itself. Passing "javascript:alert(1)" through
  // URL normalisation would mangle it into an unparseable https attempt and lose the real reason.
  const declared = raw.trim().match(/^([a-z][a-z0-9+.-]*):/i);
  if (declared && !/^https?$/i.test(declared[1])) throw new UnsafeUrlError("bad_scheme", declared[1]);

  let url: URL;
  try {
    url = normalizeUrl(raw);
  } catch {
    throw new UnsafeUrlError("not_absolute", `cannot parse ${raw.slice(0, 80)}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("bad_scheme", url.protocol);
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("credentials", "embedded credentials are never forwarded");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new UnsafeUrlError("not_absolute", "no host");
  // IPv6 literals arrive bracketed from the URL parser and every check below expects a bare address.
  const bare = host.replace(/^\[|\]$/g, "");

  // Decimal, octal and hex IPv4 spellings resolve to the same address as the dotted form, so a literal
  // check on "169.254.169.254" alone is not enough: 2852039166 is that address too.
  if (/^\d+$/.test(host)) throw new UnsafeUrlError("encoded_octal", host);
  if (/^0x[0-9a-f]+$/i.test(host)) throw new UnsafeUrlError("encoded_octal", host);

  // Metadata endpoints are named explicitly: they are hostnames, but the reason matters for the operator.
  if (METADATA_HOSTS.includes(bare)) throw new UnsafeUrlError("metadata_endpoint", bare);
  if (INTERNAL_SUFFIXES.some((suffix) => bare === suffix.replace(/^\./, "") || bare.endsWith(suffix))) {
    throw new UnsafeUrlError("internal_hostname", bare);
  }

  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) throw new UnsafeUrlError("bad_port", String(port));

  if (isIpLiteral(bare) && isBlockedAddress(bare)) {
    throw new UnsafeUrlError(bare.includes(":") ? "ipv6_private" : "ipv4_private", bare);
  }

  return url;
}

/** Every hop is checked. A 302 to 127.0.0.1 is rejected before it is followed. */
export function assertSafeRedirect(chain: string[], maxHops = 5): URL[] {
  if (chain.length > maxHops) throw new UnsafeUrlError("bad_scheme", `more than ${maxHops} redirects`);
  return chain.map((hop) => assertSafeUrl(hop));
}

/**
 * Called by the server with the addresses DNS returned for the validated host. A public hostname that
 * resolves privately is the classic bypass, and it can only be caught after resolution.
 */
export function assertResolvedAddresses(addresses: string[]): void {
  if (addresses.length === 0) throw new UnsafeUrlError("not_absolute", "host did not resolve");
  const blocked = addresses.filter((a) => isBlockedAddress(a));
  if (blocked.length > 0) {
    throw new UnsafeUrlError(blocked[0].includes(":") ? "ipv6_private" : "ipv4_private", `resolved to ${blocked[0]}`);
  }
}
