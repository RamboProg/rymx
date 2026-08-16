import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-rymx-cream/10 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-rymx-cream/40 font-mono text-xs tracking-[0.1em] uppercase">
          {t("location")}
        </p>
        <p className="text-rymx-cream/40 font-mono text-xs tracking-[0.1em] uppercase">
          &copy; {new Date().getFullYear()} {t("rightsReserved")}
        </p>
      </div>
    </footer>
  );
}
