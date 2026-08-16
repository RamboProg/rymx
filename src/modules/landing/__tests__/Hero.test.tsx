import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/en.json";
import { Hero } from "../components/Hero";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderHero() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Hero />
    </NextIntlClientProvider>,
  );
}

describe("Hero", () => {
  it("renders the eyebrow, headline, and CTA copy", async () => {
    renderHero();

    expect(screen.getByText("RYMX — CAIRO / SS26")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reveal your mistakes.");

    const cta = screen.getByRole("link", { name: /reveal the collection/i });
    expect(cta).toHaveAttribute("href", "/shop");
  });

  it("falls back to a static wordmark when WebGL is unavailable", async () => {
    renderHero();

    await waitFor(() => {
      expect(screen.getByText("RYMX", { selector: "span" })).toBeInTheDocument();
    });
  });
});
