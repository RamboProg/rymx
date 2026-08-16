import { expect, test } from "@playwright/test";

test.describe("baseline security headers", () => {
  test("home page response includes OWASP baseline headers", async ({ request, baseURL }) => {
    const response = await request.get(baseURL!);
    const headers = response.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["strict-transport-security"]).toContain("max-age=");
  });

  test("home page response includes a strict Content-Security-Policy", async ({
    request,
    baseURL,
  }) => {
    const response = await request.get(baseURL!);
    const csp = response.headers()["content-security-policy"];

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src[^;]*'nonce-[^']+'/);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    // 'unsafe-eval' is a next-dev-only allowance for Fast Refresh — must
    // never reach a real (production) deploy's CSP.
    if (process.env.PLAYWRIGHT_BASE_URL) {
      expect(csp).not.toContain("'unsafe-eval'");
    }
  });

  test("each request gets its own CSP nonce", async ({ request, baseURL }) => {
    const [first, second] = await Promise.all([request.get(baseURL!), request.get(baseURL!)]);
    const nonceOf = (csp: string | undefined) => csp?.match(/'nonce-([^']+)'/)?.[1];

    const firstNonce = nonceOf(first.headers()["content-security-policy"]);
    const secondNonce = nonceOf(second.headers()["content-security-policy"]);

    expect(firstNonce).toBeTruthy();
    expect(firstNonce).not.toBe(secondNonce);
  });

  // The pixel loader (src/components/analytics/PixelScripts.tsx) and the
  // verify-email interstitial are new script/route surfaces — confirm
  // neither required relaxing the CSP (no 'unsafe-inline', no new hosts
  // beyond the Meta/TikTok domains already allowlisted pre-pixel).
  test("/verify-email gets the same strict nonce'd CSP as the home page", async ({
    request,
    baseURL,
  }) => {
    const response = await request.get(`${baseURL}/verify-email`);
    const csp = response.headers()["content-security-policy"];
    const scriptSrc = csp?.match(/script-src[^;]*/)?.[0];

    expect(csp).toBeTruthy();
    expect(scriptSrc).toMatch(/'nonce-[^']+'/);
    expect(scriptSrc).toContain("'strict-dynamic'");
    // style-src keeps 'unsafe-inline' (documented tradeoff in src/proxy.ts) —
    // only script-src must never relax to it.
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});
