import { useApi, useUrlState } from "../lib/hooks";
import { downloadCsv } from "../lib/api";
import { titleCase } from "../lib/format";
import { Card, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Spinner, Tabs, useToast } from "../components/ui";
import { BookingsTable } from "../components/tables";

const DEFAULTS = { status: "", q: "", from: "", to: "", vendor: "", driver: "", farmer: "", tractor: "" };

export default function Bookings() {
  const toast = useToast();
  const [state, update] = useUrlState(DEFAULTS);
  const meta = useApi("/meta", null, { staleTime: 60000 });
  const query = useApi("/bookings", { ...state, limit: 20 }, { keepPrevious: true });
  const counts = query.data?.statusCounts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const personFilter = ["vendor", "driver", "farmer", "tractor"].find((key) => state[key]);
  const filters = { status: state.status, q: state.q, from: state.from, to: state.to, vendor: state.vendor, driver: state.driver, farmer: state.farmer, tractor: state.tractor };

  const exportCsv = async () => {
    try { await downloadCsv("/export/bookings.csv", filters, "bookings.csv"); } catch (err) { toast(err.message, "error"); }
  };

  return (
    <>
      <PageHeader title="Bookings" crumbs={[{ label: "Operations" }, { label: "Bookings" }]} actions={<button type="button" className="btn-light" onClick={exportCsv}><i className="fa-solid fa-arrow-up-from-bracket text-[10px]" /> Export CSV</button>} />
      <Card>
        <Tabs
          value={state.status}
          onChange={(status) => update({ status })}
          tabs={[{ value: "", label: "All", count: query.data ? all : undefined }, ...(meta.data?.bookingStatuses || []).map((s) => ({ value: s, label: titleCase(meta.data.bookingLabels[s]), count: query.data ? counts[s] || 0 : undefined }))]}
        />
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Tractor, farm location or notes" />
          <label className="text-[11px] text-gray-400">From<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.from} onChange={(e) => update({ from: e.target.value })} /></label>
          <label className="text-[11px] text-gray-400">To<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.to} onChange={(e) => update({ to: e.target.value })} /></label>
          {(personFilter || state.from || state.to) && <button type="button" className="btn-light" onClick={() => update({ vendor: "", driver: "", farmer: "", tractor: "", from: "", to: "" })}><i className="fa-solid fa-xmark" /> Clear filters{personFilter ? ` (${personFilter})` : ""}</button>}
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <BookingsTable rows={query.data.items} empty={<EmptyState icon="fa-regular fa-calendar" title="No bookings match" text="Try another status, date range or search." />} />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </>
  );
}
