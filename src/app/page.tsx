import { Hero } from "@/modules/landing/components/Hero";
import { getContentSettings } from "@/modules/content/server";

export default async function Home() {
  const content = await getContentSettings();
  return (
    <Hero eyebrow={content.heroEyebrow} headline={content.heroHeadline} cta={content.heroCta} />
  );
}
