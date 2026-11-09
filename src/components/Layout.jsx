import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { Avatar, useToast } from "./ui";
import { titleCase } from "../lib/format";

// Sidebar sections, shown only for the powers the signed-in admin holds.
export const NAV = [
  { title: "Main", items: [{ to: "/", label: "Dashboard", icon: "fa-solid fa-gauge-high", power: "dashboard", end: true }] },
  {
    title: "Operations",
    items: [
      { to: "/users", label: "Users", icon: "fa-solid fa-users", power: "users" },
      { to: "/tractors", label: "Tractors", icon: "fa-solid fa-tractor", power: "tractors" },
      { to: "/bookings", label: "Bookings", icon: "fa-regular fa-calendar-check", power: "bookings", badge: "bookings" },
      { to: "/agri", label: "Agri Doctor", icon: "fa-solid fa-seedling", power: "agri", badge: "agri" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/products", label: "Products", icon: "fa-solid fa-bag-shopping", power: "products", badge: "products" },
      { to: "/orders", label: "Orders", icon: "fa-solid fa-cart-shopping", power: "orders" },
      { to: "/payments", label: "Payments", icon: "fa-solid fa-wallet", power: "payments", badge: "payments" },
    ],
  },
  {
    title: "Business",
    items: [
      { to: "/plans", label: "Subscriptions", icon: "fa-solid fa-crown", power: "subscriptions" },
      { to: "/notifications", label: "Notifications", icon: "fa-regular fa-bell", power: "notifications" },
      { to: "/pages", label: "Content pages", icon: "fa-regular fa-file-lines", power: "content" },
      { to: "/settings", label: "Settings", icon: "fa-solid fa-sliders", power: "settings" },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/admins", label: "Admins", icon: "fa-solid fa-user-shield", power: "admins" },
      { to: "/audit", label: "Audit log", icon: "fa-solid fa-clock-rotate-left", power: "audit" },
      { to: "/account", label: "My account", icon: "fa-solid fa-key" },
    ],
  },
];

const COLLAPSE_KEY = "tractor-admin-sidebar";

function readCollapsed() {
  try {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved !== null) return saved === "1";
  } catch { /* ignore */ }
  return window.innerWidth < 1280;
}

function Sidebar({ collapsed, onToggle, todo }) {
  const { can } = useAuth();
  const counts = Object.fromEntries((todo?.items || []).map((item) => [item.key, item.count]));
  counts.bookings = (counts.bookings || 0) + (counts.unassigned || 0);
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} w-64 bg-sidebar-bg text-[#98a6ad] flex flex-col flex-shrink-0 z-30 select-none`}>
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#2d303e]/40">
        <Link to="/" className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            <i className="fa-solid fa-tractor text-xs" />
          </div>
          <span className="sidebar-text text-white font-bold text-xl tracking-tight">TractorApp</span>
        </Link>
        {!collapsed && (
          <button type="button" onClick={onToggle} className="text-[#98a6ad] hover:text-white focus:outline-none p-1 rounded" aria-label="Collapse menu">
            <i className="fa-regular fa-circle-dot text-sm" />
          </button>
        )}
      </div>
      {collapsed && (
        <button type="button" onClick={onToggle} className="mx-auto mt-3 text-[#98a6ad] hover:text-white p-1 rounded" aria-label="Expand menu">
          <i className="fa-regular fa-circle-dot text-sm" />
        </button>
      )}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV.map((section) => {
          const items = section.items.filter((item) => !item.power || can(item.power));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="sidebar-header-title text-[11px] font-bold text-sidebar-title uppercase tracking-wider px-3 mb-2">{section.title}</p>
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => `sidebar-item flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isActive ? "text-white font-medium bg-sidebar-active" : "text-[#98a6ad] hover:text-white hover:bg-sidebar-hover"}`}
                  >
                    <div className="flex items-center space-x-3">
                      <i className={`${item.icon} text-sm w-5 text-center`} />
                      <span className="sidebar-text text-sm">{item.label}</span>
                    </div>
                    {item.badge && counts[item.badge] > 0 && <span className="sidebar-badge min-w-[20px] h-5 px-1.5 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center">{counts[item.badge]}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

function Header({ todo, onRefresh }) {
  const { admin, signOut, can } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menu, setMenu] = useState(null);
  const [query, setQuery] = useState("");
  const bellRef = useRef(null);
  const profileRef = useRef(null);
  useClickOutside(bellRef, () => setMenu((m) => (m === "bell" ? null : m)));
  useClickOutside(profileRef, () => setMenu((m) => (m === "profile" ? null : m)));

  const search = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(can("users") ? `/users?q=${encodeURIComponent(q)}` : can("products") ? `/products?q=${encodeURIComponent(q)}` : "/");
  };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };
  const logoutAll = async () => {
    try {
      await api("/auth/logout-all", { method: "POST" });
    } catch (err) {
      toast(err.message, "error");
    }
    signOut();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-20 gap-3">
      <form onSubmit={search} className="relative w-full max-w-[18rem]" role="search">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400"><i className="fa-solid fa-magnifying-glass text-sm" /></span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full py-1.5 pl-10 pr-4 text-sm bg-slate-50 text-gray-700 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white placeholder-gray-400" placeholder="Quick Search..." aria-label="Quick search" />
      </form>

      <div className="flex items-center space-x-1 md:space-x-3 text-gray-600 flex-shrink-0">
        <button type="button" onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors" title="Refresh data" aria-label="Refresh data"><i className="fa-solid fa-rotate text-base" /></button>
        <button type="button" onClick={fullscreen} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors hidden sm:block" title="Full screen" aria-label="Full screen"><i className="fa-solid fa-expand text-base" /></button>

        <div className="relative" ref={bellRef}>
          <button type="button" onClick={() => setMenu(menu === "bell" ? null : "bell")} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors relative" aria-label="Things to do">
            <i className="fa-regular fa-bell text-base" />
            {todo?.total > 0 && <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white">{todo.total > 99 ? "99+" : todo.total}</span>}
          </button>
          {menu === "bell" && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-40">
              <p className="px-4 pb-2 card-label border-b border-gray-100">Needs attention</p>
              {(todo?.items || []).map((item) => (
                <Link key={item.key} to={item.to} onClick={() => setMenu(null)} className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-50">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`font-bold ${item.count ? "text-blue-600" : "text-gray-300"}`}>{item.count}</span>
                </Link>
              ))}
              {!todo?.items?.length && <p className="px-4 py-3 text-xs text-gray-400">Nothing for your sections.</p>}
            </div>
          )}
        </div>

        <div className="relative pl-2 border-l border-gray-200" ref={profileRef}>
          <button type="button" onClick={() => setMenu(menu === "profile" ? null : "profile")} className="flex items-center space-x-3" aria-label="Account menu">
            <Avatar name={admin?.name} />
            <div className="hidden md:block text-left leading-tight">
              <p className="text-xs font-bold text-gray-800">{admin?.name}</p>
              <p className="text-[11px] text-gray-400">{titleCase(admin?.role)}</p>
            </div>
            <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 hidden md:block" />
          </button>
          {menu === "profile" && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-40 text-xs">
              <div className="px-4 pb-2 border-b border-gray-100">
                <p className="font-bold text-gray-800 truncate">{admin?.name}</p>
                <p className="text-gray-400 truncate">{admin?.email}</p>
              </div>
              <Link to="/account" onClick={() => setMenu(null)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-gray-600"><i className="fa-solid fa-key w-4" /> Change password</Link>
              <button type="button" onClick={logoutAll} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-gray-600"><i className="fa-solid fa-laptop w-4" /> Sign out everywhere</button>
              <button type="button" onClick={signOut} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-rose-500"><i className="fa-solid fa-right-from-bracket w-4" /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const location = useLocation();
  const main = useRef(null);
  const todo = useApi("/todo", null, { refetchInterval: 60000 });
  const toggle = () => {
    setCollapsed((value) => {
      try { localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1"); } catch { /* ignore */ }
      return !value;
    });
  };
  useEffect(() => { main.current?.scrollTo(0, 0); }, [location.pathname]);
  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f5f9]">
      <Sidebar collapsed={collapsed} onToggle={toggle} todo={todo.data} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header todo={todo.data} onRefresh={() => window.dispatchEvent(new Event("admin:refresh"))} />
        <main ref={main} className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
