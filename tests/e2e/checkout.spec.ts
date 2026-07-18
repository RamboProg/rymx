import { expect, test, type Page } from "@playwright/test";

// Requires the Firebase emulators running with seeded catalog + discount data
// (`pnpm seed`) and NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true. These tests
// place real COD orders and decrement real (emulator) stock, so — unlike
// shop.spec.ts's read-only tests — they are NOT safe to run twice against the
// same emulator session. They're restricted to a single Playwright project
// here; re-run `pnpm seed` between local runs of this file.
test.describe("checkout", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Stock-mutating checkout flow runs once (chromium only) to avoid double-consuming seeded stock.",
    );
  });

  async function addToCart(page: Page, slug: string, optionValues: string[]) {
    await page.goto(`/shop/${slug}`);
    for (const value of optionValues) {
      await page.getByRole("button", { name: value, exact: true }).click();
    }
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("button", { name: "Added to cart" })).toBeVisible();
  }

  async function fillShipping(page: Page, email?: string) {
    if (email) {
      await page.getByLabel("Email").fill(email);
    }
    await page.getByLabel("Full name").fill("Sara Ahmed");
    await page.getByLabel("Phone").fill("01012345678");
    await page.getByLabel("Governorate").fill("Cairo");
    await page.getByLabel("City").fill("Maadi");
    await page.getByLabel("Address").fill("12 Nile St.");
  }

  test("completes a guest COD purchase", async ({ page }) => {
    await addToCart(page, "nile-tee", ["S"]);
    await page.goto("/cart");
    await page.getByRole("link", { name: "Continue to checkout" }).click();

    await fillShipping(page, `guest-${Date.now()}@rymx.test`);
    await page.getByRole("button", { name: "Place order (COD)" }).click();

    await expect(page).toHaveURL(/\/checkout\/confirmation\?order=/);
    await expect(page.getByRole("heading", { name: /Thank you, Sara Ahmed/ })).toBeVisible();
  });

  test("completes a signed-in COD purchase", async ({ page }) => {
    const email = `checkout-${Date.now()}@rymx.test`;
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    await addToCart(page, "nile-tee", ["M"]);
    await page.goto("/cart");
    await page.getByRole("link", { name: "Continue to checkout" }).click();

    // No guest email field for a signed-in checkout.
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await fillShipping(page);
    await page.getByRole("button", { name: "Place order (COD)" }).click();

    await expect(page).toHaveURL(/\/checkout\/confirmation\?order=/);
    await expect(page.getByRole("heading", { name: /Thank you, Sara Ahmed/ })).toBeVisible();
  });

  test("rejects an invalid promo code", async ({ page }) => {
    await addToCart(page, "nile-tee", ["S"]);
    await page.goto("/checkout");
    await fillShipping(page, `promo-invalid-${Date.now()}@rymx.test`);

    await page.getByLabel("Promo code").fill("NOPE-NOT-REAL");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Invalid promo code.")).toBeVisible();
  });

  test("rejects an expired promo code", async ({ page }) => {
    await addToCart(page, "nile-tee", ["S"]);
    await page.goto("/checkout");
    await fillShipping(page, `promo-expired-${Date.now()}@rymx.test`);

    await page.getByLabel("Promo code").fill("EXPIRED5");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("This promo code has expired.")).toBeVisible();
  });

  test("applies a valid promo code and enforces per-user single-use", async ({ page }) => {
    const email = `promo-valid-${Date.now()}@rymx.test`;

    await addToCart(page, "nile-tee", ["S"]);
    await page.goto("/checkout");
    await fillShipping(page, email);
    await page.getByLabel("Promo code").fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Code WELCOME10 applied")).toBeVisible();

    await page.getByRole("button", { name: "Place order (COD)" }).click();
    await expect(page).toHaveURL(/\/checkout\/confirmation\?order=/);
    await expect(page.getByText(/Discount \(WELCOME10\)/)).toBeVisible();

    // Same customer, same code, second order: must be refused as already used.
    await addToCart(page, "nile-tee", ["M"]);
    await page.goto("/checkout");
    await fillShipping(page, email);
    await page.getByLabel("Promo code").fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("You've already used this promo code.")).toBeVisible();
  });

  test("idempotent submit: double-firing the checkout form only places one order", async ({
    page,
  }) => {
    await addToCart(page, "desert-cargo-pants", ["30", "Sand"]);
    await page.goto("/checkout");
    await fillShipping(page, `idempotent-${Date.now()}@rymx.test`);

    // Fire the form's submit twice in the same synchronous browser task, before
    // React re-renders to disable the button — both invocations race with the
    // same client-generated idempotency key, and only the first should count.
    await page.evaluate(() => {
      const form = document.querySelector("form");
      form?.requestSubmit();
      form?.requestSubmit();
    });
    await expect(page).toHaveURL(/\/checkout\/confirmation\?order=/);

    // Desert Cargo Pants 30/Sand started at stock 6. If the double-submit only
    // decremented once, exactly 5 should remain (visible as 5 quantity options).
    await addToCart(page, "desert-cargo-pants", ["30", "Sand"]);
    await page.goto("/cart");
    const qtyOptions = page.locator('select[id^="qty-"] option');
    await expect(qtyOptions).toHaveCount(5);
  });

  test("rejects an oversell under concurrent checkout", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // Cairo Bomber Jacket / L starts at stock 5. Both buyers request 3 —
    // together that's 6, more than is available.
    await addToCart(pageA, "cairo-bomber-jacket", ["L"]);
    await pageA.goto("/cart");
    await pageA.getByLabel(/Quantity for/).selectOption("3");
    await pageA.getByRole("link", { name: "Continue to checkout" }).click();
    await fillShipping(pageA, `race-a-${Date.now()}@rymx.test`);

    await addToCart(pageB, "cairo-bomber-jacket", ["L"]);
    await pageB.goto("/cart");
    await pageB.getByLabel(/Quantity for/).selectOption("3");
    await pageB.getByRole("link", { name: "Continue to checkout" }).click();
    await fillShipping(pageB, `race-b-${Date.now()}@rymx.test`);

    // Both carts were resolved while stock was still 5; submit both at once.
    // Race each page's own outcome — waiting on the /checkout URL alone is
    // useless since that's already the current URL before either submits.
    // The alert check is scoped to the form: Next.js's App Router injects its
    // own hidden route-announcer with role="alert" on every page, which would
    // otherwise match instantly regardless of the real checkout outcome.
    async function awaitOutcome(page: Page): Promise<"confirmed" | "failed"> {
      return Promise.race([
        page.waitForURL(/\/checkout\/confirmation\?order=/).then(() => "confirmed" as const),
        page
          .locator("form")
          .getByRole("alert")
          .waitFor({ state: "visible" })
          .then(() => "failed" as const),
      ]);
    }

    const [outcomeA, outcomeB] = await Promise.all([
      awaitOutcome(pageA),
      awaitOutcome(pageB),
      pageA.getByRole("button", { name: "Place order (COD)" }).click(),
      pageB.getByRole("button", { name: "Place order (COD)" }).click(),
    ]);

    const outcomes = [outcomeA, outcomeB];
    expect(outcomes.filter((o) => o === "confirmed")).toHaveLength(1);

    const failedPage = outcomeA === "failed" ? pageA : pageB;
    await expect(failedPage.locator("form").getByRole("alert")).toContainText(
      /only has \d+ left in stock/,
    );

    await ctxA.close();
    await ctxB.close();
  });
});
