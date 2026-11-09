import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./lib/auth";
import Layout, { NAV } from "./components/Layout";
import { EmptyState, Spinner } from "./components/ui";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./pages/Users"));
const UserDetail = lazy(() => import("./pages/UserDetail"));
const Tractors = lazy(() => import("./pages/Tractors"));
const TractorDetail = lazy(() => import("./pages/TractorDetail"));
const Bookings = lazy(() => import("./pages/Bookings"));
const BookingDetail = lazy(() => import("./pages/BookingDetail"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Payments = lazy(() => import("./pages/Payments"));
const Agri = lazy(() => import("./pages/Agri"));
const AgriDetail = lazy(() => import("./pages/AgriDetail"));
const Plans = lazy(() => import("./pages/Plans"));
const Broadcasts = lazy(() => import("./pages/Broadcasts"));
const ContentPages = lazy(() => import("./pages/ContentPages"));
const Settings = lazy(() => import("./pages/Settings"));
const Admins = lazy(() => import("./pages/Admins"));
const Audit = lazy(() => import("./pages/Audit"));
const Account = lazy(() => import("./pages/Account"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

// Public pages: open to everyone (e.g. the Play Store privacy policy link), no sign-in.
const PUBLIC_PAGES = { "/privacy-policy": PrivacyPolicy };
const PUBLIC_ALIASES = { "/privecy-policy": "/privacy-policy", "/privacy": "/privacy-policy" };

function Guard({ power, children }) {
  const { can } = useAuth();
  if (power && !can(power)) return <EmptyState icon="fa-solid fa-lock" title="You don't have access to this section" text="Ask the super admin to give you this power." />;
  return children;
}

// Admins without the dashboard power land on their first section instead.
function Home() {
  const { can } = useAuth();
  if (can("dashboard")) return <Dashboard />;
  const first = NAV.flatMap((s) => s.items).find((item) => item.power && item.to !== "/" && can(item.power));
  return <Navigate to={first?.to || "/account"} replace />;
}

const ROUTES = [
  ["users", "users", Users], ["users/:id", "users", UserDetail],
  ["tractors", "tractors", Tractors], ["tractors/:id", "tractors", TractorDetail],
  ["bookings", "bookings", Bookings], ["bookings/:id", "bookings", BookingDetail],
  ["products", "products", Products], ["products/:id", "products", ProductDetail],
  ["orders", "orders", Orders], ["orders/:id", "orders", OrderDetail],
  ["payments", "payments", Payments],
  ["agri", "agri", Agri], ["agri/:id", "agri", AgriDetail],
  ["plans", "subscriptions", Plans],
  ["notifications", "notifications", Broadcasts],
  ["pages", "content", ContentPages],
  ["settings", "settings", Settings],
  ["admins", "admins", Admins],
  ["audit", "audit", Audit],
  ["account", null, Account],
];

export default function App() {
  const { admin, loading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries();
    window.addEventListener("admin:refresh", refresh);
    return () => window.removeEventListener("admin:refresh", refresh);
  }, [queryClient]);

  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (PUBLIC_ALIASES[path]) return <Navigate to={PUBLIC_ALIASES[path]} replace />;
  const PublicPage = PUBLIC_PAGES[path];
  if (PublicPage) return <Suspense fallback={<div className="h-screen flex items-center justify-center"><Spinner /></div>}><PublicPage /></Suspense>;

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner label="Opening the admin panel…" /></div>;
  if (!admin) {
    if (location.pathname !== "/login") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    return <Login />;
  }
  return (
    <Routes>
      <Route path="/login" element={<Navigate to={location.state?.from || "/"} replace />} />
      <Route element={<Layout />}>
        <Route index element={<Suspense fallback={<Spinner />}><Home /></Suspense>} />
        {ROUTES.map(([path, power, Page]) => (
          <Route key={path} path={path} element={<Guard power={power}><Suspense fallback={<Spinner />}><Page /></Suspense></Guard>} />
        ))}
        <Route path="*" element={<EmptyState icon="fa-regular fa-compass" title="Page not found" text="Use the menu to find what you're looking for." />} />
      </Route>
    </Routes>
  );
}
