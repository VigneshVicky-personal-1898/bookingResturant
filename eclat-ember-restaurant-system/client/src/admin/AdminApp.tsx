import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderRecord, ParkingSlot, TableRecord, WebSocketPayload } from "../common/types";
import AdminHud from "./AdminHud";
import KitchenPanel from "./KitchenPanel";
import RestaurantScene, { type CameraPreset, type FollowTarget } from "./RestaurantScene";
import TableInspector from "./TableInspector";

type ConnectionState = "connecting" | "connected" | "disconnected";

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function upsertOrder(orders: OrderRecord[], order: OrderRecord) {
  const index = orders.findIndex(existing => existing.orderId === order.orderId);
  if (index === -1) return [...orders, order];
  return orders.map(existing => existing.orderId === order.orderId ? order : existing);
}

export default function AdminApp() {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [parking, setParking] = useState<ParkingSlot[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("overview");
  const [followTarget, setFollowTarget] = useState<FollowTarget>("none");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [mobileKdsOpen, setMobileKdsOpen] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<OscillatorNode[]>([]);
  const audioGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (selectedTableId && tables.length > 0 && !tables.some(table => table.id === selectedTableId)) {
      setSelectedTableId(null);
    }
  }, [tables, selectedTableId]);

  useEffect(() => {
    let socket: WebSocket;
    try {
      socket = new WebSocket("ws://localhost:4000");
    } catch {
      setConnection("disconnected");
      return;
    }

    socket.onopen = () => setConnection("connected");
    socket.onerror = () => setConnection("disconnected");
    socket.onclose = () => setConnection("disconnected");
    socket.onmessage = event => {
      let payload: WebSocketPayload;
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!isRecord(parsed) || typeof parsed.type !== "string") return;
        payload = parsed as WebSocketPayload;
      } catch {
        return;
      }

      if (payload.type === "INITIAL_STATE" && isRecord(payload.data)) {
        if (Array.isArray(payload.data.tables)) setTables(payload.data.tables as TableRecord[]);
        if (Array.isArray(payload.data.orders)) setOrders(payload.data.orders as OrderRecord[]);
        if (Array.isArray(payload.data.parking)) setParking(payload.data.parking as ParkingSlot[]);
      }
      if (payload.type === "ORDER_PLACED" && isRecord(payload.data) && typeof payload.data.orderId === "string") {
        setOrders(previous => upsertOrder(previous, payload.data as OrderRecord));
      }
      if (payload.type === "ORDER_STATUS_UPDATED" && isRecord(payload.data) && typeof payload.data.orderId === "string") {
        setOrders(previous => upsertOrder(previous, payload.data as OrderRecord));
      }
      if (payload.type === "TABLE_STATE_CHANGED" && isRecord(payload.data) && typeof payload.data.tableId === "string" && typeof payload.data.state === "string") {
        const { tableId, state } = payload.data;
        setTables(previous => previous.map(table => table.id === tableId ? { ...table, state: state as TableRecord["state"] } : table));
      }
      if (payload.type === "PARKING_UPDATED" && Array.isArray(payload.data)) {
        setParking(payload.data as ParkingSlot[]);
      }
    };

    return () => {
      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.onmessage = null;
      socket.close();
      audioNodesRef.current.forEach(node => { try { node.stop(); } catch { /* already stopped */ } });
      audioNodesRef.current = [];
      audioGainRef.current?.disconnect();
      audioGainRef.current = null;
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const selectedTable = useMemo(
    () => tables.find(table => table.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  );
  const selectedOrder = useMemo(() => {
    if (!selectedTable) return null;
    return [...orders].reverse().find(order => order.tableId === selectedTable.id) ?? null;
  }, [orders, selectedTable]);

  const activeOrders = useMemo(() => orders.filter(order => order.status !== "COMPLETED"), [orders]);
  const kitchenOrders = useMemo(
    () => orders.filter(order => ["ORDER_PLACED", "KITCHEN_QUEUED", "PREPARING", "FOOD_READY"].includes(order.status)).length,
    [orders],
  );
  const completedRevenue = useMemo(
    () => orders.filter(order => order.status === "COMPLETED").reduce((sum, order) => sum + order.total, 0),
    [orders],
  );

  const toggleAudio = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioNodesRef.current.forEach(node => { try { node.stop(); } catch { /* already stopped */ } });
      audioNodesRef.current = [];
      audioGainRef.current?.disconnect();
      audioGainRef.current = null;
      void audioContextRef.current.close();
      audioContextRef.current = null;
      setAudioEnabled(false);
      return;
    }

    try {
      const context = new window.AudioContext();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.018, context.currentTime);
      gain.connect(context.destination);
      const oscillators = [130.81, 164.81, 196, 246.94].map(frequency => {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
      audioContextRef.current = context;
      audioGainRef.current = gain;
      audioNodesRef.current = oscillators;
      setAudioEnabled(true);
    } catch {
      setAudioEnabled(false);
    }
  }, []);

  const connectionLabel = connection === "connected" ? "Live server connected" : connection === "connecting" ? "Connecting to restaurant server…" : "Server disconnected · showing last received data";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07080b] text-neutral-100">
      <RestaurantScene tables={tables} cameraPreset={cameraPreset} followTarget={followTarget} onSelectTable={setSelectedTableId} onSceneError={message => setSceneError(message ?? "")} />

      <div className={`absolute bottom-3 left-3 z-30 flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] backdrop-blur-md sm:bottom-4 sm:left-4 ${connection === "connected" ? "border-emerald-500/20 bg-[#07080b]/75 text-emerald-300" : "border-amber-500/25 bg-[#07080b]/80 text-amber-200"}`} role="status">
        <span className={`h-1.5 w-1.5 rounded-full ${connection === "connected" ? "bg-emerald-400" : "bg-amber-400"}`} />
        {connectionLabel}
      </div>

      <AdminHud
        occupiedTables={tables.filter(table => table.state !== "AVAILABLE").length}
        tableCount={tables.length}
        activeOrders={activeOrders.length}
        kitchenOrders={kitchenOrders}
        staffCount={3}
        revenue={completedRevenue}
        cameraPreset={cameraPreset}
        followTarget={followTarget}
        audioEnabled={audioEnabled}
        onCameraPresetChange={preset => { setCameraPreset(preset); setFollowTarget("none"); }}
        onFollowTargetChange={setFollowTarget}
        onToggleAudio={toggleAudio}
      />

      <KitchenPanel orders={orders} mobileOpen={mobileKdsOpen} onCloseMobile={() => setMobileKdsOpen(false)} />
      <TableInspector tables={tables} table={selectedTable} order={selectedOrder} hiddenBehindKitchen={mobileKdsOpen} onSelectTable={setSelectedTableId} />

      <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden max-w-[calc(100%_-_2rem)] items-center gap-2 rounded-2xl border border-white/10 bg-[#0b0d13]/80 px-3 py-2 font-mono text-[10px] text-neutral-400 backdrop-blur-md md:flex md:bottom-4 md:right-4">
        <i className="fa-solid fa-hand-pointer text-amber-400" aria-hidden="true" />
        <span>Click a table to inspect its live status</span>
        <span className="border-l border-white/10 pl-2 text-neutral-500">Valet {parking.filter(slot => slot.status === "OCCUPIED").length}/{parking.length}</span>
      </div>

      {sceneError && <div role="status" className="absolute bottom-14 left-3 z-30 max-w-sm rounded-xl border border-rose-500/30 bg-[#160e12]/90 px-3 py-2 text-xs text-rose-200 sm:left-4">{sceneError}</div>}

      {mobileKdsOpen && <button type="button" className="fixed inset-0 z-10 cursor-default bg-black/35 md:hidden" aria-label="Close kitchen display overlay" onClick={() => setMobileKdsOpen(false)} />}
      <div className="glass-panel pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-2xl p-1.5 md:hidden">
        <button type="button" onClick={() => setMobileKdsOpen(open => !open)} aria-expanded={mobileKdsOpen} className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200">
          <i className="fa-solid fa-fire text-amber-400" aria-hidden="true" /> Kitchen
        </button>
      </div>
    </div>
  );
}
