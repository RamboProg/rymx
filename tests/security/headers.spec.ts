import { expect, test } from "@playwright/test";

test.describe("baseline security headers", () => {
  test("home page response includes OWASP baseline headers", async ({ request, baseURL }) => {
    const response = await request.get(baseURL!);
    const headers = response.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });
});
