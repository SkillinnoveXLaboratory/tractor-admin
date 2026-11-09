import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { dateTime, money, shortId, titleCase } from "../lib/format";
import { Badge, Card, ConfirmDialog, EmptyState, Table } from "./ui";

// Online payments (Cashfree Easy Split): the farmer pays, the platform keeps its commission and the seller's
// share settles straight to the seller's bank.
const COLLECTION_TONES = { created: "gray", paid: "emerald", failed: "rose", refund_pending: "amber", refunded: "indigo", refund_failed: "rose" };
const COLLECTION_LABELS = { created: "Not paid", paid: "Paid", failed: "Failed", refund_pending: "Refund pending", refunded: "Refunded", refund_failed: "Refund failed" };

export function CollectionBadge({ status }) {
  return <Badge tone={COLLECTION_TONES[status] || "gray"}>{COLLECTION_LABELS[status] || titleCase(status)}</Badge>;
}

const refundable = (c) => c.status === "paid" || c.status === "refund_failed";

// Refund + "check with Cashfree" actions for one payment.
function useCollectionActions() {
  const action = useAction();
  const [refunding, setRefunding] = useState(null);
  const sync = (c) => action.mutate({ path: `/collections/${encodeURIComponent(c.orderId)}/sync` });
  const dialog = (
    <ConfirmDialog
      open={Boolean(refunding)}
      onClose={() => setRefunding(null)}
      title={refunding?.status === "refund_failed" ? "Retry the refund?" : "Refund this payment?"}
      tone="danger"
      confirmLabel="Refund in full"
      reason
      reasonHint="Kept in the audit log. The booking/order status isn't changed — cancel it separately if needed."
      message={refunding ? `${money(refunding.amount)} goes back to the farmer's original payment method. The seller's share (${money(refunding.sellerShare)}) is recovered from their settlement and the platform commission (${money(refunding.commission)}) is returned.` : ""}
      onConfirm={(reason) => action.mutateAsync({ path: `/collections/${encodeURIComponent(refunding.orderId)}/refund`, body: { reason }, throwOnly: true })}
    />
  );
  return { setRefunding, sync, busy: action.isPending, dialog };
}

function RowActions({ c, actions }) {
  const { can } = useAuth();
  if (!can("payments")) return null;
  return (
    <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
      {(c.status === "created" || c.status === "refund_pending") && <button type="button" className="btn-light py-1 px-2 text-[11px]" disabled={actions.busy} onClick={() => actions.sync(c)} title="Check the latest status with Cashfree"><i className="fa-solid fa-rotate" /></button>}
      {refundable(c) && <button type="button" className="btn-light py-1 px-2 text-[11px] text-rose-500" onClick={() => actions.setRefunding(c)}><i className="fa-solid fa-rotate-left" /> {c.status === "refund_failed" ? "Retry refund" : "Refund"}</button>}
    </div>
  );
}

export function CollectionsTable({ rows }) {
  const navigate = useNavigate();
  const actions = useCollectionActions();
  return (
    <>
      <Table
        rows={rows}
        onRowClick={(c) => navigate(`/${c.kind === "booking" ? "bookings" : "orders"}/${c.ref}`)}
        columns={[
          { key: "w", title: "Date", render: (c) => <span className="whitespace-nowrap">{dateTime(c.paidAt || c.createdAt)}</span> },
          { key: "k", title: "For", render: (c) => <span><b className="text-gray-800">{c.kind === "booking" ? "Booking" : "Order"} {shortId(c.ref)}</b><br /><span className="font-mono text-[10px] text-gray-400">{c.orderId}</span></span> },
          { key: "p", title: "Farmer", render: (c) => c.payer?.fullName || "—" },
          { key: "s", title: "Seller", render: (c) => <span>{c.seller?.fullName || "—"}<br /><span className="text-[11px] text-gray-400">{titleCase(c.seller?.role)}</span></span> },
          { key: "a", title: "Amount", render: (c) => <span className="font-semibold text-gray-800">{money(c.amount)}</span> },
          { key: "c", title: "Commission", className: "hidden md:table-cell", render: (c) => <span className="text-emerald-600 font-semibold">{money(c.commission)}<span className="text-[10px] text-gray-400 font-normal"> · {c.commissionPercent}%</span></span> },
          { key: "sh", title: "To seller", className: "hidden md:table-cell", render: (c) => money(c.sellerShare) },
          { key: "m", title: "Mode", className: "hidden lg:table-cell", render: (c) => (c.paymentGroup ? titleCase(c.paymentGroup) : "—") },
          { key: "st", title: "Status", render: (c) => <CollectionBadge status={c.status} /> },
          { key: "x", title: "", render: (c) => <RowActions c={c} actions={actions} /> },
        ]}
        empty={<EmptyState icon="fa-solid fa-credit-card" title="No online payments" text="Payments farmers make in the app for bookings and orders show here." />}
      />
      {actions.dialog}
    </>
  );
}

// Detail-page card: every online payment attempt for one booking or order.
export function OnlinePaymentsCard({ collections }) {
  const actions = useCollectionActions();
  const { can } = useAuth();
  const shown = (collections || []).filter((c) => c.status !== "created" && c.status !== "failed");
  if (!shown.length) return null;
  return (
    <Card title="Online payment">
      <div className="space-y-4">
        {shown.map((c) => (
          <div key={c.orderId} className="text-xs space-y-1.5">
            <div className="flex items-center justify-between"><span className="font-bold text-gray-800 text-sm">{money(c.amount)}</span><CollectionBadge status={c.status} /></div>
            <p className="flex justify-between"><span className="text-gray-400">Platform commission ({c.commissionPercent}%)</span><span className="font-semibold text-emerald-600">{money(c.commission)}</span></p>
            <p className="flex justify-between"><span className="text-gray-400">Settled to seller</span><span className="font-semibold text-gray-700">{money(c.sellerShare)}</span></p>
            <p className="flex justify-between"><span className="text-gray-400">Paid</span><span>{dateTime(c.paidAt)}{c.paymentGroup ? ` · ${titleCase(c.paymentGroup)}` : ""}</span></p>
            {c.cfPaymentId && <p className="flex justify-between"><span className="text-gray-400">Cashfree payment</span><span className="font-mono">{c.cfPaymentId}</span></p>}
            {c.refundId && <p className="flex justify-between"><span className="text-gray-400">Refund</span><span>{c.refundedAt ? dateTime(c.refundedAt) : "Requested " + dateTime(c.refundRequestedAt)}</span></p>}
            {c.refundReason && <p className="text-gray-500 bg-gray-50 rounded px-2 py-1">{c.refundReason}</p>}
            {can("payments") && (refundable(c) || c.status === "refund_pending") && (
              <div className="flex gap-2 pt-1">
                {refundable(c) && <button type="button" className="btn-light text-rose-500 text-xs" onClick={() => actions.setRefunding(c)}><i className="fa-solid fa-rotate-left" /> {c.status === "refund_failed" ? "Retry refund" : "Refund"}</button>}
                {c.status === "refund_pending" && <button type="button" className="btn-light text-xs" disabled={actions.busy} onClick={() => actions.sync(c)}><i className="fa-solid fa-rotate" /> Check refund status</button>}
              </div>
            )}
          </div>
        ))}
      </div>
      {actions.dialog}
    </Card>
  );
}
