import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useApi } from "../lib/hooks";
import { dateTime, money } from "../lib/format";
import { Badge, Card, ConfirmDialog, DetailList, ErrorState, PageHeader, Spinner, StatCard } from "../components/ui";
import { BookingsTable } from "../components/tables";
import { TractorForm } from "./Tractors";

export function Gallery({ images = [] }) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><i className="fa-regular fa-image text-3xl" /></div>;
  return (
    <div>
      <a href={images[active]} target="_blank" rel="noreferrer noopener"><img src={images[active]} alt="" className="w-full aspect-video object-cover rounded-lg border border-gray-100" /></a>
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {images.map((url, i) => <button key={url} type="button" onClick={() => setActive(i)} className={`flex-shrink-0 rounded-md border-2 ${i === active ? "border-blue-500" : "border-transparent"}`}><img src={url} alt="" className="w-14 h-14 object-cover rounded" /></button>)}
        </div>
      )}
    </div>
  );
}

export default function TractorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const action = useAction();
  const query = useApi(`/tractors/${id}`);
  const [dialog, setDialog] = useState(null);

  if (query.isPending) return <><PageHeader title="Tractor" crumbs={[{ label: "Tractors", to: "/tractors" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="Tractor" crumbs={[{ label: "Tractors", to: "/tractors" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;
  const { tractor: t, bookings, settings } = query.data;
  const completed = bookings.filter((b) => b.status === "completed");
  const active = bookings.filter((b) => ["pending", "accepted", "assigned", "on_the_way", "in_progress"].includes(b.status));
  const nextAvailability = t.availability === "available" ? "unavailable" : "available";

  return (
    <>
      <PageHeader
        title={t.brand}
        crumbs={[{ label: "Tractors", to: "/tractors" }, { label: t.brand }]}
        actions={
          <>
            <button type="button" className="btn-light" onClick={() => navigate(-1)}><i className="fa-solid fa-arrow-left text-[10px]" /> Back</button>
            <button type="button" className="btn-primary" onClick={() => setDialog("edit")}><i className="fa-solid fa-pen" /> Edit</button>
            <button type="button" className="btn-light" onClick={() => setDialog("availability")}><i className="fa-solid fa-power-off" /> Mark {nextAvailability}</button>
            <button type="button" className="btn-danger" onClick={() => setDialog("delete")} disabled={active.length > 0} title={active.length ? "Finish or cancel active bookings first" : undefined}><i className="fa-solid fa-trash" /> Delete</button>
          </>
        }
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <Card><Gallery images={t.images} /></Card>
          <Card title="Details">
            <DetailList items={[
              ["Status", <Badge key="s" status={t.availability} />],
              ["Vendor", t.owner ? <Link to={`/users/${t.owner._id}`} className="text-blue-600 hover:underline">{t.owner.fullName}</Link> : "—"],
              ["Vendor mobile", t.owner?.mobile],
              ["Price per acre", money(t.pricePerAcre)],
              ["Service radius", `${t.maxDistance} km`],
              ["Based at", t.location?.address || (t.location?.latitude ? `${t.location.latitude}, ${t.location.longitude}` : "Vendor location")],
              t.location?.latitude ? ["Map", <a key="m" href={`https://www.google.com/maps?q=${t.location.latitude},${t.location.longitude}`} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline">Open in Google Maps</a>] : null,
              ["Description", t.description],
              ["Added", dateTime(t.createdAt)],
              ["Updated", dateTime(t.updatedAt)],
            ]} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Bookings" value={bookings.length} icon="fa-regular fa-calendar-check" />
            <StatCard label="Active" value={active.length} icon="fa-solid fa-person-digging" tone="indigo" />
            <StatCard label="Earned" value={money(completed.reduce((s, b) => s + b.amount, 0))} icon="fa-solid fa-piggy-bank" tone="green" />
          </div>
          <Card title="Booking history"><BookingsTable rows={bookings} hide={["vendor"]} /></Card>
        </div>
      </div>
      <TractorForm open={dialog === "edit"} onClose={() => setDialog(null)} tractor={t} maxRadius={settings.maxTractorRadiusKm} />
      <ConfirmDialog open={dialog === "availability"} onClose={() => setDialog(null)} title={`Mark ${t.brand} ${nextAvailability}?`} confirmLabel="Confirm" message={nextAvailability === "unavailable" ? "Farmers will no longer see it in search." : "Farmers in its service area can book it again."} onConfirm={() => action.mutateAsync({ path: `/tractors/${t._id}/availability`, method: "PATCH", body: { availability: nextAvailability }, throwOnly: true })} />
      <ConfirmDialog open={dialog === "delete"} onClose={() => setDialog(null)} title={`Delete ${t.brand}?`} tone="danger" confirmLabel="Delete tractor" message="The listing is removed for good. Past bookings keep their own copy of the tractor details. The vendor is notified." onConfirm={async () => { await action.mutateAsync({ path: `/tractors/${t._id}`, method: "DELETE", throwOnly: true }); navigate("/tractors", { replace: true }); }} />
    </>
  );
}
