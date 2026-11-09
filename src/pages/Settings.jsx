import { useEffect, useState } from "react";
import { useAction, useApi } from "../lib/hooks";
import { dateTime, money } from "../lib/format";
import { Card, ErrorState, Field, PageHeader, Spinner, Toggle } from "../components/ui";

export default function Settings() {
  const query = useApi("/settings");
  const action = useAction();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const s = query.data?.settings;
  useEffect(() => {
    if (s) setForm({ driverPayPerJob: String(s.driverPayPerJob), productApprovalRequired: s.productApprovalRequired, subscriptionRequired: s.subscriptionRequired !== false, onlinePaymentsEnabled: s.onlinePaymentsEnabled !== false, bookingCommissionPercent: String(s.bookingCommissionPercent ?? 0), marketplaceCommissionPercent: String(s.marketplaceCommissionPercent ?? 0), maxTractorRadiusKm: String(s.maxTractorRadiusKm), supportEmail: s.supportEmail || "", supportPhone: s.supportPhone || "" });
  }, [s]);

  if (query.isPending || (!form && !query.isError)) return <><PageHeader title="Settings" crumbs={[{ label: "Business" }, { label: "Settings" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="Settings" crumbs={[{ label: "Business" }, { label: "Settings" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;

  const save = async (e) => {
    e.preventDefault();
    const pay = Number(form.driverPayPerJob);
    const radius = Number(form.maxTractorRadiusKm);
    if (!Number.isFinite(pay) || pay < 0 || pay > 100000) { setError("Driver pay must be between 0 and 100000."); return; }
    if (!Number.isInteger(radius) || radius < 1 || radius > 1000) { setError("Maximum radius must be a whole number from 1 to 1000."); return; }
    if (form.supportEmail && !/^\S+@\S+\.\S+$/.test(form.supportEmail)) { setError("Enter a valid support email."); return; }
    const bookingPct = Number(form.bookingCommissionPercent);
    const marketPct = Number(form.marketplaceCommissionPercent);
    if (![bookingPct, marketPct].every((p) => form.bookingCommissionPercent !== "" && form.marketplaceCommissionPercent !== "" && Number.isFinite(p) && p >= 0 && p <= 50)) { setError("Commission must be between 0% and 50%."); return; }
    setError("");
    try {
      await action.mutateAsync({ path: "/settings", method: "PUT", body: { driverPayPerJob: pay, productApprovalRequired: form.productApprovalRequired, subscriptionRequired: form.subscriptionRequired, onlinePaymentsEnabled: form.onlinePaymentsEnabled, bookingCommissionPercent: bookingPct, marketplaceCommissionPercent: marketPct, maxTractorRadiusKm: radius, supportEmail: form.supportEmail.trim(), supportPhone: form.supportPhone.trim() }, throwOnly: true });
    } catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHeader title="Settings" crumbs={[{ label: "Business" }, { label: "Settings" }]} />
      <form onSubmit={save} className="grid grid-cols-12 gap-6" noValidate>
        <Card title="Driver pay" className="col-span-12 lg:col-span-6">
          <Field label="Fixed pay per completed job (₹)" hint="Recorded on each job when it completes. Changing it never alters jobs already completed.">
            <input className="input" inputMode="decimal" value={form.driverPayPerJob} onChange={(e) => setForm({ ...form, driverPayPerJob: e.target.value })} />
          </Field>
          <p className="text-xs text-gray-500 mt-3">Current: <b>{money(s.driverPayPerJob)}</b> per job</p>
        </Card>
        <Card title="Marketplace" className="col-span-12 lg:col-span-6">
          <Toggle checked={form.productApprovalRequired} onChange={(productApprovalRequired) => setForm({ ...form, productApprovalRequired })} label="New products need admin approval" />
          <p className="text-[11px] text-gray-400 mt-2">When on, shopkeepers’ new products wait in Products → Awaiting approval before farmers can see them.</p>
        </Card>
        <Card title="Premium (vendors & shopkeepers)" className="col-span-12 lg:col-span-6">
          <Toggle checked={form.subscriptionRequired} onChange={(subscriptionRequired) => setForm({ ...form, subscriptionRequired })} label="Require an active plan to use the app" />
          <p className="text-[11px] text-gray-400 mt-2">When on, vendors and shopkeepers without paid time see their app locked with an Upgrade banner, can’t add listings or accept work (they can still cancel), and their tractors and products are hidden from farmers. Plans and prices are under Subscriptions.</p>
        </Card>
        <Card title="Online payments & platform commission" className="col-span-12">
          <Toggle checked={form.onlinePaymentsEnabled} onChange={(onlinePaymentsEnabled) => setForm({ ...form, onlinePaymentsEnabled })} label="Let farmers pay online (Cashfree)" />
          <p className="text-[11px] text-gray-400 mt-2 mb-4">Farmers pay in the app; Cashfree keeps the platform commission and settles the rest straight to the seller’s bank. Only sellers with a verified payout account (Payments → Seller payout accounts) can be paid online. When off, farmers pay sellers directly (cash or UPI).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Commission on tractor bookings (%)" hint="Kept from each online booking payment. 0–50%.">
              <input className="input" inputMode="decimal" value={form.bookingCommissionPercent} onChange={(e) => setForm({ ...form, bookingCommissionPercent: e.target.value })} />
            </Field>
            <Field label="Commission on marketplace orders (%)" hint="Kept from each online order payment. 0–50%.">
              <input className="input" inputMode="decimal" value={form.marketplaceCommissionPercent} onChange={(e) => setForm({ ...form, marketplaceCommissionPercent: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-gray-500 mt-3">Example: on a {money(1000)} payment at {Number(form.bookingCommissionPercent) || 0}% the platform keeps <b>{money(Math.round(1000 * (Number(form.bookingCommissionPercent) || 0)) / 100)}</b> and the vendor receives <b>{money(1000 - Math.round(1000 * (Number(form.bookingCommissionPercent) || 0)) / 100)}</b>. New rates apply to new payments only — past payments keep the rate they were made at.</p>
        </Card>
        <Card title="Tractors" className="col-span-12 lg:col-span-6">
          <Field label="Maximum service radius (km)" hint="Vendors can't set a tractor's service area larger than this. Existing tractors keep their radius.">
            <input className="input" inputMode="numeric" value={form.maxTractorRadiusKm} onChange={(e) => setForm({ ...form, maxTractorRadiusKm: e.target.value })} />
          </Field>
        </Card>
        <Card title="Support contact" className="col-span-12 lg:col-span-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Support email"><input className="input" type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></Field>
            <Field label="Support phone"><input className="input" inputMode="tel" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} /></Field>
          </div>
        </Card>
        <div className="col-span-12 flex flex-wrap items-center justify-end gap-3">
          {error && <p className="text-xs text-rose-500 mr-auto" role="alert">{error}</p>}
          <span className="text-[11px] text-gray-400">Last changed {dateTime(s.updatedAt)}</span>
          <button type="submit" className="btn-primary" disabled={action.isPending}>{action.isPending && <i className="fa-solid fa-circle-notch fa-spin" />} Save settings</button>
        </div>
      </form>
    </>
  );
}
