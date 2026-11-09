import { useApi, useUrlState } from "../lib/hooks";
import { downloadCsv } from "../lib/api";
import { titleCase } from "../lib/format";
import { Card, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner, Tabs, useToast } from "../components/ui";
import { OrdersTable } from "../components/tables";

const DEFAULTS = { status: "", payment: "", q: "", from: "", to: "", seller: "", buyer: "" };

export default function Orders() {
  const toast = useToast();
  const [state, update] = useUrlState(DEFAULTS);
  const meta = useApi("/meta", null, { staleTime: 60000 });
  const query = useApi("/orders", { ...state, limit: 20 }, { keepPrevious: true });
  const counts = query.data?.statusCounts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const filters = { status: state.status, payment: state.payment, q: state.q, from: state.from, to: state.to, seller: state.seller, buyer: state.buyer };

  const exportCsv = async () => {
    try { await downloadCsv("/export/orders.csv", filters, "orders.csv"); } catch (err) { toast(err.message, "error"); }
  };

  return (
    <>
      <PageHeader title="Orders" crumbs={[{ label: "Marketplace" }, { label: "Orders" }]} actions={<button type="button" className="btn-light" onClick={exportCsv}><i className="fa-solid fa-arrow-up-from-bracket text-[10px]" /> Export CSV</button>} />
      <Card>
        <Tabs
          value={state.status}
          onChange={(status) => update({ status })}
          tabs={[{ value: "", label: "All", count: query.data ? all : undefined }, ...(meta.data?.orderStatuses || []).map((s) => ({ value: s, label: titleCase(meta.data.orderLabels[s]), count: query.data ? counts[s] || 0 : undefined }))]}
        />
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Product, address or payment reference" />
          <Select value={state.payment} onChange={(payment) => update({ payment })} placeholder="Any payment" options={[{ value: "due", label: "Awaiting payment check" }, { value: "pending", label: "Not paid yet" }, { value: "received", label: "Paid" }]} />
          <label className="text-[11px] text-gray-400">From<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.from} onChange={(e) => update({ from: e.target.value })} /></label>
          <label className="text-[11px] text-gray-400">To<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.to} onChange={(e) => update({ to: e.target.value })} /></label>
          {(state.seller || state.buyer || state.from || state.to) && <button type="button" className="btn-light" onClick={() => update({ seller: "", buyer: "", from: "", to: "" })}><i className="fa-solid fa-xmark" /> Clear filters</button>}
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <OrdersTable rows={query.data.items} empty={<EmptyState icon="fa-solid fa-cart-shopping" title="No orders match" />} />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </>
  );
}
