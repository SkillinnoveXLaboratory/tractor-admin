import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAction, useApi, useUrlState } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { date, money, num, titleCase } from "../lib/format";
import { Avatar, Badge, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, StatCard, Table, Tabs, Toggle } from "../components/ui";

const MONTHS = { "per month": 1, "per quarter": 3, "per year": 12 };
const ROLE_TITLE = { vendor: "Vendor plans", shopkeeper: "Shopkeeper (Anaj Mandi) plans" };

function blank(plan, roles) {
  return {
    key: plan?.key || "",
    name: plan?.name || "",
    price: plan?.price ?? "",
    compareAtPrice: plan?.compareAtPrice ?? "",
    period: plan?.period && MONTHS[plan.period] ? plan.period : "per month",
    perks: plan?.perks?.length ? [...plan.perks] : [""],
    audience: plan?.audience?.length ? plan.audience.filter((r) => roles.includes(r)) : [roles[0]],
    active: plan?.active ?? true,
    sortOrder: plan?.sortOrder ?? 0,
  };
}

// Live preview of what the app shows: per-month price and the % saved against the original price.
function pricePreview(form) {
  const price = Number(form.price);
  const compare = Number(form.compareAtPrice);
  const months = MONTHS[form.period] || 1;
  if (!Number.isFinite(price) || price <= 0) return null;
  const discount = form.compareAtPrice !== "" && compare > price ? Math.floor(((compare - price) / compare) * 100) : 0;
  return { perMonth: Math.round(price / months), discount };
}

function PlanForm({ open, onClose, plan, periods, roles }) {
  const editing = Boolean(plan);
  const action = useAction();
  const [form, setForm] = useState(() => blank(plan, roles));
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setForm(blank(plan, roles)); setError(""); } }, [open, plan, roles]);
  const setPerk = (i, value) => setForm({ ...form, perks: form.perks.map((p, j) => (j === i ? value : p)) });
  const preview = pricePreview(form);
  const submit = async (e) => {
    e.preventDefault();
    const perks = form.perks.map((p) => p.trim()).filter(Boolean);
    if (!editing && !/^[a-z0-9-]{2,30}$/.test(form.key)) { setError("Code: 2–30 lowercase letters, numbers or dashes (e.g. vendor-yearly)."); return; }
    if (form.name.trim().length < 2) { setError("Enter the plan name."); return; }
    if (form.price === "" || !Number.isFinite(Number(form.price)) || Number(form.price) <= 0) { setError("Enter the plan price."); return; }
    if (form.compareAtPrice !== "" && !(Number(form.compareAtPrice) > Number(form.price))) { setError("The original price must be higher than the plan price (or leave it empty)."); return; }
    if (!form.audience.length) { setError("Choose who can subscribe."); return; }
    const body = {
      name: form.name.trim(), price: Number(form.price), compareAtPrice: form.compareAtPrice === "" ? null : Number(form.compareAtPrice),
      period: form.period, perks, audience: form.audience, active: form.active, sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      await action.mutateAsync({ path: editing ? `/plans/${plan._id}` : "/plans", method: editing ? "PATCH" : "POST", body: editing ? body : { ...body, key: form.key }, throwOnly: true });
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} size="max-w-2xl" title={editing ? `Edit ${plan.name}` : "New plan"} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="plan-form" className="btn-primary" disabled={action.isPending}>{editing ? "Save plan" : "Create plan"}</button></>}>
      <form id="plan-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Plan name" hint="Shown in the app, e.g. 3 Months"><input className="input" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Code" hint={editing ? "Fixed after creation — payments use it." : "Lowercase, e.g. vendor-quarterly"}><input className="input font-mono" maxLength={30} value={form.key} disabled={editing} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })} /></Field>
          <Field label="Billing period" hint="How long one payment unlocks Premium"><select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>{periods.map((p) => <option key={p} value={p}>{titleCase(p)} ({MONTHS[p]} month{MONTHS[p] > 1 ? "s" : ""})</option>)}</select></Field>
          <Field label="Price (₹)"><input className="input" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="Original price (₹, optional)" hint="Shown struck through to show the saving, e.g. 3300 for 3 × 1100"><input className="input" inputMode="decimal" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} /></Field>
          <div className="rounded-lg bg-slate-50 border border-gray-100 p-3 text-xs text-gray-600 self-end">
            <p className="card-label mb-1">In the app</p>
            {preview ? <p><b className="text-gray-800 text-sm">{money(form.price)}</b>{form.compareAtPrice !== "" && Number(form.compareAtPrice) > Number(form.price) && <span className="line-through text-gray-400 ml-1.5">{money(form.compareAtPrice)}</span>} · {money(preview.perMonth)}/month{preview.discount ? <span className="ml-1.5 text-emerald-600 font-bold">Save {preview.discount}%</span> : null}</p> : <p className="text-gray-400">Enter a price</p>}
          </div>
        </div>
        <div>
          <span className="label">Who can subscribe</span>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const on = form.audience.includes(role);
              return <button key={role} type="button" onClick={() => setForm({ ...form, audience: on ? form.audience.filter((r) => r !== role) : [...form.audience, role] })} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${on ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"}`}><i className={`fa-solid ${on ? "fa-check" : "fa-plus"} mr-1 text-[10px]`} />{titleCase(role)}s</button>;
            })}
          </div>
        </div>
        <div>
          <span className="label">Features (shown in the app)</span>
          <div className="space-y-2">
            {form.perks.map((perk, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" maxLength={120} value={perk} onChange={(e) => setPerk(i, e.target.value)} placeholder="e.g. Receive and accept bookings" />
                <button type="button" className="btn-light px-3" onClick={() => setForm({ ...form, perks: form.perks.filter((_, j) => j !== i) })} aria-label="Remove feature"><i className="fa-solid fa-trash text-gray-400" /></button>
              </div>
            ))}
            {form.perks.length < 12 && <button type="button" className="btn-light" onClick={() => setForm({ ...form, perks: [...form.perks, ""] })}><i className="fa-solid fa-plus" /> Add feature</button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Toggle checked={form.active} onChange={(active) => setForm({ ...form, active })} label={form.active ? "Visible in the app" : "Hidden from the app"} />
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">Display order <input className="input w-20 py-1.5" inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></label>
        </div>
        {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

function PlanCard({ p, onEdit, onDelete }) {
  const view = p.view || {};
  return (
    <div className={`card flex flex-col relative overflow-hidden ${p.active ? "" : "opacity-70"}`}>
      {view.discountPercent ? <span className="absolute top-0 right-0 bg-amber-400 text-indigo-950 text-[10px] font-black tracking-wider px-2.5 py-1 rounded-bl-lg">SAVE {view.discountPercent}%</span> : null}
      <div className="flex items-start justify-between pr-16">
        <div><span className="card-label">{p.key}</span><h3 className="text-lg font-bold text-gray-800">{p.name}</h3></div>
      </div>
      <div className="my-3">
        {view.compareAtPrice ? <p className="text-xs text-gray-400 line-through">{money(view.compareAtPrice)}</p> : null}
        <p><span className="text-2xl font-bold text-gray-800">{money(p.price)}</span> <span className="text-xs text-gray-400">{p.period}</span></p>
        {view.months > 1 ? <p className="text-xs text-gray-500">{money(view.perMonth)}/month</p> : null}
      </div>
      <ul className="space-y-1.5 text-xs text-gray-600 flex-1">
        {p.perks.map((perk) => <li key={perk} className="flex gap-2"><i className="fa-solid fa-check text-emerald-500 mt-0.5" />{perk}</li>)}
        {!p.perks.length && <li className="text-gray-400">No features listed</li>}
      </ul>
      <div className="flex flex-wrap items-center gap-1.5 mt-4">
        {p.active ? <Badge status="active">Visible</Badge> : <Badge status="hidden">Hidden</Badge>}
        {p.audience.map((r) => <Badge key={r} status={r}>{titleCase(r)}s</Badge>)}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500"><b className="text-gray-800">{p.subscribers.total}</b> active subscriber{p.subscribers.total === 1 ? "" : "s"}</span>
        <div className="flex gap-1">
          <button type="button" className="btn-light px-2.5 py-1.5" onClick={onEdit} aria-label={`Edit ${p.name}`}><i className="fa-solid fa-pen" /></button>
          <button type="button" className="btn-light px-2.5 py-1.5" onClick={onDelete} aria-label={`Delete ${p.name}`}><i className="fa-solid fa-trash text-rose-400" /></button>
        </div>
      </div>
    </div>
  );
}

function PlansGrid() {
  const { can } = useAuth();
  const query = useApi("/plans");
  const action = useAction();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const { plans, periods, roles, summary, subscriptionRequired } = query.data;
  const current = plans.filter((p) => p.audience.some((r) => roles.includes(r)));
  const retired = plans.filter((p) => !p.audience.some((r) => roles.includes(r)));
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        {roles.map((role) => (
          <StatCard key={role} label={`${titleCase(role)}s on Premium`} value={`${num(summary[role]?.active)} / ${num(summary[role]?.total)}`} hint={`${num(summary[role]?.inactive)} not paying`} icon={role === "vendor" ? "fa-solid fa-tractor" : "fa-solid fa-store"} tone={role === "vendor" ? "blue" : "teal"} />
        ))}
        <div className="card flex flex-col justify-between xl:col-span-2">
          <span className="card-label">Paywall</span>
          <p className="text-sm text-gray-700 mt-2">
            {subscriptionRequired
              ? "On — vendors and shopkeepers without an active plan are locked, and their listings are hidden from farmers."
              : "Off — everyone can use the app without paying."}
          </p>
          {can("settings") ? <Link to="/settings" className="text-xs font-semibold text-blue-600 hover:underline mt-2">Change in Settings</Link> : null}
        </div>
      </div>
      <div className="flex justify-end mb-4"><button type="button" className="btn-primary" onClick={() => setEditing("new")}><i className="fa-solid fa-plus" /> New plan</button></div>
      {roles.map((role) => {
        const list = current.filter((p) => p.audience.includes(role));
        return (
          <section key={role} className="mb-8">
            <h2 className="card-title mb-3">{ROLE_TITLE[role] || `${titleCase(role)} plans`}</h2>
            {list.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {list.map((p) => <PlanCard key={p._id} p={p} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} />)}
              </div>
            ) : <Card><EmptyState icon="fa-solid fa-crown" title="No plans for this role" text="Users of this role can't pay until a plan exists." /></Card>}
          </section>
        );
      })}
      {retired.length ? (
        <details className="mb-6">
          <summary className="text-xs font-semibold text-gray-500 cursor-pointer">Old plans ({retired.length}) — kept for history</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-3">
            {retired.map((p) => <PlanCard key={p._id} p={p} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} />)}
          </div>
        </details>
      ) : null}
      <PlanForm open={Boolean(editing)} onClose={() => setEditing(null)} plan={editing === "new" ? null : editing} periods={periods} roles={roles} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name}?`} tone="danger" confirmLabel="Delete plan" message="Plans with paid time or payment history can't be deleted — hide them instead." onConfirm={() => action.mutateAsync({ path: `/plans/${deleting._id}`, method: "DELETE", throwOnly: true })} />
    </>
  );
}

const PREMIUM_BADGE = {
  active: (u) => <Badge status="active">Active · till {date(u.expiresAt)}</Badge>,
  expired: (u) => <Badge status="cancelled">Expired {date(u.expiresAt)}</Badge>,
  never: () => <Badge tone="gray">Never paid</Badge>,
};

function Subscribers({ state, update }) {
  const navigate = useNavigate();
  const plans = useApi("/plans");
  const query = useApi("/subscribers", { plan: state.plan, role: state.role, status: state.status, q: state.q, page: state.page, limit: 20 }, { keepPrevious: true });
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Name, email or mobile" />
        <Select value={state.status} onChange={(status) => update({ status })} placeholder="Any status" options={[{ value: "active", label: "Premium active" }, { value: "expired", label: "Expired" }, { value: "never", label: "Never paid" }]} />
        <Select value={state.role} onChange={(role) => update({ role })} placeholder="Vendors & shopkeepers" options={(plans.data?.roles || []).map((r) => ({ value: r, label: `${titleCase(r)}s` }))} />
        <Select value={state.plan} onChange={(plan) => update({ plan })} placeholder="Any plan" options={(plans.data?.plans || []).map((p) => ({ value: p.key, label: `${p.name} (${p.audience.map(titleCase).join(", ")})` }))} />
      </div>
      {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
        <>
          <Table
            rows={query.data.items}
            onRowClick={(u) => navigate(`/users/${u._id}`)}
            columns={[
              { key: "u", title: "User", render: (u) => <div className="flex items-center gap-3"><Avatar src={u.avatarUrl} name={u.fullName} /><div><p className="font-bold text-gray-800">{u.fullName}</p><p className="text-[11px] text-gray-400">{u.email}</p></div></div> },
              { key: "r", title: "Role", render: (u) => <Badge status={u.role} /> },
              { key: "p", title: "Plan", render: (u) => (u.planName ? <span className="font-semibold text-gray-800">{u.planName}</span> : <span className="text-gray-300">—</span>) },
              { key: "s", title: "Premium", render: (u) => PREMIUM_BADGE[u.premium]?.(u) },
              { key: "a", title: "Account", className: "hidden md:table-cell", render: (u) => <Badge status={u.status || "active"} /> },
            ]}
            empty={<EmptyState icon="fa-solid fa-crown" title="No one matches" />}
          />
          <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
        </>
      )}
    </Card>
  );
}

const DEFAULTS = { view: "plans", plan: "", role: "", status: "", q: "" };

export default function Plans() {
  const [state, update] = useUrlState(DEFAULTS);
  return (
    <>
      <PageHeader title="Subscriptions" crumbs={[{ label: "Business" }, { label: "Subscriptions" }]} />
      <Tabs value={state.view} onChange={(view) => update({ view })} tabs={[{ value: "plans", label: "Plans" }, { value: "subscribers", label: "Vendors & shopkeepers" }]} />
      {state.view === "subscribers" ? <Subscribers state={state} update={update} /> : <PlansGrid />}
    </>
  );
}
