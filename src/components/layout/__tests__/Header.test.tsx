import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/en.json";
import { HeaderNav } from "../HeaderNav";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// CartBadge's useCart hook talks to Firebase Auth + Server Actions on mount;
// this test only cares about HeaderNav's own markup, so stub it out.
vi.mock("@/modules/cart/hooks/useCart", () => ({
  useCart: () => ({ cart: { lines: [], subtotalMinor: 0, itemCount: 0, issues: [] } }),
}));

function renderHeaderNav(props: { signedIn: boolean; staff?: boolean }) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HeaderNav {...props} />
    </NextIntlClientProvider>,
  );
}

describe("HeaderNav", () => {
  it("renders the wordmark linking home and primary nav links", () => {
    renderHeaderNav({ signedIn: false });

    expect(screen.getByRole("link", { name: "RYMX" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Collections" })).toHaveAttribute(
      "href",
      "/collections",
    );
  });

  it("shows a sign-in link when signed out", () => {
    renderHeaderNav({ signedIn: false });

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("shows account + sign out when signed in", () => {
    renderHeaderNav({ signedIn: true });

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("shows a Dashboard link for staff", () => {
    renderHeaderNav({ signedIn: true, staff: true });

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin");
  });

  it("hides the Dashboard link from customers and signed-out visitors", () => {
    const { rerender } = renderHeaderNav({ signedIn: true, staff: false });
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <HeaderNav signedIn={false} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });
});
