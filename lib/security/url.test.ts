import { describe, expect, it } from "vitest";
import {
  assertResolvedAddresses, assertSafeRedirect, assertSafeUrl, decimalToIpv4, isBlockedAddress,
  normalizeUrl, UnsafeUrlError,
} from "./url";

const rejects = (input: string, reason: string) => {
  try {
    assertSafeUrl(input);
    throw new Error(`expected ${input} to be rejected`);
  } catch (error) {
    expect(error).toBeInstanceOf(UnsafeUrlError);
    expect((error as UnsafeUrlError).reason).toBe(reason);
  }
};

describe("SSRF guard", () => {
  it("accepts a normal public URL and adds https when no scheme is given", () => {
    expect(assertSafeUrl("https://example.com/pricing").hostname).toBe("example.com");
    expect(assertSafeUrl("example.com").protocol).toBe("https:");
  });

  it("rejects loopback, private, link-local and metadata targets", () => {
    rejects("http://localhost:8080/admin", "internal_hostname");
    rejects("http://127.0.0.1/", "ipv4_private");
    rejects("http://10.0.0.5/", "ipv4_private");
    rejects("http://192.168.1.1/", "ipv4_private");
    rejects("http://172.20.10.1/", "ipv4_private");
    rejects("http://169.254.169.254/latest/meta-data/", "metadata_endpoint");
    rejects("http://[::1]/", "ipv6_private");
    rejects("http://[fd00::1]/", "ipv6_private");
  });

  it("rejects decimal and hex spellings of the same address", () => {
    // The URL parser canonicalises some of these, the raw-address check catches the rest. Either way the
    // request never leaves: what matters is the rejection, and the reason is whichever form it saw.
    for (const input of ["http://2130706433/", "http://0x7f000001/", "http://0177.0.0.1/", "http://127.1/", "http://0/"]) {
      expect(() => assertSafeUrl(input)).toThrow(UnsafeUrlError);
    }
    expect(isBlockedAddress("2852039166")).toBe(true);
    expect(decimalToIpv4("2852039166")).toBe("169.254.169.254");
    expect(decimalToIpv4("example.com")).toBeNull();
  });

  it("rejects internal hostnames, credentials and odd ports and schemes", () => {
    rejects("http://metadata.google.internal/", "metadata_endpoint");
    rejects("http://printer.local/", "internal_hostname");
    rejects("http://intranet.corp/", "internal_hostname");
    rejects("https://user:pass@example.com/", "credentials");
    rejects("http://example.com:22/", "bad_port");
    rejects("file:///etc/passwd", "bad_scheme");
    rejects("javascript:alert(1)", "bad_scheme");
    rejects("", "empty");
  });

  it("checks every redirect hop, so a 302 to loopback never gets followed", () => {
    expect(() => assertSafeRedirect(["https://example.com", "https://example.com/pricing"])).not.toThrow();
    expect(() => assertSafeRedirect(["https://example.com", "http://127.0.0.1/"])).toThrow(UnsafeUrlError);
    expect(() => assertSafeRedirect(Array(7).fill("https://example.com"))).toThrow(UnsafeUrlError);
  });

  it("blocks a public hostname that resolves to a private address", () => {
    expect(() => assertResolvedAddresses(["93.184.216.34"])).not.toThrow();
    expect(() => assertResolvedAddresses(["10.1.2.3"])).toThrow(/ipv4_private/);
    expect(() => assertResolvedAddresses(["::1"])).toThrow(/ipv6_private/);
    expect(() => assertResolvedAddresses([])).toThrow(/did not resolve/);
  });

  it("normalises before checking: fragment and tracking parameters removed", () => {
    const url = normalizeUrl("HTTPS://Example.COM:443/Path?utm_source=x&id=7#top");
    expect(url.hostname).toBe("example.com");
    expect(url.port).toBe("");
    expect(url.hash).toBe("");
    expect(url.searchParams.get("utm_source")).toBeNull();
    expect(url.searchParams.get("id")).toBe("7");
  });
});
