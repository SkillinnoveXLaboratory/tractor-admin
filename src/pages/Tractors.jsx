import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction, useApi, useUrlState } from "../lib/hooks";
import { money } from "../lib/format";
import { Badge, Card, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, Table, Thumb } from "../components/ui";
import { ImagesField, LocationFields, UserPicker } from "../components/forms";

function blank(tractor) {
  return {
    vendorId: tractor?.owner?._id || "",
    brand: tractor?.brand || "",
    description: tractor?.description || "",
    maxDistance: tractor?.maxDistance ?? "",
    pricePerAcre: tractor?.pricePerAcre ?? "",
    availability: tractor?.availability || "available",
    location: { latitude: tractor?.location?.latitude ?? "", longitude: tractor?.location?.longitude ?? "", address: tractor?.location?.address || "" },
    images: tractor?.images || [],
    files: [],
  };
}

// Add a tractor for a vendor, or edit any tractor. The radius limit comes from settings.
export function TractorForm({ open, onClose, tractor, maxRadius = 1000 }) {
  const editing = Boolean(tractor);
  const action = useAction();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => blank(tractor));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  useEffect(() => { if (open) { setForm(blank(tractor)); setErrors({}); setServerError(""); } }, [open, tractor]);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!editing && !form.vendorId) next.vendorId = "Choose the vendor.";
    if (!form.brand.trim()) next.brand = "Enter the brand and model.";
    if (!form.description.trim()) next.description = "Describe the tractor.";
    const radius = Number(form.maxDistance);
    if (!Number.isFinite(radius) || radius < 1 || radius > maxRadius) next.maxDistance = `1–${maxRadius} km.`;
    if (!Number.isFinite(Number(form.pricePerAcre)) || form.pricePerAcre === "" || Number(form.pricePerAcre) < 0) next.pricePerAcre = "Enter a price.";
    if (!form.images.length && !form.files.length) next.images = "Add at least one photo.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const data = new FormData();
    if (!editing) data.append("vendorId", form.vendorId);
    for (const key of ["brand", "description", "maxDistance", "pricePerAcre", "availability"]) data.append(key, String(form[key]).trim());
    const { latitude, longitude, address } = form.location;
    if (latitude !== "" && longitude !== "") { data.append("latitude", latitude); data.append("longitude", longitude); data.append("locationAddress", address); }
    if (editing) data.append("existingImages", JSON.stringify(form.images));
    form.files.forEach((file) => data.append("images", file));
    try {
      const result = await action.mutateAsync({ path: editing ? `/tractors/${tractor._id}` : "/tractors", method: editing ? "PATCH" : "POST", form: data, throwOnly: true });
      onClose();
      if (!editing) navigate(`/tractors/${result.tractor._id}`);
    } catch (err) { setServerError(err.message); }
  };

  return (
    <Modal open={open} onClose={onClose} size="max-w-2xl" title={editing ? `Edit ${tractor.brand}` : "Add tractor"} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="tractor-form" className="btn-primary" disabled={action.isPending}>{action.isPending && <i className="fa-solid fa-circle-notch fa-spin" />}{editing ? "Save changes" : "Add tractor"}</button></>}>
      <form id="tractor-form" onSubmit={submit} className="space-y-4" noValidate>
        {!editing && <UserPicker role="vendor" label="Vendor (owner)" value={form.vendorId} onChange={(id) => setForm((f) => ({ ...f, vendorId: id }))} error={errors.vendorId} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Brand & model" error={errors.brand}><input className="input" maxLength={120} value={form.brand} onChange={set("brand")} /></Field>
          <Field label="Availability"><select className="input" value={form.availability} onChange={set("availability")}><option value="available">Available</option><option value="unavailable">Unavailable</option></select></Field>
          <Field label="Price per acre (₹)" error={errors.pricePerAcre}><input className="input" inputMode="decimal" value={form.pricePerAcre} onChange={set("pricePerAcre")} /></Field>
          <Field label={`Service radius (km, max ${maxRadius})`} error={errors.maxDistance}><input className="input" inputMode="numeric" value={form.maxDistance} onChange={set("maxDistance")} /></Field>
        </div>
        <Field label="Description" error={errors.description}><textarea className="input" rows={3} maxLength={1000} value={form.description} onChange={set("description")} /></Field>
        <div>
          <p className="label">Where the tractor is based {editing ? "" : "(leave empty to use the vendor's location)"}</p>
          <LocationFields value={form.location} onChange={(location) => setForm({ ...form, location })} />
        </div>
        <ImagesField existing={form.images} onExistingChange={(images) => setForm({ ...form, images })} files={form.files} onFilesChange={(files) => setForm({ ...form, files })} error={errors.images} />
        {serverError && <p className="text-xs text-rose-500" role="alert">{serverError}</p>}
      </form>
    </Modal>
  );
}

const DEFAULTS = { q: "", availability: "", vendor: "" };

export default function Tractors() {
  const navigate = useNavigate();
  const [state, update] = useUrlState(DEFAULTS);
  const [adding, setAdding] = useState(false);
  const query = useApi("/tractors", { ...state, limit: 20 }, { keepPrevious: true });
  const meta = useApi("/meta", null, { staleTime: 60000 });

  const columns = [
    { key: "t", title: "Tractor", render: (t) => <div className="flex items-center gap-3 min-w-[200px]"><Thumb src={t.images?.[0]} /><div className="min-w-0"><p className="font-bold text-gray-800 truncate">{t.brand}</p><p className="text-[11px] text-gray-400 truncate max-w-[220px]">{t.location?.address || "No address"}</p></div></div> },
    { key: "vendor", title: "Vendor", render: (t) => <span>{t.owner?.fullName || "—"}{t.owner?.status === "suspended" && <span className="ml-1"><Badge status="suspended" /></span>}</span> },
    { key: "price", title: "Per acre", render: (t) => money(t.pricePerAcre) },
    { key: "radius", title: "Radius", className: "hidden md:table-cell", render: (t) => `${t.maxDistance} km` },
    { key: "bookings", title: "Bookings", className: "hidden lg:table-cell", render: (t) => <span>{t.stats.bookings}{t.stats.active > 0 && <span className="text-blue-600"> · {t.stats.active} active</span>}</span> },
    { key: "revenue", title: "Earned", className: "hidden lg:table-cell", render: (t) => money(t.stats.revenue) },
    { key: "status", title: "Status", render: (t) => <Badge status={t.availability} /> },
  ];

  return (
    <>
      <PageHeader title="Tractors" crumbs={[{ label: "Operations" }, { label: "Tractors" }]} actions={<button type="button" className="btn-primary" onClick={() => setAdding(true)}><i className="fa-solid fa-plus" /> Add tractor</button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Brand, description or place" />
          <Select value={state.availability} onChange={(availability) => update({ availability })} placeholder="Any availability" options={[{ value: "available", label: "Available" }, { value: "unavailable", label: "Unavailable" }]} />
          {state.vendor && <button type="button" className="btn-light" onClick={() => update({ vendor: "" })}><i className="fa-solid fa-xmark" /> Clear vendor filter</button>}
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <Table columns={columns} rows={query.data.items} onRowClick={(t) => navigate(`/tractors/${t._id}`)} empty={<EmptyState icon="fa-solid fa-tractor" title="No tractors match" />} />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
      <TractorForm open={adding} onClose={() => setAdding(false)} maxRadius={meta.data?.limits?.maxTractorRadiusKm} />
    </>
  );
}
