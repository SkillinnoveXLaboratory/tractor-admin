import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction, useApi, useUrlState } from "../lib/hooks";
import { ago, money } from "../lib/format";
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, SearchInput, Spinner, Table, Tabs, Thumb } from "../components/ui";
import { ImagesField, UserPicker } from "../components/forms";

function blank(product) {
  return { shopId: "", name: product?.name || "", description: product?.description || "", price: product?.price ?? "", unit: product?.unit || "kg", images: product?.images || [], files: [] };
}

// Add a product for a shopkeeper (live immediately) or edit any product.
export function ProductForm({ open, onClose, product }) {
  const editing = Boolean(product);
  const action = useAction();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => blank(product));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  useEffect(() => { if (open) { setForm(blank(product)); setErrors({}); setServerError(""); } }, [open, product]);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!editing && !form.shopId) next.shopId = "Choose the shopkeeper.";
    if (!form.name.trim()) next.name = "Enter the product name.";
    if (!form.description.trim()) next.description = "Describe the product.";
    if (form.price === "" || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) next.price = "Enter a valid price.";
    if (!form.images.length && !form.files.length) next.images = "Add at least one photo.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const data = new FormData();
    if (!editing) data.append("shopId", form.shopId);
    for (const key of ["name", "description", "price", "unit"]) data.append(key, String(form[key]).trim());
    if (editing) data.append("existingImages", JSON.stringify(form.images));
    form.files.forEach((file) => data.append("images", file));
    try {
      const result = await action.mutateAsync({ path: editing ? `/products/${product._id}` : "/products", method: editing ? "PATCH" : "POST", form: data, throwOnly: true });
      onClose();
      if (!editing) navigate(`/products/${result.product._id}`);
    } catch (err) { setServerError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} size="max-w-2xl" title={editing ? `Edit ${product.name}` : "Add product"} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="product-form" className="btn-primary" disabled={action.isPending}>{action.isPending && <i className="fa-solid fa-circle-notch fa-spin" />}{editing ? "Save changes" : "Add product"}</button></>}>
      <form id="product-form" onSubmit={submit} className="space-y-4" noValidate>
        {!editing && <UserPicker role="shopkeeper" label="Shopkeeper (seller)" value={form.shopId} onChange={(id) => setForm((f) => ({ ...f, shopId: id }))} error={errors.shopId} />}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Name" error={errors.name} className="sm:col-span-3"><input className="input" maxLength={120} value={form.name} onChange={set("name")} /></Field>
          <Field label="Price (₹)" error={errors.price} className="sm:col-span-2"><input className="input" inputMode="decimal" value={form.price} onChange={set("price")} /></Field>
          <Field label="Per"><select className="input" value={form.unit} onChange={set("unit")}><option value="kg">kg</option><option value="gram">gram</option></select></Field>
        </div>
        <Field label="Description" error={errors.description}><textarea className="input" rows={3} maxLength={1000} value={form.description} onChange={set("description")} /></Field>
        <ImagesField existing={form.images} onExistingChange={(images) => setForm({ ...form, images })} files={form.files} onFilesChange={(files) => setForm({ ...form, files })} error={errors.images} />
        {serverError && <p className="text-xs text-rose-500" role="alert">{serverError}</p>}
      </form>
    </Modal>
  );
}

const DEFAULTS = { status: "pending", q: "", shop: "" };

export default function Products() {
  const navigate = useNavigate();
  const action = useAction();
  const [state, update] = useUrlState(DEFAULTS);
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const query = useApi("/products", { ...state, status: state.status === "all" ? "" : state.status, limit: 20 }, { keepPrevious: true });
  const counts = query.data?.statusCounts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  const approve = (p, e) => {
    e.stopPropagation();
    action.mutate({ path: `/products/${p._id}/approve` });
  };

  const columns = [
    { key: "p", title: "Product", render: (p) => <div className="flex items-center gap-3 min-w-[220px]"><Thumb src={p.images?.[0]} /><div className="min-w-0"><p className="font-bold text-gray-800 truncate">{p.name}</p><p className="text-[11px] text-gray-400 truncate max-w-[260px]">{p.description}</p></div></div> },
    { key: "shop", title: "Shop", render: (p) => p.owner?.fullName || p.sellerName },
    { key: "price", title: "Price", render: (p) => <span className="whitespace-nowrap">{money(p.price)} / {p.unit}</span> },
    { key: "when", title: state.status === "pending" ? "Waiting" : "Added", className: "hidden md:table-cell", render: (p) => ago(p.createdAt) },
    { key: "status", title: "Status", render: (p) => <div><Badge status={p.status} />{p.rejectionReason && <p className="text-[11px] text-rose-400 mt-1 max-w-[180px] truncate" title={p.rejectionReason}>{p.rejectionReason}</p>}</div> },
    { key: "act", title: "", render: (p) => p.status !== "active" ? (
      <div className="flex gap-1.5 justify-end">
        <button type="button" className="btn-success px-2.5 py-1.5" onClick={(e) => approve(p, e)} disabled={action.isPending}><i className="fa-solid fa-check" /> Approve</button>
        {p.status === "pending" && <button type="button" className="btn-light px-2.5 py-1.5" onClick={(e) => { e.stopPropagation(); setRejecting(p); }}><i className="fa-solid fa-xmark" /> Reject</button>}
      </div>
    ) : null },
  ];

  return (
    <>
      <PageHeader title="Products" crumbs={[{ label: "Marketplace" }, { label: "Products" }]} actions={<button type="button" className="btn-primary" onClick={() => setAdding(true)}><i className="fa-solid fa-plus" /> Add product</button>} />
      <Card>
        <Tabs
          value={state.status}
          onChange={(status) => update({ status })}
          tabs={[
            { value: "pending", label: "Awaiting approval", count: query.data ? counts.pending || 0 : undefined },
            { value: "active", label: "Live", count: query.data ? counts.active || 0 : undefined },
            { value: "rejected", label: "Rejected", count: query.data ? counts.rejected || 0 : undefined },
            { value: "all", label: "All", count: query.data ? all : undefined },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Product, description or shop" />
          {state.shop && <button type="button" className="btn-light" onClick={() => update({ shop: "" })}><i className="fa-solid fa-xmark" /> Clear shop filter</button>}
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <Table columns={columns} rows={query.data.items} onRowClick={(p) => navigate(`/products/${p._id}`)} empty={<EmptyState icon="fa-solid fa-bag-shopping" title={state.status === "pending" ? "Nothing waiting for approval" : "No products"} text={state.status === "pending" ? "New shopkeeper products appear here for review." : undefined} />} />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
      <ProductForm open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={`Reject ${rejecting?.name || "product"}?`} tone="danger" confirmLabel="Reject" reason reasonLabel="What should the shopkeeper fix?" reasonHint="The shopkeeper sees this in the app and can edit the product to resubmit it." onConfirm={(reason) => action.mutateAsync({ path: `/products/${rejecting._id}/reject`, body: { reason }, throwOnly: true })} />
    </>
  );
}
