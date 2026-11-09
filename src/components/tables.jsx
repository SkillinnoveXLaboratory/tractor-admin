import { useNavigate } from "react-router-dom";
import { date, dateTime, money, shortId } from "../lib/format";
import { Badge, EmptyState, Table, Thumb } from "./ui";

// Booking columns shared by the bookings list, user detail and tractor detail. `hide` drops columns already implied by the page.
export function BookingsTable({ rows, hide = [], empty, payColumn = false }) {
  const navigate = useNavigate();
  const columns = [
    { key: "id", title: "Booking", render: (b) => <div className="min-w-[150px]"><p className="font-bold text-gray-800">{b.tractorSnapshot?.brand || "Tractor"}</p><p className="text-[11px] text-gray-400">{shortId(b._id)} · {date(b.createdAt)}</p></div> },
    { key: "farmer", title: "Farmer", render: (b) => b.farmer?.fullName || "—" },
    { key: "vendor", title: "Vendor", render: (b) => b.vendor?.fullName || "—" },
    { key: "driver", title: "Driver", render: (b) => b.driver?.fullName || <span className="text-gray-300">Not assigned</span> },
    { key: "service", title: "Service date", className: "hidden md:table-cell", render: (b) => date(b.serviceDate) },
    { key: "acres", title: "Acres", className: "hidden lg:table-cell", render: (b) => b.acres },
    { key: "amount", title: "Amount", render: (b) => <span className="font-semibold text-gray-800">{money(b.amount)}</span> },
    ...(payColumn ? [{ key: "pay", title: "Driver pay", render: (b) => (b.status === "completed" ? <span className="font-semibold text-emerald-600">{money(b.driverPay)}</span> : "—") }] : []),
    { key: "status", title: "Status", render: (b) => <Badge status={b.status} /> },
  ].filter((c) => !hide.includes(c.key));
  return <Table columns={columns} rows={rows} onRowClick={(b) => navigate(`/bookings/${b._id}`)} empty={empty || <EmptyState icon="fa-regular fa-calendar" title="No bookings" />} />;
}

export function OrdersTable({ rows, hide = [], empty }) {
  const navigate = useNavigate();
  const columns = [
    { key: "id", title: "Order", render: (o) => <div className="flex items-center gap-3 min-w-[170px]"><Thumb src={o.items?.[0]?.image} /><div><p className="font-bold text-gray-800">{shortId(o._id)}</p><p className="text-[11px] text-gray-400">{o.items?.length} item{o.items?.length === 1 ? "" : "s"} · {date(o.createdAt)}</p></div></div> },
    { key: "buyer", title: "Buyer", render: (o) => o.buyer?.fullName || "—" },
    { key: "seller", title: "Seller", render: (o) => o.seller?.fullName || "—" },
    { key: "amount", title: "Amount", render: (o) => <span className="font-semibold text-gray-800">{money(o.amount)}</span> },
    { key: "payment", title: "Payment", render: (o) => <div className="flex flex-col items-start gap-1"><Badge status={o.paymentStatus}>{o.paymentStatus === "refunded" ? "Refunded" : o.paymentStatus === "received" ? `Paid · ${o.paidVia?.toUpperCase()}` : o.status === "pending_payment" ? "Awaiting online payment" : `Due · ${o.paymentMethod?.toUpperCase()}`}</Badge></div> },
    { key: "status", title: "Status", render: (o) => <Badge status={o.status} /> },
  ].filter((c) => !hide.includes(c.key));
  return <Table columns={columns} rows={rows} onRowClick={(o) => navigate(`/orders/${o._id}`)} empty={empty || <EmptyState icon="fa-solid fa-cart-shopping" title="No orders" />} />;
}

export function PaymentsTable({ rows, hide = [] }) {
  const navigate = useNavigate();
  const columns = [
    { key: "paidAt", title: "Paid at", render: (o) => dateTime(o.paymentReceivedAt) },
    { key: "order", title: "Order", render: (o) => <span className="font-bold text-gray-800">{shortId(o._id)}</span> },
    { key: "seller", title: "Shop", render: (o) => o.seller?.fullName || "—" },
    { key: "buyer", title: "Buyer", render: (o) => o.buyer?.fullName || "—" },
    { key: "method", title: "Mode", render: (o) => <Badge tone={o.paidVia === "online" ? "blue" : o.paidVia === "upi" ? "indigo" : "teal"}>{o.paidVia === "online" ? "Online" : o.paidVia === "upi" ? "UPI" : "Cash"}</Badge> },
    { key: "ref", title: "Reference", render: (o) => <span className="font-mono text-[11px]">{o.paymentReference || "—"}</span> },
    { key: "amount", title: "Amount", render: (o) => <span className="font-semibold text-emerald-600">{money(o.amount)}</span> },
  ].filter((c) => !hide.includes(c.key));
  return <Table columns={columns} rows={rows} onRowClick={(o) => navigate(`/orders/${o._id}`)} empty={<EmptyState icon="fa-solid fa-wallet" title="No verified payments" />} />;
}

// Audit entries shown on detail pages.
export function HistoryList({ items }) {
  if (!items?.length) return <EmptyState icon="fa-solid fa-clock-rotate-left" title="No admin changes yet" />;
  return (
    <ol className="relative border-l border-gray-200 ml-2 space-y-4">
      {items.map((h) => (
        <li key={h._id} className="ml-4">
          <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
          <p className="text-xs text-gray-700 font-medium">{h.summary}</p>
          <p className="text-[11px] text-gray-400">{h.adminName} · {dateTime(h.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
