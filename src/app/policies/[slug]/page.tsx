import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPolicies } from "@/modules/settings/server";

const SLUGS = {
  returns: { title: "Returns policy", field: "returnsPolicy" },
  privacy: { title: "Privacy policy", field: "privacyPolicy" },
  terms: { title: "Terms of service", field: "termsPolicy" },
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
  // eslint-disable-next-line security/detect-object-injection -- slug is narrowed to the Slug union by isValidSlug above
  return { title: `${SLUGS[slug].title} — RYMX` };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const policies = await getPolicies();
  // eslint-disable-next-line security/detect-object-injection -- slug is narrowed to the Slug union by isValidSlug above
  const { title, field } = SLUGS[slug];
  // eslint-disable-next-line security/detect-object-injection -- field comes from this module's own SLUGS map, not user input
  const body = policies[field];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">{title}</h1>
      {body ? (
        <p className="text-rymx-cream/80 font-mono text-sm whitespace-pre-wrap">{body}</p>
      ) : (
        <p className="text-rymx-cream/50 font-mono text-sm">
          This page hasn&apos;t been written yet.
        </p>
      )}
    </div>
  );
}
