import type { OrderRecord } from "../common/types";

interface KitchenPanelProps {
  orders: OrderRecord[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function KitchenPanel({ orders, mobileOpen, onCloseMobile }: KitchenPanelProps) {
  const activeOrders = orders.filter(order => order.status !== "COMPLETED" && order.status !== "DELIVERED");

  return (
    <aside className={`glass-panel pointer-events-auto absolute bottom-20 left-3 top-24 z-20 flex w-[min(20rem,calc(100vw_-_1.5rem))] flex-col overflow-hidden rounded-3xl transition-transform duration-300 md:bottom-6 md:left-4 md:top-24 ${mobileOpen ? "translate-x-0" : "-translate-x-[115%] md:translate-x-0"}`} aria-label="Kitchen display system">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-kitchen-set text-sm text-amber-400" aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Kitchen Display</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-300">{activeOrders.length} Active</span>
          <button type="button" onClick={onCloseMobile} className="rounded-lg px-2 py-1 text-neutral-400 hover:text-white md:hidden" aria-label="Close kitchen display">×</button>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {activeOrders.length === 0 ? (
          <div className="py-10 text-center text-[11px] italic text-neutral-500">No pending culinary orders. Kitchen stations ready...</div>
        ) : activeOrders.map(order => (
          <article key={order.orderId} className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-2 font-mono text-xs">
              <span className="font-bold text-amber-300">#{order.orderId} · {order.tableId}</span>
              <span className={`rounded px-2 py-0.5 text-[9px] ${order.status === "FOOD_READY" || order.status === "DELIVERED" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>{order.status.replaceAll("_", " ")}</span>
            </div>
            <div className="space-y-1 text-xs text-neutral-300">
              {order.items.map((item, index) => <div key={`${item.menuItem.id}-${index}`} className="flex justify-between gap-3"><span>{item.quantity}× {item.menuItem.name}</span><span className="text-neutral-500">₹{(item.quantity * item.menuItem.price).toLocaleString("en-IN")}</span></div>)}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5" aria-label={`Preparation ${order.prepProgress}%`}>
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all" style={{ width: `${Math.max(0, Math.min(order.prepProgress, 100))}%` }} />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-neutral-500"><span>Kitchen preparation</span><span>{order.prepProgress}%</span></div>
          </article>
        ))}
      </div>

      <div className="space-y-2 rounded-b-3xl border-t border-white/10 bg-black/40 p-3.5 font-mono text-[10px]">
        <div className="flex justify-between uppercase text-neutral-500"><span>Kitchen Stations</span><span>Live</span></div>
        <div className="flex justify-between"><span className="text-neutral-300">🔥 Sauté &amp; Grill</span><span className="font-bold text-emerald-400">Active</span></div>
        <div className="flex justify-between"><span className="text-neutral-300">🔪 Prep Station</span><span className="font-bold text-sky-400">Ready</span></div>
        <div className="flex justify-between"><span className="text-neutral-300">🍽 Pass Counter</span><span className="font-bold text-amber-400">{activeOrders.some(order => order.status === "FOOD_READY") ? "Orders Ready" : "Clear"}</span></div>
      </div>
    </aside>
  );
}
