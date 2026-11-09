import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useApi } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { date, dateTime, money, num, titleCase } from "../lib/format";
import { Avatar, Badge, Card, ConfirmDialog, DetailList, EmptyState, ErrorState, Field, Modal, PageHeader, Spinner, StatCard, Table, Tabs, Thumb } from "../components/ui";
import { BookingsTable, OrdersTable, PaymentsTable } from "../components/tables";
import UserForm from "./UserForm";

function PasswordModal({ open, onClose, user }) {
  const action = useAction();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError("At least 8 characters with letters and numbers."); return; }
    try {
      await action.mutateAsync({ path: `/users/${user._id}/password`, body: { password }, throwOnly: true });
      setPassword("");
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Reset password for ${user.fullName}`} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="pw-form" className="btn-primary" disabled={action.isPending}>Reset password</button></>}>
      <form id="pw-form" onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-600">The user is signed out on every device and must use the new password.</p>
        <Field label="New password" error={error}><input className="input" type="text" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} /></Field>
      </form>
    </Modal>
  );
}

// Admin activation: records an offline payment (or free time) and adds the plan's months to the user's Premium.
function ActivatePremium({ open, onClose, user, current }) {
  const action = useAction();
  const plans = useApi("/plans", null, { enabled: open });
  const options = (plans.data?.plans || []).filter((p) => p.active && p.audience.includes(user.role) && p.view?.months);
  const [plan, setPlan] = useState(current || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const chosen = options.find((p) => p.key === plan);
  const submit = async () => {
    if (!chosen) { setError("Choose a plan."); return; }
    if (amount !== "" && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) { setError("Enter the amount received, or 0."); return; }
    if (note.trim().length < 3) { setError("Add a note, e.g. \"Paid cash at office\" or \"Free trial\"."); return; }
    try {
      await action.mutateAsync({ path: `/users/${user._id}/subscription`, method: "PUT", body: { plan, amount: amount === "" ? 0 : Number(amount), note: note.trim() }, throwOnly: true });
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Activate Premium for ${user.fullName}`} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="button" className="btn-success" onClick={submit} disabled={action.isPending}><i className="fa-solid fa-crown" /> Activate</button></>}>
      {plans.isPending ? <Spinner /> : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Use this for payments received outside the app, or to give free time. The plan’s months are added after any time they already have. The user is notified.</p>
          {options.map((p) => (
            <label key={p.key} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${plan === p.key ? "border-blue-500 bg-blue-50/50" : "border-gray-200"}`}>
              <span className="flex items-center gap-3"><input type="radio" name="plan" checked={plan === p.key} onChange={() => { setPlan(p.key); setAmount(String(p.price)); setError(""); }} /><span><b className="text-sm text-gray-800">{p.name}</b><br /><span className="text-xs text-gray-400">{p.view.months} month{p.view.months > 1 ? "s" : ""} of Premium</span></span></span>
              <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{money(p.price)}</span>
            </label>
          ))}
          {!options.length && <p className="text-xs text-gray-400">No active plans for this role.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Amount received (₹)" hint="0 for free time"><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Note" className="sm:col-span-2" hint="Kept in the audit log"><input className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid by UPI / 1 month free trial" /></Field>
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

// Premium status and payment history for vendors and shopkeepers.
function PremiumCard({ sub, onActivate, canManage }) {
  return (
    <Card title="Premium" actions={canManage ? <button type="button" className="btn-success py-1.5" onClick={onActivate}><i className="fa-solid fa-crown" /> {sub?.active ? "Extend" : "Activate"}</button> : null}>
      <div className={`rounded-lg p-3 mb-3 text-xs ${sub?.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {sub?.active ? <><b>{sub.planName || "Premium"}</b> · active until <b>{date(sub.expiresAt)}</b></>
          : sub?.expiresAt ? <>Premium ended on <b>{date(sub.expiresAt)}</b>.{sub.required ? " The account is locked." : ""}</>
          : <>Never subscribed.{sub?.required ? " The account is locked until they pay." : ""}</>}
      </div>
      {sub?.payments?.length ? (
        <ul className="divide-y divide-gray-100 text-xs">
          {sub.payments.map((pay) => (
            <li key={pay._id} className="py-2 flex items-start justify-between gap-2">
              <span><b className="text-gray-700">{pay.planName}</b> · {pay.source === "admin" ? `by ${pay.grantedBy || "admin"}` : pay.paymentMethod || "Cashfree"}<br /><span className="text-gray-400">{dateTime(pay.paidAt)}{pay.periodEnd ? ` · till ${date(pay.periodEnd)}` : ""}{pay.note ? ` · ${pay.note}` : ""}</span></span>
              <b className="text-gray-800 whitespace-nowrap">{money(pay.amount)}</b>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-gray-400">No payments yet.</p>}
    </Card>
  );
}

const pct = (part, total) => (total ? `${Math.round((part / total) * 100)}%` : "—");

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const action = useAction();
  const query = useApi(`/users/${id}`);
  const [tab, setTab] = useState("overview");
  const [dialog, setDialog] = useState(null);

  if (query.isPending) return <><PageHeader title="User" crumbs={[{ label: "Users", to: "/users" }, { label: "Loading" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="User" crumbs={[{ label: "Users", to: "/users" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;

  const d = query.data;
  const u = d.user;
  const s = d.summary || {};
  const suspended = u.status === "suspended";
  const run = (path, body) => action.mutateAsync({ path, body, throwOnly: true });

  const stats = {
    farmer: [["Bookings", num(s.bookings), "fa-solid fa-tractor"], ["Spent on services", money(s.servicesSpent), "fa-solid fa-indian-rupee-sign", "green"], ["Orders", num(s.orders), "fa-solid fa-cart-shopping", "amber"], ["Agri cases", num(s.agriCases), "fa-solid fa-seedling", "teal"]],
    vendor: [["Tractors", num(s.tractors), "fa-solid fa-tractor"], ["Drivers", num(s.drivers), "fa-solid fa-id-card", "indigo"], ["Completed jobs", `${num(s.completed)} / ${num(s.bookings)}`, "fa-solid fa-circle-check", "green"], ["Earnings", money(s.earnings), "fa-solid fa-piggy-bank", "amber"]],
    driver: [["Jobs", num(s.jobs), "fa-solid fa-briefcase"], ["Completed", num(s.completed), "fa-solid fa-circle-check", "green"], ["Total pay", money(s.pay), "fa-solid fa-wallet", "amber"], ["Pay per job now", money(s.payPerJob), "fa-solid fa-tag", "indigo"]],
    shopkeeper: [["Products", `${num(s.activeProducts)} live`, "fa-solid fa-bag-shopping"], ["Orders", num(s.orders), "fa-solid fa-cart-shopping", "indigo"], ["Payments received", money(s.received), "fa-solid fa-wallet", "green"], ["Awaiting payment", money(s.awaiting), "fa-solid fa-hourglass-half", "amber"]],
  }[u.role] || [];

  const tabs = {
    farmer: [["overview", "Overview"], ["bookings", "Bookings", d.bookings?.length], ["orders", "Orders", d.orders?.length], ["agri", "Agri Doctor", d.agriCases?.length]],
    vendor: [["overview", "Overview"], ["jobs", "Job history", d.bookings?.length], ["drivers", "Drivers", d.drivers?.length], ["tractors", "Tractors", d.tractors?.length]],
    driver: [["overview", "Overview"], ["pay", "Pay history", d.payHistory?.length], ["jobs", "All jobs", d.jobs?.length]],
    shopkeeper: [["overview", "Overview"], ["products", "Products", d.products?.length], ["orders", "Orders", d.orders?.length], ["payments", "Payments", d.payments?.length]],
  }[u.role] || [["overview", "Overview"]];

  const breakdown = {
    farmer: [["Completed bookings", s.completedBookings], ["Cancelled bookings", s.cancelledBookings], ["Cancelled orders", s.cancelledOrders], ["Delivered order value", money(s.ordersSpent)]],
    vendor: [["Active jobs", s.active], ["Cancelled jobs", `${s.cancelled} (${pct(s.cancelled, s.bookings)})`], ["Completion rate", pct(s.completed, s.bookings)], ["Driver pay on completed jobs", money(s.driverPay)]],
    driver: [["Active jobs", s.active], ["Cancelled jobs", s.cancelled], ["Service value delivered", money(s.serviceValue)], ["Vendor", u.createdByVendor ? <Link to={`/users/${u.createdByVendor._id}`} className="text-blue-600 hover:underline">{u.createdByVendor.fullName}</Link> : "—"]],
    shopkeeper: [["Pending review", s.pendingProducts], ["Rejected products", s.rejectedProducts], ["Delivered orders", s.delivered], ["Cancelled orders", `${s.cancelled} (${pct(s.cancelled, s.orders)})`]],
  }[u.role] || [];

  return (
    <>
      <PageHeader
        title={u.fullName}
        crumbs={[{ label: "Users", to: "/users" }, { label: `${titleCase(u.role)}s`, to: `/users?role=${u.role}` }, { label: u.fullName }]}
        actions={
          <>
            <button type="button" className="btn-light" onClick={() => navigate(-1)}><i className="fa-solid fa-arrow-left text-[10px]" /> Back</button>
            <button type="button" className="btn-primary" onClick={() => setDialog("edit")}><i className="fa-solid fa-pen" /> Edit</button>
            {suspended
              ? <button type="button" className="btn-success" onClick={() => setDialog("activate")}><i className="fa-solid fa-user-check" /> Reactivate</button>
              : <button type="button" className="btn-danger" onClick={() => setDialog("suspend")}><i className="fa-solid fa-ban" /> Suspend</button>}
            <button type="button" className="btn-light" onClick={() => setDialog("password")}><i className="fa-solid fa-key" /> Reset password</button>
            <button type="button" className="btn-light" onClick={() => setDialog("logout")}><i className="fa-solid fa-right-from-bracket" /> Sign out everywhere</button>
            {can("notifications") && <Link to={`/notifications?user=${u._id}&name=${encodeURIComponent(u.fullName)}`} className="btn-light"><i className="fa-regular fa-bell" /> Notify</Link>}
          </>
        }
      />

      {suspended && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200/60 text-sm text-rose-600 flex items-start gap-2">
          <i className="fa-solid fa-ban mt-0.5" />
          <div><b>Suspended {date(u.suspendedAt)}.</b> {u.suspendedReason}</div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-4 space-y-6">
          <Card>
            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
              <Avatar src={u.avatarUrl} name={u.fullName} size="w-20 h-20" />
              <h2 className="text-base font-bold text-gray-800 mt-3">{u.fullName}</h2>
              <div className="flex items-center gap-2 mt-1.5"><Badge status={u.role} /><Badge status={u.status} /></div>
            </div>
            <DetailList items={[
              ["Email", u.email],
              ["Mobile", u.mobile],
              ["Location", u.location?.address || (u.location?.latitude ? `${u.location.latitude}, ${u.location.longitude}` : "Not set")],
              u.location?.latitude ? ["Map", <a key="map" href={`https://www.google.com/maps?q=${u.location.latitude},${u.location.longitude}`} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline">Open in Google Maps</a>] : null,
              ["Joined", dateTime(u.createdAt)],
              d.subscription ? ["Premium", d.subscription.active ? <Badge key="pr" status="active">Active till {date(d.subscription.expiresAt)}</Badge> : <Badge key="pr" status="cancelled">{d.subscription.expiresAt ? "Expired" : "Not subscribed"}</Badge>] : null,
            ]} />
          </Card>
          {d.subscription ? <PremiumCard sub={d.subscription} canManage={can("subscriptions")} onActivate={() => setDialog("plan")} /> : null}
          {u.addresses?.length > 0 && (
            <Card title="Saved addresses">
              <ul className="space-y-2 text-xs">
                {u.addresses.map((a) => <li key={a._id} className="flex gap-2"><i className="fa-solid fa-location-dot text-gray-300 mt-0.5" /><span><b className="text-gray-700">{a.label}</b>{a.isDefault && <span className="text-blue-600"> · default</span>}<br /><span className="text-gray-500">{a.address}</span></span></li>)}
              </ul>
            </Card>
          )}
        </div>

        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(([label, value, icon, tone]) => <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />)}
          </div>
          <Card>
            <Tabs value={tab} onChange={setTab} tabs={tabs.map(([value, label, count]) => ({ value, label, count }))} />
            {tab === "overview" && (breakdown.length ? <DetailList items={breakdown.map(([k, v]) => [k, v ?? 0])} /> : <EmptyState title="No activity" />)}
            {u.role === "farmer" && tab === "bookings" && <BookingsTable rows={d.bookings} hide={["farmer"]} />}
            {u.role === "farmer" && tab === "orders" && <OrdersTable rows={d.orders} hide={["buyer"]} />}
            {u.role === "farmer" && tab === "agri" && (
              <Table
                rows={d.agriCases}
                onRowClick={(c) => navigate(`/agri/${c._id}`)}
                columns={[
                  { key: "photo", title: "Case", render: (c) => <div className="flex items-center gap-3"><Thumb src={c.images?.[0]} /><div><p className="font-bold text-gray-800">{titleCase(c.type)} testing</p><p className="text-[11px] text-gray-400">{date(c.createdAt)}</p></div></div> },
                  { key: "notes", title: "Notes", render: (c) => <span className="line-clamp-2 max-w-xs">{c.notes}</span> },
                  { key: "status", title: "Status", render: (c) => <Badge status={c.status} /> },
                ]}
                empty={<EmptyState icon="fa-solid fa-seedling" title="No Agri Doctor cases" />}
              />
            )}
            {u.role === "vendor" && tab === "jobs" && <BookingsTable rows={d.bookings} hide={["vendor"]} />}
            {u.role === "vendor" && tab === "drivers" && (
              <Table
                rows={d.drivers}
                onRowClick={(dr) => navigate(`/users/${dr._id}`)}
                columns={[
                  { key: "name", title: "Driver", render: (dr) => <div className="flex items-center gap-3"><Avatar src={dr.avatarUrl} name={dr.fullName} /><div><p className="font-bold text-gray-800">{dr.fullName}</p><p className="text-[11px] text-gray-400">{dr.mobile}</p></div></div> },
                  { key: "jobs", title: "Jobs", render: (dr) => dr.jobs },
                  { key: "active", title: "Active", render: (dr) => dr.activeJobs },
                  { key: "done", title: "Completed", render: (dr) => dr.completedJobs },
                  { key: "cancelled", title: "Cancelled", render: (dr) => dr.cancelledJobs },
                  { key: "pay", title: "Pay earned", render: (dr) => <span className="font-semibold text-emerald-600">{money(dr.pay)}</span> },
                  { key: "status", title: "Status", render: (dr) => <Badge status={dr.status} /> },
                ]}
                empty={<EmptyState icon="fa-solid fa-id-card" title="No drivers" text="Drivers created by this vendor appear here." />}
              />
            )}
            {u.role === "vendor" && tab === "tractors" && (
              <Table
                rows={d.tractors}
                onRowClick={(t) => navigate(`/tractors/${t._id}`)}
                columns={[
                  { key: "t", title: "Tractor", render: (t) => <div className="flex items-center gap-3"><Thumb src={t.images?.[0]} /><div><p className="font-bold text-gray-800">{t.brand}</p><p className="text-[11px] text-gray-400">{t.location?.address || "—"}</p></div></div> },
                  { key: "price", title: "Per acre", render: (t) => money(t.pricePerAcre) },
                  { key: "radius", title: "Radius", render: (t) => `${t.maxDistance} km` },
                  { key: "status", title: "Status", render: (t) => <Badge status={t.availability} /> },
                ]}
                empty={<EmptyState icon="fa-solid fa-tractor" title="No tractors" />}
              />
            )}
            {u.role === "driver" && tab === "pay" && <BookingsTable rows={d.payHistory} hide={["driver"]} payColumn empty={<EmptyState icon="fa-solid fa-wallet" title="No completed jobs yet" />} />}
            {u.role === "driver" && tab === "jobs" && <BookingsTable rows={d.jobs} hide={["driver"]} />}
            {u.role === "shopkeeper" && tab === "products" && (
              <Table
                rows={d.products}
                onRowClick={(p) => navigate(`/products/${p._id}`)}
                columns={[
                  { key: "p", title: "Product", render: (p) => <div className="flex items-center gap-3"><Thumb src={p.images?.[0]} /><div><p className="font-bold text-gray-800">{p.name}</p><p className="text-[11px] text-gray-400">{date(p.createdAt)}</p></div></div> },
                  { key: "price", title: "Price", render: (p) => `${money(p.price)} / ${p.unit}` },
                  { key: "status", title: "Status", render: (p) => <div><Badge status={p.status} />{p.rejectionReason && <p className="text-[11px] text-rose-400 mt-1 max-w-[200px] truncate">{p.rejectionReason}</p>}</div> },
                ]}
                empty={<EmptyState icon="fa-solid fa-bag-shopping" title="No products" />}
              />
            )}
            {u.role === "shopkeeper" && tab === "orders" && <OrdersTable rows={d.orders} hide={["seller"]} />}
            {u.role === "shopkeeper" && tab === "payments" && <PaymentsTable rows={d.payments} hide={["seller"]} />}
          </Card>
        </div>
      </div>

      <UserForm open={dialog === "edit"} onClose={() => setDialog(null)} user={u} />
      <PasswordModal open={dialog === "password"} onClose={() => setDialog(null)} user={u} />
      {dialog === "plan" && <ActivatePremium open onClose={() => setDialog(null)} user={u} current={d.subscription?.plan} />}
      <ConfirmDialog open={dialog === "suspend"} onClose={() => setDialog(null)} title={`Suspend ${u.fullName}?`} tone="danger" confirmLabel="Suspend account" reason reasonHint="Kept in the audit log." message={`They are signed out on every device and can't sign in until reactivated.${u.role === "vendor" ? " Their tractors are marked unavailable." : ""} Nothing is deleted.`} onConfirm={(reason) => run(`/users/${u._id}/suspend`, { reason })} />
      <ConfirmDialog open={dialog === "activate"} onClose={() => setDialog(null)} title={`Reactivate ${u.fullName}?`} tone="success" confirmLabel="Reactivate" message="They can sign in again and are notified." onConfirm={() => run(`/users/${u._id}/activate`)} />
      <ConfirmDialog open={dialog === "logout"} onClose={() => setDialog(null)} title="Sign out everywhere?" confirmLabel="Sign out" message={`${u.fullName} is signed out on every phone and has to sign in again.`} onConfirm={() => run(`/users/${u._id}/logout-all`)} />
    </>
  );
}
