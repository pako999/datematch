"use client";

import { useActionState } from "react";
import { ui } from "@/components/ui";
import { useDict } from "@/components/locale-provider";
import {
  addBooking,
  createEvent,
  loadDemoEvents,
  updateEvent,
  type ActionResult,
} from "@/lib/events/actions";

function Status({ state }: { state: ActionResult | null }) {
  const { t } = useDict();
  if (!state) return null;
  return state.ok ? (
    <span className="text-sm text-emerald-600 dark:text-emerald-400">
      {state.info ?? t.common.saved}
    </span>
  ) : (
    <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
  );
}

export interface EventInitial {
  title: string;
  description: string;
  location: string;
  country: string;
  emoji: string;
  startsAt: string; // datetime-local value
  priceEur: number | null;
  capacity: number | null;
  published: boolean;
}

export function EventForm({
  eventId,
  initial,
}: {
  eventId?: string;
  initial: EventInitial | null;
}) {
  const { t } = useDict();
  const action = eventId ? updateEvent.bind(null, eventId) : createEvent;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={ui.label} htmlFor="ev-title">{t.staff.eventTitleLabel}</label>
          <input id="ev-title" name="title" required defaultValue={initial?.title} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="ev-location">{t.staff.eventLocationLabel}</label>
          <input id="ev-location" name="location" required defaultValue={initial?.location} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="ev-country">{t.common.country}</label>
          <input id="ev-country" name="country" required defaultValue={initial?.country ?? "Slovenija"} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="ev-startsAt">{t.staff.eventDateLabel}</label>
          <input id="ev-startsAt" name="startsAt" type="datetime-local" required defaultValue={initial?.startsAt} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="ev-emoji">{t.staff.eventEmojiLabel}</label>
          <input id="ev-emoji" name="emoji" maxLength={8} placeholder="🥾" defaultValue={initial?.emoji} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="ev-price">{t.staff.eventPriceLabel}</label>
          <input id="ev-price" name="priceEur" type="number" min={0} step="0.01" placeholder={t.staff.freeLabel} defaultValue={initial?.priceEur ?? ""} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="ev-capacity">{t.staff.eventCapacityLabel}</label>
          <input id="ev-capacity" name="capacity" type="number" min={1} placeholder={t.staff.unlimitedLabel} defaultValue={initial?.capacity ?? ""} className={ui.input} />
        </div>
      </div>
      <div>
        <label className={ui.label} htmlFor="ev-desc">{t.staff.eventDescLabel}</label>
        <textarea id="ev-desc" name="description" rows={4} required defaultValue={initial?.description} className={ui.input} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} />
        {t.staff.eventPublishedLabel}
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={ui.btnPrimary}>
          {pending
            ? t.common.saving
            : eventId
              ? t.staff.saveEventBtn
              : t.staff.createEventBtn}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function AddBookingForm({
  eventId,
  clients,
}: {
  eventId: string;
  clients: { id: string; fullName: string; city: string }[];
}) {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState(
    addBooking.bind(null, eventId),
    null,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-56">
        <label className={ui.label} htmlFor="bk-client">{t.common.name}</label>
        <select id="bk-client" name="clientId" required defaultValue="" className={ui.input}>
          <option value="" disabled>{t.common.select}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName} — {c.city}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-48 flex-1">
        <input name="note" placeholder={t.staff.bookingNotePlaceholder} className={ui.input} />
      </div>
      <button type="submit" disabled={pending} className={ui.btnPrimary}>
        {pending ? t.staff.addingBooking : t.staff.addBookingBtn}
      </button>
      <Status state={state} />
    </form>
  );
}

export function LoadDemoEventsForm() {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState(loadDemoEvents, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className={ui.btnSecondary}>
        {pending ? t.staff.loadingDemoEvents : t.staff.loadDemoEvents}
      </button>
      <Status state={state} />
    </form>
  );
}
