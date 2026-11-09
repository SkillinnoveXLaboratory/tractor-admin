import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useApi } from "../lib/hooks";
import { date, dateTime, money, shortId, titleCase } from "../lib/format";
import { Avatar, Badge, Card, ConfirmDialog, DetailList, ErrorState, Modal, PageHeader, Spinner, Thumb } from "../components/ui";
import { HistoryList } from "../components/tables";
import { OnlinePaymentsCard } from "../components/collections";
import { UserPicker } from "../components/forms";

const STEPS = ["pending", "accepted", "assigned", "on_the_way", "in_progress", "completed"];

function Person({ label, person, link }) {
  if (!person) return <div className="text-xs text-gray-400">{label}: not assigned</div>;
  return (
    <div className="flex items-center gap-3">
      <Avatar src={person.avatarUrl} name={person.fullName} />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        {link ? <Link to={`/users/${person._id}`} className="text-xs font-bold text-gray-800 hover:text-blue-600">{person.fullName}</Link> : <p className="text-xs font-bold text-gray-800">{person.fullName}</p>}
        <p className="text-[11px] text-gray-400">{person.mobile}</p>
      </div>
    </div>
  );
}

function AssignDriver({ open, onClose, booking }) {
  const action = useAction();
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    try {
      await action.mutateAsync({ path: `/bookings/${booking._id}/driver`, method: "PATCH", body: { driverId }, throwOnly: true });
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} title={booking.driver ? "Reassign driver" : "Assign driver"} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" onClick={submit} disabled={!driverId || action.isPending}>Assign</button></>}>
      <p className="text-sm text-gray-600 mb-3">Only drivers who work for {booking.vendor?.fullName || "this vendor"} can be assigned. The driver, farmer and vendor are notified.</p>
      <UserPicker role="driver" vendor={booking.vendor?._id} label="Driver" value={driverId} onChange={(id) => { setDriverId(id); setError(""); }} />
      {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
    </Modal>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const action = useAction();
  const meta = useApi("/meta", null, { staleTime: 60000 });
  const query = useApi(`/bookings/${id}`);
  const [target, setTarget] = useState(null);
  const [assigning, setAssigning] = useState(false);

  if (query.isPending) return <><PageHeader title="Booking" crumbs={[{ label: "Bookings", to: "/bookings" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="Booking" crumbs={[{ label: "Bookings", to: "/bookings" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;
  const { booking: b, history, nextStatuses, collections } = query.data;
  const label = (s) => titleCase(meta.data?.bookingLabels?.[s] || s);
  const reached = b.status === "cancelled" ? -1 : STEPS.indexOf(b.status);

  return (
    <>
      <PageHeader
        title={`Booking ${shortId(b._id)}`}
        crumbs={[{ label: "Bookings", to: "/bookings" }, { label: shortId(b._id) }]}
        actions={
          <>
            <button type="button" className="btn-light" onClick={() => navigate(-1)}><i className="fa-solid fa-arrow-left text-[10px]" /> Back</button>
            {["accepted", "assigned"].includes(b.status) && <button type="button" className="btn-primary" onClick={() => setAssigning(true)}><i className="fa-solid fa-id-card" /> {b.driver ? "Reassign driver" : "Assign driver"}</button>}
            {nextStatuses.map((s) => (
              <button key={s} type="button" className={s === "cancelled" ? "btn-danger" : "btn-light"} onClick={() => setTarget(s)}>
                <i className={`fa-solid ${s === "cancelled" ? "fa-ban" : "fa-forward-step"}`} /> {s === "cancelled" ? "Cancel booking" : `Mark ${label(s)}`}
              </button>
            ))}
          </>
        }
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <Thumb src={b.tractorSnapshot?.image} className="w-14 h-14" />
                <div>
                  <p className="text-base font-bold text-gray-800">{b.tractorSnapshot?.brand}</p>
                  <p className="text-xs text-gray-400">{b.tractor ? <Link to={`/tractors/${b.tractor._id}`} className="text-blue-600 hover:underline">View tractor</Link> : "Tractor removed"} · booked {dateTime(b.createdAt)}</p>
                </div>
              </div>
              <Badge status={b.status} />
            </div>
            {b.status === "cancelled" ? (
              <p className="text-xs text-rose-500 bg-rose-50 rounded-lg px-3 py-2"><i className="fa-solid fa-ban mr-1" /> This booking was cancelled.</p>
            ) : (
              <ol className="grid grid-cols-6 gap-1">
                {STEPS.map((s, i) => (
                  <li key={s} className="text-center">
                    <div className={`h-1.5 rounded-full ${i <= reached ? "bg-brand-blue" : "bg-gray-200"}`} />
                    <p className={`text-[10px] mt-1.5 ${i <= reached ? "text-blue-600 font-semibold" : "text-gray-400"}`}>{label(s)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Booking details">
            <DetailList items={[
              ["Service date", date(b.serviceDate)],
              ["Farm location", b.farmLocation],
              b.farmPoint?.latitude ? ["Farm on map", <a key="m" href={`https://www.google.com/maps?q=${b.farmPoint.latitude},${b.farmPoint.longitude}`} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline">Open in Google Maps</a>] : null,
              ["Distance from tractor", b.distanceKm != null ? `${b.distanceKm} km` : "—"],
              ["Acres", b.acres],
              ["Rate", `${money(b.tractorSnapshot?.pricePerAcre)} / acre`],
              ["Amount", <b key="a" className="text-gray-800">{money(b.amount)}</b>],
              ["Driver pay", b.status === "completed" ? money(b.driverPay ?? 0) : "Set when the job completes"],
              ["Notes", b.notes || "—"],
              ["Completed", b.completedAt ? dateTime(b.completedAt) : "—"],
            ]} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <OnlinePaymentsCard collections={collections} />
          <Card title="People">
            <div className="space-y-4">
              <Person label="Farmer" person={b.farmer} link />
              <Person label="Vendor" person={b.vendor} link />
              <Person label="Driver" person={b.driver} link />
            </div>
          </Card>
          <Card title="Admin changes"><HistoryList items={history} /></Card>
        </div>
      </div>
      <AssignDriver open={assigning} onClose={() => setAssigning(false)} booking={b} />
      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target === "cancelled" ? "Cancel this booking?" : `Mark booking ${label(target)}?`}
        tone={target === "cancelled" ? "danger" : "primary"}
        confirmLabel={target === "cancelled" ? "Cancel booking" : "Update status"}
        message={target === "completed" ? "The driver's fixed pay is recorded on this job now. Farmer, vendor and driver are notified." : target === "cancelled" && b.payment?.status === "paid" ? `Farmer, vendor and driver are notified with your reason. The online payment (${money(b.payment.amount)}) is refunded to the farmer automatically.` : "Farmer, vendor and driver are notified with your reason."}
        reason
        reasonHint="Shown to the users and kept in the audit log."
        onConfirm={(reason) => action.mutateAsync({ path: `/bookings/${b._id}/status`, method: "PATCH", body: { status: target, reason }, throwOnly: true })}
      />
    </>
  );
}
