"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { addAddressSchema, type Address } from "../schema";
import { addAddressAction, removeAddressAction, setDefaultAddressAction } from "../server/actions";

const EMPTY_FORM = { fullName: "", phone: "", governorate: "", city: "", addressLine: "" };

export function AddressList({ addresses: initialAddresses }: { addresses: Address[] }) {
  const t = useTranslations("account");
  const [addresses, setAddresses] = useState(initialAddresses);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = addAddressSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("invalidInput"));
      return;
    }

    setPending(true);
    const result = await addAddressAction(parsed.data);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAddresses(result.addresses);
    setForm(EMPTY_FORM);
  }

  async function onRemove(id: string) {
    setRemovingId(id);
    const result = await removeAddressAction(id);
    setRemovingId(null);
    if (result.ok) setAddresses(result.addresses);
  }

  async function onSetDefault(id: string) {
    setDefaultingId(id);
    const result = await setDefaultAddressAction(id);
    setDefaultingId(null);
    if (result.ok) setAddresses(result.addresses);
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="border-rymx-cream/10 bg-rymx-card flex items-start justify-between gap-4 rounded-md border p-4"
          >
            <div className="text-rymx-cream/70 font-mono text-xs">
              <p className="text-rymx-cream flex items-center gap-2">
                {address.fullName}
                {address.isDefault && (
                  <span className="text-rymx-gold border-rymx-gold/40 rounded-full border px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase">
                    {t("defaultAddress")}
                  </span>
                )}
              </p>
              <p>{address.phone}</p>
              <p>
                {address.addressLine}, {address.city}, {address.governorate}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {!address.isDefault && (
                <button
                  type="button"
                  disabled={defaultingId === address.id}
                  onClick={() => onSetDefault(address.id)}
                  className="text-rymx-cream/50 font-mono text-xs tracking-[0.1em] uppercase hover:text-rymx-gold"
                >
                  {t("setAsDefault")}
                </button>
              )}
              <button
                type="button"
                disabled={removingId === address.id}
                onClick={() => onRemove(address.id)}
                className="text-rymx-cream/50 font-mono text-xs tracking-[0.1em] uppercase hover:text-red-400"
              >
                {t("remove")}
              </button>
            </div>
          </li>
        ))}
        {addresses.length === 0 && (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noSavedAddresses")}</p>
        )}
      </ul>

      <form onSubmit={onAdd} noValidate className="flex flex-col gap-4">
        <h3 className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {t("addAddress")}
        </h3>
        <Field
          id="addr-fullName"
          label={t("fullName")}
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        />
        <Field
          id="addr-phone"
          label={t("phone")}
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            id="addr-governorate"
            label={t("governorate")}
            value={form.governorate}
            onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))}
          />
          <Field
            id="addr-city"
            label={t("city")}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <Field
          id="addr-addressLine"
          label={t("address")}
          value={form.addressLine}
          onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
        />
        {error && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="justify-center">
          {pending ? t("adding") : t("addAddress")}
        </Button>
      </form>
    </div>
  );
}
