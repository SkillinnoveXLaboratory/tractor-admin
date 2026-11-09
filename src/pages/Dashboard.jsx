import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { useApi } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/api";
import { ago, money, moneyShort, num, titleCase } from "../lib/format";
import { EmptyState, ErrorState, MiniStat, PageHeader, Spinner, StatCard, Thumb, useToast } from "../components/ui";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ROLE_COLORS = { farmer: "#2563eb", vendor: "#f59e0b", driver: "#10b981", shopkeeper: "#8b5cf6" };
const RANGES = [["today", "Today"], ["month", "Monthly"], ["year", "Annual"]];
const tz = new Date().getTimezoneOffset();

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center space-x-4 text-xs font-medium text-gray-500 pt-2 border-t border-gray-100">
      <div className="flex items-center space-x-1.5"><i className="fa-regular fa-calendar text-gray-400" /><span>{now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
      <div className="flex items-center space-x-1.5"><i className="fa-regular fa-clock text-gray-400" /><span>{now.toLocaleTimeString("en-US")}</span></div>
    </div>
  );
}

function greetingWord() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning," : hour < 17 ? "Good day," : "Good evening,";
}

// Template "Weekly Performance Insights": each day is a track with bookings (blue) and orders (amber) as dots.
function WeeklyRange({ weekly }) {
  const max = Math.max(4, ...weekly.flatMap((d) => [d.bookings, d.orders]));
  const step = Math.ceil(max / 6);
  const top = step * 6;
  const pct = (value) => `${(value / top) * 100}%`;
  return (
    <>
      <div className="space-y-4 py-2">
        {weekly.map((day) => {
          const low = Math.min(day.bookings, day.orders);
          const high = Math.max(day.bookings, day.orders);
          return (
            <div key={day.label} className="grid grid-cols-12 items-center text-xs" title={`${day.label}: ${day.bookings} bookings, ${day.orders} orders`}>
              <span className="col-span-2 sm:col-span-1 font-medium text-gray-400">{day.label}</span>
              <div className="col-span-10 sm:col-span-11 relative px-1">
                <div className="range-bar w-full">
                  <div className="range-fill" style={{ left: pct(low), width: pct(high - low) }} />
                  <div className="range-dot" style={{ left: pct(day.bookings) }} />
                  <div className="range-dot alt" style={{ left: pct(day.orders) }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-12 pt-3 border-t border-dashed border-gray-200 text-xs text-gray-400 font-medium">
        <div className="col-span-2 sm:col-span-1" />
        <div className="col-span-10 sm:col-span-11 flex justify-between px-1">
          {Array.from({ length: 7 }, (_, i) => <span key={i}>{i * step}</span>)}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { can } = useAuth();
  const toast = useToast();
  const [range, setRange] = useState("month");
  const query = useApi("/dashboard", { range, tz }, { keepPrevious: true });
  const d = query.data;

  if (query.isPending) return <><PageHeader title="Dashboard" crumbs={[{ label: "Dashboard" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="Dashboard" crumbs={[{ label: "Dashboard" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;

  const roles = Object.keys(d.usersByRole);
  const totalUsers = roles.reduce((sum, role) => sum + d.usersByRole[role], 0);
  const todo = [
    ["Products to approve", d.todo.pendingProducts, "/products?status=pending", "products"],
    ["Bookings pending", d.todo.pendingBookings, "/bookings?status=pending", "bookings"],
    ["Need a driver", d.todo.unassignedBookings, "/bookings?status=accepted", "bookings"],
    ["Agri cases open", d.todo.openAgri, "/agri", "agri"],
    ["Payments to verify", d.todo.paymentsAwaiting, "/orders?payment=due", "orders"],
  ].filter(([, , , power]) => can(power));

  const exportOrders = async () => {
    try { await downloadCsv("/export/orders.csv", {}, "orders.csv"); } catch (err) { toast(err.message, "error"); }
  };

  return (
    <>
      <PageHeader title="Dashboard" crumbs={[{ label: "Dashboard" }, { label: "Overview" }]} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="card-label">{greetingWord()}</span>
              <h2 className="text-xl font-bold text-gray-800 mt-0.5">{d.greeting.name}!</h2>
            </div>
            <div className="my-4 flex items-center justify-between gap-3">
              <div className="space-y-1 text-xs min-w-0">
                {todo.slice(0, 3).map(([label, count, to]) => (
                  <Link key={label} to={to} className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
                    <span className={`font-bold ${count ? "text-blue-600" : "text-gray-300"}`}>{count}</span><span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
              <div className="relative w-28 h-20 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-tractor text-indigo-500 text-4xl" />
                <i className="fa-solid fa-user-check text-indigo-700 text-lg absolute -right-1 -bottom-1 bg-white p-1 rounded-full shadow" />
              </div>
            </div>
            <Clock />
          </div>
          <StatCard label="Orders" value={num(d.stats.orders.value)} icon="fa-solid fa-cart-shopping" change={d.stats.orders.change} hint="Since last month" to={can("orders") ? "/orders" : undefined} />
          <StatCard label="Revenue" value={moneyShort(d.stats.revenue.value)} icon="fa-solid fa-piggy-bank" change={d.stats.revenue.change} hint="Since last month" to={can("payments") ? "/payments" : undefined} />
          <StatCard label="Bookings" value={num(d.stats.bookings.value)} icon="fa-solid fa-tractor" change={d.stats.bookings.change} hint="Since last month" to={can("bookings") ? "/bookings" : undefined} />
        </div>

        <div className="col-span-12 md:col-span-6 xl:col-span-5 card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Users by Role</h2>
            <button type="button" onClick={() => query.refetch()} className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex items-center space-x-1.5 transition-colors">
              <i className={`fa-solid fa-rotate text-[10px] ${query.isFetching ? "fa-spin" : ""}`} /><span>Refresh</span>
            </button>
          </div>
          <div className="relative flex items-center justify-center my-4 h-48">
            {totalUsers ? (
              <Doughnut
                data={{ labels: roles.map(titleCase), datasets: [{ data: roles.map((r) => d.usersByRole[r]), backgroundColor: roles.map((r) => ROLE_COLORS[r] || "#94a3b8"), borderWidth: 0, hoverOffset: 4 }] }}
                options={{ cutout: "78%", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } }}
              />
            ) : <EmptyState icon="fa-solid fa-users" title="No users yet" />}
            {totalUsers > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-400 font-medium">Total</span>
                <span className="text-xl font-bold text-gray-800">{num(totalUsers)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
            {roles.map((r) => <span key={r} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[r] }} />{titleCase(r)} <b className="text-gray-700">{d.usersByRole[r]}</b></span>)}
          </div>
          <div className="flex justify-center border-t border-dashed border-gray-200 pt-3">
            {d.stats.users.suspended ? (
              <Link to="/users?status=suspended" className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-xs font-bold tracking-wide flex items-center space-x-1"><i className="fa-solid fa-ban text-[10px]" /><span>{d.stats.users.suspended} SUSPENDED</span></Link>
            ) : (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold tracking-wide flex items-center space-x-1"><i className="fa-solid fa-star text-[10px]" /><span>{d.stats.users.newThisMonth} NEW THIS MONTH</span></span>
            )}
          </div>
        </div>

        <div className="col-span-12 card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="card-title">Weekly Performance Insights</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />Bookings</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />Orders</span>
            </div>
          </div>
          <WeeklyRange weekly={d.weekly} />
        </div>

        <div className="col-span-12 xl:col-span-7 card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <h2 className="card-title">Sales Report</h2>
                <span className="text-xs text-gray-400 font-normal">({num(d.stats.orders.value)} orders this month)</span>
              </div>
              <div className="flex items-center space-x-6 text-xs font-semibold text-gray-500 mt-2 sm:mt-0">
                {RANGES.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setRange(value)} className={range === value ? "text-blue-600 border-b-2 border-blue-600 pb-1.5 font-bold" : "hover:text-blue-600 pb-1.5"}>{label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
              <MiniStat label="Revenue" value={money(d.revenue.total)} icon="fa-regular fa-square-check" tone="text-emerald-500" />
              <MiniStat label="Marketplace" value={money(d.revenue.marketplace.reduce((a, b) => a + b, 0))} icon="fa-solid fa-bag-shopping" tone="text-teal-500" />
              <MiniStat label="Tractor services" value={money(d.revenue.services.reduce((a, b) => a + b, 0))} icon="fa-solid fa-tractor" tone="text-blue-500" />
              <MiniStat label="Premium" value={money((d.revenue.subscriptions || []).reduce((a, b) => a + b, 0))} icon="fa-solid fa-crown" tone="text-amber-500" />
            </div>
            <div className="h-56 relative mt-2">
              <Line
                data={{
                  labels: d.revenue.labels,
                  datasets: [
                    { label: "Marketplace", data: d.revenue.marketplace, borderColor: "#2563eb", borderWidth: 2, fill: true, backgroundColor: "rgba(37, 99, 235, 0.05)", tension: 0.4, pointRadius: 2, pointBackgroundColor: "#2563eb" },
                    { label: "Tractor services", data: d.revenue.services, borderColor: "#f59e0b", borderWidth: 2, fill: false, tension: 0.4, pointRadius: 2, pointBackgroundColor: "#f59e0b" },
                    { label: "Premium", data: d.revenue.subscriptions || [], borderColor: "#8b5cf6", borderWidth: 2, fill: false, tension: 0.4, pointRadius: 2, pointBackgroundColor: "#8b5cf6" },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 8, usePointStyle: true, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money(c.parsed.y)}` } } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#94a3b8", maxRotation: 0, autoSkipPadding: 8 } },
                    y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 }, color: "#94a3b8", callback: (v) => moneyShort(v) } },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-5 card flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h2 className="card-title">Top Selling Products</h2>
            <div className="flex items-center space-x-2">
              {can("orders") && <button type="button" onClick={exportOrders} className="px-2.5 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded flex items-center space-x-1"><i className="fa-solid fa-arrow-up-from-bracket text-[10px]" /><span>Export</span></button>}
              {can("products") && <Link to="/products" className="px-2.5 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded flex items-center space-x-1"><i className="fa-solid fa-list text-[10px]" /><span>All</span></Link>}
            </div>
          </div>
          {d.topProducts.length ? (
            <div className="divide-y divide-gray-100">
              {d.topProducts.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <Thumb src={p.image} />
                    <div className="min-w-0">
                      {can("products") ? <Link to={`/products/${p.id}`} className="text-xs font-bold text-gray-800 hover:text-blue-600 truncate block">{p.name}</Link> : <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>}
                      <p className="text-[11px] text-gray-400">{p.orders} order{p.orders === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-right flex-shrink-0">
                    <div><p className="text-xs font-bold text-gray-800">{num(p.quantity)}</p><p className="text-[10px] text-gray-400">Qty ({p.unit})</p></div>
                    <div><p className="text-xs font-bold text-gray-800">{money(p.revenue)}</p><p className="text-[10px] text-gray-400">Amount</p></div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="fa-solid fa-bag-shopping" title="No sales yet" text="Products appear here once farmers order them." />}
        </div>

        <div className="col-span-12 lg:col-span-5 card">
          <h2 className="card-title pb-3 mb-1 border-b border-gray-100">Needs Attention</h2>
          <div className="divide-y divide-gray-100">
            {todo.map(([label, count, to]) => (
              <Link key={label} to={to} className="flex items-center justify-between py-3 text-xs hover:text-blue-600">
                <span className="text-gray-600">{label}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${count ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-300"}`}>{count}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 card">
          <h2 className="card-title pb-3 mb-1 border-b border-gray-100">Recent Activity</h2>
          {d.activity.length ? (
            <div className="divide-y divide-gray-100">
              {d.activity.map((a) => {
                const icon = { user: "fa-user-plus text-emerald-500 bg-emerald-50", booking: "fa-tractor text-blue-500 bg-blue-50", order: "fa-cart-shopping text-amber-500 bg-amber-50" }[a.kind];
                const to = { user: `/users/${a.id}`, booking: `/bookings/${a.id}`, order: `/orders/${a.id}` }[a.kind];
                const power = { user: "users", booking: "bookings", order: "orders" }[a.kind];
                const body = (
                  <>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${icon.split(" ").slice(1).join(" ")}`}><i className={`fa-solid ${icon.split(" ")[0]} text-xs`} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 truncate">{a.title}</p>
                      <p className="text-[11px] text-gray-400 truncate">{titleCase(a.detail)}{a.amount ? ` · ${money(a.amount)}` : ""}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{ago(a.at)}</span>
                  </>
                );
                return can(power)
                  ? <Link key={`${a.kind}-${a.id}`} to={to} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded">{body}</Link>
                  : <div key={`${a.kind}-${a.id}`} className="flex items-center gap-3 py-2.5">{body}</div>;
              })}
            </div>
          ) : <EmptyState icon="fa-regular fa-clock" title="No activity yet" />}
        </div>
      </div>
    </>
  );
}
