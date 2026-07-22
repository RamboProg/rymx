"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Input";
import { contentSettingsSchema, type ContentSettings } from "../../schema";
import { updateContentSettingsAction } from "../../server/actions";

export function ContentSettingsForm({ settings }: { settings: ContentSettings }) {
  const router = useRouter();
  const [announcementEnabled, setAnnouncementEnabled] = useState(settings.announcementEnabled);
  const [announcementText, setAnnouncementText] = useState(settings.announcementText);
  const [announcementHref, setAnnouncementHref] = useState(settings.announcementHref);
  const [heroEyebrow, setHeroEyebrow] = useState(settings.heroEyebrow);
  const [heroHeadline, setHeroHeadline] = useState(settings.heroHeadline);
  const [heroCta, setHeroCta] = useState(settings.heroCta);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = contentSettingsSchema.safeParse({
      announcementEnabled,
      announcementText,
      announcementHref,
      heroEyebrow,
      heroHeadline,
      heroCta,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = await updateContentSettingsAction(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Checkbox
        id="announcementEnabled"
        label="Show announcement bar"
        checked={announcementEnabled}
        onChange={setAnnouncementEnabled}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="announcementText"
          label="Announcement text"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
        />
        <Field
          id="announcementHref"
          label="Announcement link (optional)"
          value={announcementHref}
          onChange={(e) => setAnnouncementHref(e.target.value)}
        />
      </div>

      <div className="border-rymx-cream/10 border-t pt-4">
        <h3 className="text-rymx-cream/60 mb-4 font-mono text-xs tracking-[0.1em] uppercase">
          Homepage hero
        </h3>
        <div className="flex flex-col gap-4">
          <Field
            id="heroEyebrow"
            label="Eyebrow"
            value={heroEyebrow}
            onChange={(e) => setHeroEyebrow(e.target.value)}
          />
          <Field
            id="heroHeadline"
            label="Headline"
            value={heroHeadline}
            onChange={(e) => setHeroHeadline(e.target.value)}
          />
          <Field
            id="heroCta"
            label="Call-to-action label"
            value={heroCta}
            onChange={(e) => setHeroCta(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">Saved</p>}
      <Button type="submit" disabled={saving} className="w-fit justify-center">
        {saving ? "Saving…" : "Save content"}
      </Button>
    </form>
  );
}
