import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "../components/Hero";

describe("Hero", () => {
  it("renders the eyebrow, headline, and CTA copy", async () => {
    render(<Hero />);

    expect(screen.getByText("RYMX — CAIRO / SS26")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reveal yourmistakes.");

    const cta = screen.getByRole("link", { name: /reveal the collection/i });
    expect(cta).toHaveAttribute("href", "/shop");
  });

  it("falls back to a static wordmark when WebGL is unavailable", async () => {
    render(<Hero />);

    await waitFor(() => {
      expect(screen.getByText("RYMX", { selector: "span" })).toBeInTheDocument();
    });
  });
});
