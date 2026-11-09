import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useApi } from "../lib/hooks";
import { dateTime, money, num } from "../lib/format";
import { Badge, Card, ConfirmDialog, DetailList, ErrorState, PageHeader, Spinner, StatCard } from "../components/ui";
import { HistoryList } from "../components/tables";
import { Gallery } from "./TractorDetail";
import { ProductForm } from "./Products";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const action = useAction();
  const query = useApi(`/products/${id}`);
  const [dialog, setDialog] = useState(null);

  if (query.isPending) return <><PageHeader title="Product" crumbs={[{ label: "Products", to: "/products" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="Product" crumbs={[{ label: "Products", to: "/products" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;
  const { product: p, sales, history } = query.data;

  return (
    <>
      <PageHeader
        title={p.name}
        crumbs={[{ label: "Products", to: "/products" }, { label: p.name }]}
        actions={
          <>
            <button type="button" className="btn-light" onClick={() => navigate(-1)}><i className="fa-solid fa-arrow-left text-[10px]" /> Back</button>
            {p.status !== "active" && <button type="button" className="btn-success" onClick={() => action.mutate({ path: `/products/${p._id}/approve` })} disabled={action.isPending}><i className="fa-solid fa-check" /> Approve</button>}
            {p.status !== "rejected" && <button type="button" className="btn-light" onClick={() => setDialog("reject")}><i className="fa-solid fa-xmark" /> {p.status === "active" ? "Unpublish (reject)" : "Reject"}</button>}
            <button type="button" className="btn-primary" onClick={() => setDialog("edit")}><i className="fa-solid fa-pen" /> Edit</button>
            <button type="button" className="btn-danger" onClick={() => setDialog("delete")}><i className="fa-solid fa-trash" /> Delete</button>
          </>
        }
      />
      {p.status === "rejected" && <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200/60 text-sm text-rose-600"><b>Rejected:</b> {p.rejectionReason}</div>}
      {p.status === "pending" && <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/60 text-sm text-amber-700"><i className="fa-solid fa-hourglass-half mr-1" /> Waiting for approval. Farmers can’t see it yet.</div>}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <Card><Gallery images={p.images} /></Card>
        </div>
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Orders" value={num(sales.orders)} icon="fa-solid fa-cart-shopping" />
            <StatCard label={`Sold (${p.unit})`} value={num(sales.quantity)} icon="fa-solid fa-box" tone="indigo" />
            <StatCard label="Sales value" value={money(sales.revenue)} icon="fa-solid fa-piggy-bank" tone="green" />
          </div>
          <Card title="Details">
            <DetailList items={[
              ["Status", <Badge key="s" status={p.status} />],
              ["Shop", p.owner ? <Link to={`/users/${p.owner._id}`} className="text-blue-600 hover:underline">{p.owner.fullName}</Link> : p.sellerName],
              ["Shop contact", p.owner ? `${p.owner.mobile} · ${p.owner.email}` : "—"],
              ["Price", `${money(p.price)} per ${p.unit}`],
              ["Description", p.description],
              ["Added", dateTime(p.createdAt)],
              ["Reviewed", dateTime(p.reviewedAt)],
            ]} />
          </Card>
          <Card title="Admin changes"><HistoryList items={history} /></Card>
        </div>
      </div>
      <ProductForm open={dialog === "edit"} onClose={() => setDialog(null)} product={p} />
      <ConfirmDialog open={dialog === "reject"} onClose={() => setDialog(null)} title={`Reject ${p.name}?`} tone="danger" confirmLabel="Reject" reason reasonLabel="What should the shopkeeper fix?" reasonHint="Shown to the shopkeeper in the app." message={p.status === "active" ? "The product is hidden from farmers until it's approved again." : undefined} onConfirm={(reason) => action.mutateAsync({ path: `/products/${p._id}/reject`, body: { reason }, throwOnly: true })} />
      <ConfirmDialog open={dialog === "delete"} onClose={() => setDialog(null)} title={`Delete ${p.name}?`} tone="danger" confirmLabel="Delete product" reason reasonHint="Sent to the shopkeeper." message="The product is removed for good. Past orders keep their own copy." onConfirm={async (reason) => { await action.mutateAsync({ path: `/products/${p._id}`, method: "DELETE", body: { reason }, throwOnly: true }); navigate("/products", { replace: true }); }} />
    </>
  );
}
