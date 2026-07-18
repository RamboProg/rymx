"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { addAddressSchema, type Address } from "../schema";
import { addAddressAction, removeAddressAction } from "../server/actions";

const EMPTY_FORM = { fullName: "", phone: "", governorate: "", city: "", addressLine: "" };

export function AddressList({ addresses: initialAddresses }: { addresses: Address[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = addAddressSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
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

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="border-rymx-cream/10 bg-rymx-card flex items-start justify-between gap-4 rounded-md border p-4"
          >
            <div className="text-rymx-cream/70 font-mono text-xs">
              <p className="text-rymx-cream">{address.fullName}</p>
              <p>{address.phone}</p>
              <p>
                {address.addressLine}, {address.city}, {address.governorate}
              </p>
            </div>
            <button
              type="button"
              disabled={removingId === address.id}
              onClick={() => onRemove(address.id)}
              className="text-rymx-cream/50 font-mono text-xs tracking-[0.1em] uppercase hover:text-red-400"
            >
              Remove
            </button>
          </li>
        ))}
        {addresses.length === 0 && (
          <p className="text-rymx-cream/50 font-mono text-sm">No saved addresses yet.</p>
        )}
      </ul>

      <form onSubmit={onAdd} noValidate className="flex flex-col gap-4">
        <h3 className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          Add address
        </h3>
        <Field
          id="addr-fullName"
          label="Full name"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        />
        <Field
          id="addr-phone"
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            id="addr-governorate"
            label="Governorate"
            value={form.governorate}
            onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))}
          />
          <Field
            id="addr-city"
            label="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <Field
          id="addr-addressLine"
          label="Address"
          value={form.addressLine}
          onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
        />
        {error && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="justify-center">
          {pending ? "Adding…" : "Add address"}
        </Button>
      </form>
    </div>
  );
}
