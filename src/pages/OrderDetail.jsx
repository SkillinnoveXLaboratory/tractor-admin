import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useApi } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { dateTime, money, shortId, titleCase } from "../lib/format";
import { Avatar, Badge, Card, ConfirmDialog, DetailList, ErrorState, Field, Modal, PageHeader, Spinner, Thumb } from "../components/ui";
import { HistoryList } from "../components/tables";
import { OnlinePaymentsCard } from "../components/collections";

const STEPS = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"];

function VerifyPayment({ open, onClose, order }) {
  const action = useAction();
  const [method, setMethod] = useState(order.paymentMethod || "cod");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const ref = reference.replace(/\s+/g, "");
    if (method === "upi" && !/^[A-Za-z0-9]{6,40}$/.test(ref)) { setError("Enter the UPI transaction reference (6–40 letters or numbers)."); return; }
    if (method === "cod" && ref && !/^[A-Za-z0-9]{6,40}$/.test(ref)) { setError("Receipt number can only contain letters and numbers (6–40)."); return; }
    try {
      await action.mutateAsync({ path: `/orders/${order._id}/payment`, body: { method, reference: ref }, throwOnly: true });
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Verify ${money(order.amount)}`} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="pay-form" className="btn-success" disabled={action.isPending}>Mark as paid</button></>}>
      <form id="pay-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">Record a payment only when the money has really been received. It counts towards the shop’s earnings.</p>
        <div className="grid grid-cols-2 gap-2">
          {[["cod", "Cash", "fa-money-bill-wave"], ["upi", "UPI", "fa-mobile-screen"]].map(([value, label, icon]) => (
            <button key={value} type="button" onClick={() => { setMethod(value); setError(""); }} className={`px-3 py-3 rounded-lg border text-sm font-semibold ${method === value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"}`}><i className={`fa-solid ${icon} mr-1.5`} />{label}</button>
          ))}
        </div>
        <Field label={method === "upi" ? "UPI transaction reference (required)" : "Receipt number (optional)"} error={error}>
          <input className="input font-mono" maxLength={40} value={reference} onChange={(e) => { setReference(e.target.value); setError(""); }} />
        </Field>
      </form>
    </Modal>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const action = useAction();
  const meta = useApi("/meta", null, { staleTime: 60000 });
  const query = useApi(`/orders/${id}`);
  const [target, setTarget] = useState(null);
  const [dialog, setDialog] = useState(null);

  if (query.isPending) return <><PageHeader title="Order" crumbs={[{ label: "Orders", to: "/orders" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="Order" crumbs={[{ label: "Orders", to: "/orders" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;
  const { order: o, history, nextStatuses, collections } = query.data;
  const online = o.paymentMethod === "online";
  const label = (s) => titleCase(meta.data?.orderLabels?.[s] || s);
  const reached = o.status === "cancelled" ? -1 : STEPS.indexOf(o.status);
  const payable = (meta.data?.payableOrderStatuses || ["out_for_delivery", "delivered"]).includes(o.status);
  const paid = o.paymentStatus === "received";

  return (
    <>
      <PageHeader
        title={`Order ${shortId(o._id)}`}
        crumbs={[{ label: "Orders", to: "/orders" }, { label: shortId(o._id) }]}
        actions={
          <>
            <button type="button" className="btn-light" onClick={() => navigate(-1)}><i className="fa-solid fa-arrow-left text-[10px]" /> Back</button>
            {nextStatuses.map((s) => (
              <button key={s} type="button" className={s === "cancelled" ? "btn-danger" : "btn-light"} onClick={() => setTarget(s)}>
                <i className={`fa-solid ${s === "cancelled" ? "fa-ban" : "fa-forward-step"}`} /> {s === "cancelled" ? "Cancel order" : `Mark ${label(s)}`}
              </button>
            ))}
            {can("payments") && !online && !paid && payable && <button type="button" className="btn-success" onClick={() => setDialog("pay")}><i className="fa-solid fa-circle-check" /> Verify payment</button>}
            {can("payments") && !online && paid && <button type="button" className="btn-light" onClick={() => setDialog("reverse")}><i className="fa-solid fa-rotate-left" /> Reverse payment</button>}
          </>
        }
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-5"><p className="text-xs text-gray-400">Placed {dateTime(o.createdAt)}</p><Badge status={o.status} /></div>
            {o.status === "cancelled" ? <p className="text-xs text-rose-500 bg-rose-50 rounded-lg px-3 py-2"><i className="fa-solid fa-ban mr-1" /> This order was cancelled.</p> : (
              <ol className="grid grid-cols-5 gap-1">
                {STEPS.map((s, i) => (
                  <li key={s} className="text-center"><div className={`h-1.5 rounded-full ${i <= reached ? "bg-brand-blue" : "bg-gray-200"}`} /><p className={`text-[10px] mt-1.5 ${i <= reached ? "text-blue-600 font-semibold" : "text-gray-400"}`}>{label(s)}</p></li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Items">
            <div className="divide-y divide-gray-100">
              {o.items.map((item) => (
                <div key={item._id || item.product} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Thumb src={item.image} />
                    <div className="min-w-0">
                      {can("products") ? <Link to={`/products/${item.product}`} className="text-xs font-bold text-gray-800 hover:text-blue-600 truncate block">{item.name}</Link> : <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>}
                      <p className="text-[11px] text-gray-400">{money(item.price)} / {item.unit} × {item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-800">{money(item.price * item.quantity)}</p>
                </div>
              ))}
              <div className="pt-3 flex items-center justify-between text-sm"><span className="font-semibold text-gray-600">Total</span><span className="font-bold text-gray-800">{money(o.amount)}</span></div>
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card title="Payment">
            <DetailList items={[
              ["Chosen at checkout", online ? "Pay online (Cashfree)" : o.paymentMethod === "upi" ? "UPI on delivery" : "Cash on delivery"],
              ["Status", <Badge key="p" status={o.paymentStatus}>{o.paymentStatus === "refunded" ? "Refunded" : paid ? "Received" : o.status === "pending_payment" ? "Awaiting payment" : "Pending"}</Badge>],
              paid ? ["Received via", o.paidVia === "online" ? "Online" : o.paidVia === "upi" ? "UPI" : "Cash"] : null,
              paid ? ["Reference", <span key="r" className="font-mono">{o.paymentReference || "—"}</span>] : null,
              paid ? ["Received at", dateTime(o.paymentReceivedAt)] : null,
            ]} />
          </Card>
          <OnlinePaymentsCard collections={collections} />
          <Card title="People">
            <div className="space-y-4">
              {[["Buyer", o.buyer], ["Seller", o.seller]].map(([who, person]) => person && (
                <div key={who} className="flex items-center gap-3">
                  <Avatar src={person.avatarUrl} name={person.fullName} />
                  <div><p className="text-[11px] text-gray-400">{who}</p>{can("users") ? <Link to={`/users/${person._id}`} className="text-xs font-bold text-gray-800 hover:text-blue-600">{person.fullName}</Link> : <p className="text-xs font-bold text-gray-800">{person.fullName}</p>}<p className="text-[11px] text-gray-400">{person.mobile}</p></div>
                </div>
              ))}
              <div className="text-xs"><p className="text-[11px] text-gray-400">Delivery address</p><p className="text-gray-700">{o.deliveryAddress}</p></div>
            </div>
          </Card>
          <Card title="Admin changes"><HistoryList items={history} /></Card>
        </div>
      </div>
      {dialog === "pay" && <VerifyPayment open onClose={() => setDialog(null)} order={o} />}
      <ConfirmDialog open={dialog === "reverse"} onClose={() => setDialog(null)} title="Reverse this payment?" tone="danger" confirmLabel="Reverse payment" reason reasonHint="The old payment details are kept in the audit log." message={`${money(o.amount)} (${o.paidVia === "upi" ? "UPI" : "cash"}${o.paymentReference ? ` ${o.paymentReference}` : ""}) goes back to pending and leaves the shop's earnings.`} onConfirm={(reason) => action.mutateAsync({ path: `/orders/${o._id}/payment/reverse`, body: { reason }, throwOnly: true })} />
      <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} title={target === "cancelled" ? "Cancel this order?" : `Mark order ${label(target)}?`} tone={target === "cancelled" ? "danger" : "primary"} confirmLabel={target === "cancelled" ? "Cancel order" : "Update status"} message={target === "cancelled" && o.paidVia === "online" && o.paymentStatus === "received" ? "Buyer and seller are notified with your reason. The online payment is refunded to the buyer automatically." : "Buyer and seller are notified with your reason."} reason reasonHint="Shown to the users and kept in the audit log." onConfirm={(reason) => action.mutateAsync({ path: `/orders/${o._id}/status`, method: "PATCH", body: { status: target, reason }, throwOnly: true })} />
    </>
  );
}
