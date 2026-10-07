import React, { lazy, Suspense, useState, useEffect } from "react";
import GuestApp from "./guest/GuestApp";

const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function AppRouter() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#07080b] text-neutral-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <nav className="h-12 px-6 bg-[#0e1017] border-b border-white/10 flex items-center justify-between text-xs font-mono z-50">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-sm">Éclat & Ember System</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigateTo("/guest")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              currentPath === "/guest" || currentPath === "/"
                ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                : "bg-white/5 text-neutral-400 hover:text-white"
            }`}
          >
            /guest (Customer Experience)
          </button>
          <button
            onClick={() => navigateTo("/admin")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              currentPath === "/admin"
                ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                : "bg-white/5 text-neutral-400 hover:text-white"
            }`}
          >
            /admin (Operations Hub & 3D Simulation)
          </button>
        </div>
      </nav>

      {/* Main View */}
      <div className="flex-1 w-full h-[calc(100vh-3rem)] relative overflow-hidden bg-[#07080b]">
        {currentPath === "/admin" ? (
          <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-amber-300">Loading operations floor…</div>}>
            <AdminApp />
          </Suspense>
        ) : <GuestApp />}
      </div>
    </div>
  );
}
