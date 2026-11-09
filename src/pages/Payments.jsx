import { Link, useNavigate } from "react-router-dom";
import { useAction, useApi, useUrlState } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/api";
import { date, dateTime, money, num, titleCase } from "../lib/format";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner, StatCard, Table, Tabs, useToast } from "../components/ui";
import { BookingsTable, PaymentsTable } from "../components/tables";
import { UserPicker } from "../components/forms";
import { CollectionsTable } from "../components/collections";

const DEFAULTS = { view: "ledger", method: "", q: "", from: "", to: "", vendor: "", vendorName: "", source: "", role: "", kind: "", status: "" };

function DateRange({ state, update }) {
  return (
    <>
      <label className="text-[11px] text-gray-400">From<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.from} onChange={(e) => update({ from: e.target.value })} /></label>
      <label className="text-[11px] text-gray-400">To<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.to} onChange={(e) => update({ to: e.target.value })} /></label>
    </>
  );
}

function Ledger({ state, update }) {
  const query = useApi("/payments", { method: state.method, q: state.q, from: state.from, to: state.to, page: state.page, limit: 20 }, { keepPrevious: true });
  const t = query.data?.totals;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
        <StatCard label="Verified payments" value={t ? money(t.amount) : "—"} hint={t ? `${num(t.count)} payments` : ""} icon="fa-solid fa-circle-check" tone="green" />
        <StatCard label="UPI" value={t ? money(t.byMethod.upi.amount) : "—"} hint={t ? `${num(t.byMethod.upi.count)} payments` : ""} icon="fa-solid fa-mobile-screen" tone="indigo" />
        <StatCard label="Cash" value={t ? money(t.byMethod.cod.amount) : "—"} hint={t ? `${num(t.byMethod.cod.count)} payments` : ""} icon="fa-solid fa-money-bill-wave" tone="teal" />
        <StatCard label="Paid online" value={t ? money(t.byMethod.online?.amount) : "—"} hint={t ? `${num(t.byMethod.online?.count)} payments` : ""} icon="fa-solid fa-credit-card" tone="blue" />
        <StatCard label="Awaiting verification" value={t ? money(t.awaiting.amount) : "—"} hint={t ? `${num(t.awaiting.count)} dispatched orders` : ""} icon="fa-solid fa-hourglass-half" tone="amber" to="/orders?payment=due" />
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Payment reference" />
          <Select value={state.method} onChange={(method) => update({ method })} placeholder="Any mode" options={[{ value: "upi", label: "UPI" }, { value: "cod", label: "Cash" }, { value: "online", label: "Online" }]} />
          <DateRange state={state} update={update} />
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <PaymentsTable rows={query.data.items} />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </>
  );
}

function Payouts({ state, update }) {
  const navigate = useNavigate();
  const query = useApi("/payouts", { vendor: state.vendor, from: state.from, to: state.to });
  const d = query.data;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <StatCard label="Driver pay" value={d ? money(d.totals.pay) : "—"} hint={d ? `${num(d.totals.jobs)} completed jobs` : ""} icon="fa-solid fa-wallet" tone="green" />
        <StatCard label="Service value" value={d ? money(d.totals.serviceValue) : "—"} hint="Charged to farmers" icon="fa-solid fa-tractor" />
        <StatCard label="Pay per job now" value={d ? money(d.payPerJob) : "—"} hint="Change it in Settings" icon="fa-solid fa-tag" tone="indigo" />
      </div>
      <Card title="Pay by driver" actions={
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-60"><UserPicker role="vendor" placeholder="Filter by vendor" value={state.vendor} initialLabel={state.vendorName} onChange={(id, u) => update({ vendor: id, vendorName: u?.fullName || "" })} /></div>
          <DateRange state={state} update={update} />
          {(state.vendor || state.from || state.to) && <button type="button" className="btn-light" onClick={() => update({ vendor: "", vendorName: "", from: "", to: "" })}><i className="fa-solid fa-xmark" /> Clear</button>}
        </div>
      }>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <Table
            rows={d.drivers}
            rowKey={(r) => r.driver?._id}
            onRowClick={(r) => navigate(`/users/${r.driver._id}`)}
            columns={[
              { key: "d", title: "Driver", render: (r) => <div className="flex items-center gap-3"><Avatar src={r.driver?.avatarUrl} name={r.driver?.fullName} /><div><p className="font-bold text-gray-800">{r.driver?.fullName}</p><p className="text-[11px] text-gray-400">{r.driver?.mobile}</p></div></div> },
              { key: "v", title: "Vendor", render: (r) => r.vendor?.fullName || "—" },
              { key: "j", title: "Jobs", render: (r) => r.jobs },
              { key: "s", title: "Service value", render: (r) => money(r.serviceValue) },
              { key: "p", title: "Pay", render: (r) => <span className="font-bold text-emerald-600">{money(r.pay)}</span> },
              { key: "l", title: "Last job", className: "hidden md:table-cell", render: (r) => dateTime(r.lastJobAt) },
            ]}
            empty={<EmptyState icon="fa-solid fa-wallet" title="No completed jobs in this period" />}
          />
        )}
      </Card>
      {d?.jobs?.length > 0 && <Card title={`Completed jobs${d.jobs.length === 200 ? " (latest 200)" : ""}`} className="mt-6"><BookingsTable rows={d.jobs} payColumn hide={["service", "acres"]} /></Card>}
    </>
  );
}

// Online payments for bookings and orders, split between the platform and the seller.
function OnlineCollections({ state, update }) {
  const query = useApi("/collections", { kind: state.kind, status: state.status, q: state.q, from: state.from, to: state.to, page: state.page, limit: 20 }, { keepPrevious: true });
  const t = query.data?.totals;
  const cfg = query.data?.settings;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <StatCard label="Collected online" value={t ? money(t.gross) : "—"} hint={t ? `${num(t.count)} payments (after refunds)` : ""} icon="fa-solid fa-credit-card" tone="blue" />
        <StatCard label="Platform commission" value={t ? money(t.commission) : "—"} hint={cfg ? `Now: bookings ${cfg.bookingCommissionPercent}% · orders ${cfg.marketplaceCommissionPercent}%` : ""} icon="fa-solid fa-percent" tone="green" to="/settings" />
        <StatCard label="Settled to sellers" value={t ? money(t.sellerShare) : "—"} hint="Paid straight to their bank by Cashfree" icon="fa-solid fa-building-columns" tone="indigo" />
        <StatCard label="Refunded" value={t ? money(t.refunded) : "—"} hint={t ? `${num(t.refundCount)} refunds` : ""} icon="fa-solid fa-rotate-left" tone="amber" />
      </div>
      {cfg && !cfg.onlinePaymentsEnabled && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4"><i className="fa-solid fa-triangle-exclamation mr-1" /> Online payments are switched off. Farmers can only pay sellers directly. Turn them on in <Link to="/settings" className="font-bold underline">Settings</Link>.</p>}
      <Card>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Cashfree order or payment id" />
          <Select value={state.kind} onChange={(kind) => update({ kind })} placeholder="Bookings and orders" options={[{ value: "booking", label: "Tractor bookings" }, { value: "order", label: "Marketplace orders" }]} />
          <Select value={state.status} onChange={(status) => update({ status })} placeholder="Any status" options={[{ value: "paid", label: "Paid" }, { value: "refund_pending", label: "Refund pending" }, { value: "refunded", label: "Refunded" }, { value: "refund_failed", label: "Refund failed" }, { value: "created", label: "Not paid" }, { value: "failed", label: "Failed" }]} />
          <DateRange state={state} update={update} />
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <CollectionsTable rows={query.data.items} />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </>
  );
}

const ACCOUNT_LABELS = { pending: "Verifying", active: "Active", action_required: "Needs attention", blocked: "Blocked" };
const ACCOUNT_TONES = { pending: "amber", active: "emerald", action_required: "rose", blocked: "rose" };

// Sellers' payout accounts (masked) and their Cashfree verification status.
function PayoutAccounts({ state, update }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const action = useAction();
  const query = useApi("/payout-accounts", { status: state.status, role: state.role, q: state.q, page: state.page, limit: 20 }, { keepPrevious: true });
  const c = query.data?.statusCounts || {};
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <StatCard label="Active" value={query.data ? num(c.active) : "—"} hint="Can take online payments" icon="fa-solid fa-circle-check" tone="green" />
        <StatCard label="Verifying" value={query.data ? num(c.pending) : "—"} hint="Cashfree is checking the bank" icon="fa-solid fa-hourglass-half" tone="amber" />
        <StatCard label="Need attention" value={query.data ? num((c.action_required || 0) + (c.blocked || 0)) : "—"} hint="Seller must fix details" icon="fa-solid fa-triangle-exclamation" tone="rose" />
        <StatCard label="Not set up" value={query.data ? num(query.data.notStarted) : "—"} hint="Vendors & shopkeepers without payouts" icon="fa-solid fa-user-clock" tone="indigo" />
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Seller name, email or mobile" />
          <Select value={state.status} onChange={(status) => update({ status })} placeholder="Any status" options={Object.entries(ACCOUNT_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select value={state.role} onChange={(role) => update({ role })} placeholder="Vendors & shopkeepers" options={[{ value: "vendor", label: "Vendors" }, { value: "shopkeeper", label: "Shopkeepers" }]} />
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <Table
              rows={query.data.items}
              onRowClick={(a) => a.user && navigate(`/users/${a.user._id}`)}
              columns={[
                { key: "u", title: "Seller", render: (a) => <div className="flex items-center gap-3"><Avatar src={a.user?.avatarUrl} name={a.user?.fullName} /><div><p className="font-bold text-gray-800">{a.user?.fullName || "—"}</p><p className="text-[11px] text-gray-400">{titleCase(a.role)} · {a.user?.mobile}</p></div></div> },
                { key: "m", title: "Payout to", render: (a) => (a.method === "bank" ? <span><b className="font-mono text-gray-700">{a.accountMasked}</b><br /><span className="text-[11px] text-gray-400">{a.ifsc}</span></span> : <span><b className="font-mono text-gray-700">{a.vpaMasked}</b><br /><span className="text-[11px] text-gray-400">UPI</span></span>) },
                { key: "h", title: "Holder", className: "hidden md:table-cell", render: (a) => <span>{a.accountHolder}<br /><span className="font-mono text-[11px] text-gray-400">PAN {a.panMasked}</span></span> },
                { key: "s", title: "Status", render: (a) => <div><Badge tone={ACCOUNT_TONES[a.status]}>{ACCOUNT_LABELS[a.status]}</Badge>{a.remarks && <p className="text-[10px] text-rose-500 mt-1 max-w-[200px]">{a.remarks}</p>}</div> },
                { key: "t", title: "Checked", className: "hidden lg:table-cell", render: (a) => <span className="whitespace-nowrap">{dateTime(a.lastSyncedAt || a.updatedAt)}</span> },
                { key: "x", title: "", render: (a) => can("payments") && <button type="button" className="btn-light py-1 px-2 text-[11px]" disabled={action.isPending} onClick={(e) => { e.stopPropagation(); action.mutate({ path: `/payout-accounts/${a._id}/sync` }); }}><i className="fa-solid fa-rotate" /> Check now</button> },
              ]}
              empty={<EmptyState icon="fa-solid fa-building-columns" title="No payout accounts yet" text="Vendors and shopkeepers add their bank or UPI in the app (Profile → Payouts)." />}
            />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </>
  );
}

// Premium income: Cashfree payments and admin activations.
function SubscriptionIncome({ state, update }) {
  const navigate = useNavigate();
  const query = useApi("/subscription-payments", { source: state.source, role: state.role, q: state.q, from: state.from, to: state.to, page: state.page, limit: 20 }, { keepPrevious: true });
  const t = query.data?.totals;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <StatCard label="Premium income" value={t ? money(t.amount) : "—"} hint={t ? `${num(t.count)} activations` : ""} icon="fa-solid fa-crown" tone="amber" />
        <StatCard label="Paid online (Cashfree)" value={t ? money(t.bySource.cashfree.amount) : "—"} hint={t ? `${num(t.bySource.cashfree.count)} payments` : ""} icon="fa-solid fa-credit-card" tone="indigo" />
        <StatCard label="Activated by admins" value={t ? money(t.bySource.admin.amount) : "—"} hint={t ? `${num(t.bySource.admin.count)} activations` : ""} icon="fa-solid fa-user-shield" tone="teal" />
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Order, plan or payment id" />
          <Select value={state.source} onChange={(source) => update({ source })} placeholder="Online and admin" options={[{ value: "cashfree", label: "Paid online" }, { value: "admin", label: "Activated by admin" }]} />
          <Select value={state.role} onChange={(role) => update({ role })} placeholder="Vendors & shopkeepers" options={[{ value: "vendor", label: "Vendors" }, { value: "shopkeeper", label: "Shopkeepers" }]} />
          <DateRange state={state} update={update} />
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <Table
              rows={query.data.items}
              onRowClick={(x) => x.user && navigate(`/users/${x.user._id}`)}
              columns={[
                { key: "w", title: "Paid at", render: (x) => <span className="whitespace-nowrap">{dateTime(x.paidAt)}</span> },
                { key: "u", title: "User", render: (x) => <div className="flex items-center gap-3"><Avatar src={x.user?.avatarUrl} name={x.user?.fullName} /><div><p className="font-bold text-gray-800">{x.user?.fullName || "—"}</p><p className="text-[11px] text-gray-400">{titleCase(x.role)}</p></div></div> },
                { key: "p", title: "Plan", render: (x) => <span><b className="text-gray-800">{x.planName}</b><br /><span className="text-[11px] text-gray-400">{x.months} month{x.months > 1 ? "s" : ""}{x.periodEnd ? ` · till ${date(x.periodEnd)}` : ""}</span></span> },
                { key: "s", title: "Source", render: (x) => (x.source === "admin" ? <Badge tone="teal">Admin</Badge> : <Badge tone="indigo">{x.paymentMethod ? titleCase(x.paymentMethod) : "Online"}</Badge>) },
                { key: "r", title: "Reference", className: "hidden lg:table-cell", render: (x) => <span className="font-mono text-[11px]">{x.source === "admin" ? x.note : x.cfPaymentId || x.orderId}</span> },
                { key: "a", title: "Amount", render: (x) => <span className="font-semibold text-emerald-600">{money(x.amount)}</span> },
              ]}
              empty={<EmptyState icon="fa-solid fa-crown" title="No premium payments yet" />}
            />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </>
  );
}

export default function Payments() {
  const toast = useToast();
  const [state, update] = useUrlState(DEFAULTS);
  const exportCsv = async () => {
    try {
      if (state.view === "premium") await downloadCsv("/export/subscription-payments.csv", { source: state.source, role: state.role, q: state.q, from: state.from, to: state.to }, "premium-payments.csv");
      else if (state.view === "online") await downloadCsv("/export/collections.csv", { kind: state.kind, status: state.status, q: state.q, from: state.from, to: state.to }, "online-payments.csv");
      else if (state.view === "payouts") await downloadCsv("/export/payouts.csv", { vendor: state.vendor, from: state.from, to: state.to }, "driver-payouts.csv");
      else await downloadCsv("/export/payments.csv", { method: state.method, q: state.q, from: state.from, to: state.to }, "payments.csv");
    } catch (err) { toast(err.message, "error"); }
  };
  return (
    <>
      <PageHeader title="Payments" crumbs={[{ label: "Marketplace" }, { label: "Payments" }]} actions={state.view !== "accounts" && <button type="button" className="btn-light" onClick={exportCsv}><i className="fa-solid fa-arrow-up-from-bracket text-[10px]" /> Export CSV</button>} />
      <Tabs value={state.view} onChange={(view) => update({ view, method: "", q: "", status: "", kind: "", role: "" })} tabs={[{ value: "ledger", label: "Marketplace payments" }, { value: "online", label: "Online payments" }, { value: "accounts", label: "Seller payout accounts" }, { value: "payouts", label: "Driver payouts" }, { value: "premium", label: "Premium income" }]} />
      {state.view === "premium" ? <SubscriptionIncome state={state} update={update} /> : state.view === "payouts" ? <Payouts state={state} update={update} /> : state.view === "online" ? <OnlineCollections state={state} update={update} /> : state.view === "accounts" ? <PayoutAccounts state={state} update={update} /> : <Ledger state={state} update={update} />}
    </>
  );
}
