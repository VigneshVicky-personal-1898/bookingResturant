import type { CameraPreset, FollowTarget } from "./RestaurantScene";

interface AdminHudProps {
  occupiedTables: number;
  tableCount: number;
  activeOrders: number;
  kitchenOrders: number;
  staffCount: number;
  revenue: number;
  cameraPreset: CameraPreset;
  followTarget: FollowTarget;
  audioEnabled: boolean;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onFollowTargetChange: (target: FollowTarget) => void;
  onToggleAudio: () => void;
}

const cameraViews: { id: CameraPreset; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "dining", label: "Dining" },
  { id: "kitchen", label: "Kitchen" },
  { id: "entrance", label: "Foyer" },
];

const statClass = "glass-panel flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-mono-code";

export default function AdminHud({
  occupiedTables, tableCount, activeOrders, kitchenOrders, staffCount, revenue,
  cameraPreset, followTarget, audioEnabled, onCameraPresetChange, onFollowTargetChange, onToggleAudio,
}: AdminHudProps) {
  return (
    <header className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
      <div className="glass-panel pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-300 text-black shadow-lg shadow-amber-500/20">
          <i className="fa-solid fa-utensils text-sm" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xs font-bold tracking-wider text-amber-300 sm:text-sm">ÉCLAT &amp; EMBER</h1>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400">LIVE</span>
          </div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] text-neutral-400 sm:text-[10px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            RESTAURANT OPERATIONS
          </p>
        </div>
      </div>

      <div className="pointer-events-auto hidden items-center gap-2 font-mono-code 2xl:flex">
        <div className={statClass}><span className="text-neutral-400">Tables:</span><strong className="text-amber-400">{occupiedTables}/{tableCount} Occ</strong></div>
        <div className={statClass}><span className="text-neutral-400">Orders:</span><strong className="text-sky-400">{activeOrders} Active</strong></div>
        <div className={statClass}><span className="text-neutral-400">Kitchen:</span><strong className="text-rose-400">{kitchenOrders} Queued</strong></div>
        <div className={statClass}><span className="text-neutral-400">Staff:</span><strong className="text-indigo-300">{staffCount} Active</strong></div>
        <div className="glass-panel-gold flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[11px] text-amber-300">
          <i className="fa-solid fa-coins" aria-hidden="true" /><span>Revenue:</span><strong className="text-white">₹{revenue.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <div className="glass-panel pointer-events-auto flex max-w-full items-center gap-1 rounded-2xl p-1.5">
        <div className="hidden items-center gap-1 rounded-xl bg-black/40 p-1 sm:flex">
          {cameraViews.map(view => (
            <button
              key={view.id}
              type="button"
              aria-pressed={cameraPreset === view.id}
              onClick={() => onCameraPresetChange(view.id)}
              className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition sm:text-xs ${cameraPreset === view.id ? "bg-amber-400 text-black" : "text-neutral-400 hover:text-white"}`}
            >{view.label}</button>
          ))}
        </div>
        <label className="sr-only" htmlFor="mobile-camera-preset">Camera view</label>
        <select
          id="mobile-camera-preset"
          value={cameraPreset}
          onChange={event => onCameraPresetChange(event.target.value as CameraPreset)}
          className="max-w-24 rounded-xl border border-white/10 bg-black/50 px-1.5 py-1.5 text-[10px] text-neutral-300 outline-none focus:border-amber-400 sm:hidden"
        >
          {cameraViews.map(view => <option key={view.id} value={view.id}>{view.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="restaurant-follow-target">Follow staff or guest</label>
        <select
          id="restaurant-follow-target"
          value={followTarget}
          onChange={event => onFollowTargetChange(event.target.value as FollowTarget)}
          className="max-w-36 rounded-xl border border-white/10 bg-black/50 px-2 py-1.5 text-[10px] text-neutral-300 outline-none focus:border-amber-400 sm:max-w-48 sm:text-xs"
        >
          <option value="none">Free Camera</option>
          <option value="waiter-1">Follow Vikram</option>
          <option value="waiter-2">Follow Priya</option>
          <option value="chef-1">Follow Chef Marcus</option>
          <option value="customer-active">Follow Guest</option>
        </select>
        <button
          type="button"
          onClick={onToggleAudio}
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? "Mute restaurant ambience" : "Play restaurant ambience"}
          title="Toggle restaurant ambience"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-neutral-300 transition hover:bg-white/10"
        >
          <i className={`fa-solid ${audioEnabled ? "fa-volume-high text-amber-300" : "fa-volume-xmark"} text-xs`} aria-hidden="true" />
        </button>
        <button type="button" disabled title="Walk-in booking is not available through the current server API" className="hidden cursor-not-allowed items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-500 opacity-70 md:flex">
          <i className="fa-solid fa-user-plus" aria-hidden="true" /> Seat Walk-in
        </button>
      </div>
    </header>
  );
}
