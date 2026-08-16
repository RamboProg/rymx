import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPolicies } from "@/modules/settings/server";

const SLUGS = {
  returns: "returnsPolicy",
  privacy: "privacyPolicy",
  terms: "termsPolicy",
} as const;

type Slug = keyof typeof SLUGS;

function isValidSlug(slug: string): slug is Slug {
  return slug in SLUGS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return {};
  const t = await getTranslations("policies");
  return { title: `${t(slug)} — RYMX` };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const [policies, t] = await Promise.all([getPolicies(), getTranslations("policies")]);
  // eslint-disable-next-line security/detect-object-injection -- slug is narrowed to the Slug union by isValidSlug above
  const field = SLUGS[slug];
  // eslint-disable-next-line security/detect-object-injection -- field comes from this module's own SLUGS map, not user input
  const body = policies[field];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">{t(slug)}</h1>
      {body ? (
        <p className="text-rymx-cream/80 font-mono text-sm whitespace-pre-wrap">{body}</p>
      ) : (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("notWritten")}</p>
      )}
    </div>
  );
}
