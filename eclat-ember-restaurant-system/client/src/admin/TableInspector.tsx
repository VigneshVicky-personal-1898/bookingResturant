import type { OrderRecord, TableRecord } from "../common/types";

interface TableInspectorProps {
  tables: TableRecord[];
  table: TableRecord | null;
  order: OrderRecord | null;
  hiddenBehindKitchen?: boolean;
  onSelectTable: (tableId: string) => void;
}

export default function TableInspector({ tables, table, order, hiddenBehindKitchen = false, onSelectTable }: TableInspectorProps) {
  return (
    <aside className={`glass-panel pointer-events-auto absolute right-3 top-24 z-20 max-h-[calc(100%_-_8rem)] w-[min(19rem,calc(100vw_-_1.5rem))] flex-col overflow-y-auto rounded-3xl p-4 shadow-2xl sm:right-4 ${hiddenBehindKitchen ? "hidden md:flex" : "flex"}`} aria-label="Table live inspector">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-magnifying-glass text-xs text-sky-400" aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Table Inspector</h2>
        </div>
        <label className="sr-only" htmlFor="inspected-table">Choose table to inspect</label>
        <select id="inspected-table" value={table?.id ?? ""} onChange={event => event.target.value && onSelectTable(event.target.value)} className="max-w-36 rounded-lg border border-white/10 bg-black/50 px-2 py-1 font-mono text-[9px] text-amber-300 outline-none focus:border-amber-400">
          <option value="">Select table</option>
          {tables.map(item => <option key={item.id} value={item.id}>{item.id} · {item.state}</option>)}
        </select>
      </div>

      {!table ? (
        <p className="py-8 text-center text-xs text-neutral-500">Select a table in the 3D floor to inspect live details.</p>
      ) : (
        <div className="mt-3.5 space-y-3">
          <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-[11px]">
            <div className="flex justify-between"><span className="text-neutral-400">Table</span><span className="font-mono text-white">{table.id}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Phase</span><span className="font-bold text-amber-300">{table.state.replaceAll("_", " ")}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Capacity</span><span className="text-white">{table.capacity} Guests</span></div>
            {order && <div className="flex justify-between"><span className="text-neutral-400">Order</span><span className="font-mono text-sky-300">#{order.orderId}</span></div>}
          </div>

          {order ? (
            <div className="space-y-2.5 rounded-2xl border border-amber-500/20 bg-black/40 p-3.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-300"><span>Folio Statement</span><span className="text-neutral-400">{order.status.replaceAll("_", " ")}</span></div>
              <div className="space-y-1.5 text-[11px] text-neutral-300">
                {order.items.map((item, index) => <div key={`${item.menuItem.id}-${index}`} className="flex justify-between gap-3"><span>{item.quantity}× {item.menuItem.name}</span><span>₹{(item.quantity * item.menuItem.price).toLocaleString("en-IN")}</span></div>)}
                <div className="flex justify-between text-neutral-500"><span>Tax</span><span>₹{order.tax.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-neutral-500"><span>Service Charge</span><span>₹{order.serviceCharge.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-2 text-xs font-bold text-white"><span>Net Amount</span><span className="text-emerald-400">₹{order.total.toLocaleString("en-IN")}</span></div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.02] p-3 text-center text-xs italic text-neutral-500">No order is linked to this table yet.</div>
          )}
        </div>
      )}
    </aside>
  );
}
