import React, { useState, useEffect } from "react";
import { TableRecord, MenuItem, OrderRecord, WebSocketPayload } from "../common/types";

const MENU_ITEMS: MenuItem[] = [
  { id: "M01", name: "Chicken Dum Biryani", category: "Indian", price: 320, description: "Authentic slow-cooked spiced basmati rice with tender chicken.", isVeg: false, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500", prepTimeSeconds: 6 },
  { id: "M02", name: "Classic Chicken 65", category: "Starters", price: 240, description: "Crispy fried chicken tossed with curry leaves and chili.", isVeg: false, image: "https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=500", prepTimeSeconds: 4 },
  { id: "M03", name: "Truffle Mushroom Pasta", category: "Pasta", price: 380, description: "Handcrafted fettuccine with porcini and winter truffle.", isVeg: true, image: "https://images.unsplash.com/photo-1621996346565-e3d5d628102a?w=500", prepTimeSeconds: 5 },
  { id: "M04", name: "Chilled Coca Cola", category: "Beverages", price: 60, description: "330ml chilled can served with lemon twist.", isVeg: true, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500", prepTimeSeconds: 1 }
];

export default function GuestApp() {
  const [tables, setTables] = useState<TableRecord[]>([
    { id: "T01", name: "Table T01", capacity: 2, state: "AVAILABLE", pos: { x: -6, y: 0, z: 2 } },
    { id: "T02", name: "Table T02", capacity: 4, state: "AVAILABLE", pos: { x: 0, y: 0, z: 2 } },
    { id: "T03", name: "Table T03", capacity: 2, state: "AVAILABLE", pos: { x: 6, y: 0, z: 2 } },
    { id: "T04", name: "Table T04", capacity: 4, state: "AVAILABLE", pos: { x: -6, y: 0, z: 7 } },
    { id: "T05", name: "Table T05", capacity: 4, state: "AVAILABLE", pos: { x: 0, y: 0, z: 7 } },
    { id: "T06", name: "Table T06", capacity: 6, state: "AVAILABLE", pos: { x: 6, y: 0, z: 7 } },
    { id: "V01", name: "VIP Lounge V01", capacity: 6, state: "AVAILABLE", pos: { x: -5, y: 0, z: -8 } },
    { id: "V02", name: "VIP Vault V02", capacity: 4, state: "AVAILABLE", pos: { x: 5, y: 0, z: -8 } },
  ]);
  const [step, setStep] = useState<"BOOKING" | "MENU" | "TRACKER">("BOOKING");
  const [guestName, setGuestName] = useState("Rahul");
  const [selectedTableId, setSelectedTableId] = useState("T05");
  const [cart, setCart] = useState<{ [id: string]: number }>({ M01: 2, M04: 1 });
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const ws = new WebSocket("ws://localhost:4000");
      ws.onmessage = (e) => {
        const p: WebSocketPayload = JSON.parse(e.data);
        if (p.type === "INITIAL_STATE" && p.data?.tables) setTables(p.data.tables);
        if (p.type === "TABLE_STATE_CHANGED") setTables(prev => prev.map(t => t.id === p.data.tableId ? { ...t, state: p.data.state } : t));
        if (p.type === "ORDER_STATUS_UPDATED" && activeOrder?.orderId === p.data.orderId) setActiveOrder(p.data);
      };
      return () => ws.close();
    } catch (err) {
      console.warn("WebSocket connecting...", err);
    }
  }, []);

  const handleBooking = async () => {
    setError("");
    if (!guestName.trim()) {
      setError("Enter your name before confirming the booking.");
      return;
    }
    if (!tables.some(t => t.id === selectedTableId && t.state === "AVAILABLE")) {
      setError("That table is no longer available. Please choose another table.");
      return;
    }
    try {
      const response = await fetch("http://localhost:4000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, tableId: selectedTableId, requiresParking: true })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Booking could not be confirmed.");
      setStep("MENU");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the restaurant server.");
    }
  };

  const handleOrder = async () => {
    setError("");
    const items = Object.entries(cart).filter(([, qty]) => qty > 0).map(([id, qty]) => ({ menuItem: MENU_ITEMS.find(m => m.id === id)!, quantity: qty }));
    if (!items.length) { setError("Add at least one menu item before placing your order."); return; }
    try {
      const res = await fetch("http://localhost:4000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTableId, guestName, items })
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setActiveOrder(d.order);
        setStep("TRACKER");
        return;
      }
      throw new Error(d.error || "Order could not be placed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the restaurant server.");
    }
  };

  const handlePay = async () => {
    if (!activeOrder) return;
    setError("");
    try {
        const response = await fetch("http://localhost:4000/api/billing/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: selectedTableId, orderId: activeOrder.orderId })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Payment could not be completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the restaurant server.");
      return;
    }
    alert("Payment Settled! Table is now available.");
    setStep("BOOKING");
    setActiveOrder(null);
  };

  return (
    <div className="w-full h-full max-w-5xl mx-auto p-6 md:p-8 flex flex-col justify-between overflow-y-auto text-neutral-100">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-amber-300 font-serif">GUEST RESERVATION & ORDERING</h1>
          <p className="text-xs text-neutral-400">Step-by-step table booking, menu ordering & live tracking</p>
        </div>
        <span className="text-xs font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full text-amber-400">
          Step: {step}
        </span>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

      {/* Step 1: Booking */}
      {step === "BOOKING" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0e1017] p-6 rounded-2xl border border-white/10">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">1. Guest Details</h2>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Your Full Name</label>
              <input
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full bg-black/60 border border-white/20 p-3 rounded-xl text-white outline-none focus:border-amber-400 text-sm"
                placeholder="Your Name"
              />
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-neutral-300">
              Selected Table: <b className="text-amber-400">{selectedTableId}</b>
            </div>
            <button
              onClick={handleBooking}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase text-xs tracking-wider rounded-xl transition shadow-lg shadow-amber-400/20"
            >
              Confirm Table {selectedTableId} & View Menu
            </button>
          </div>

          <div>
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-widest font-mono mb-3">Select Table on Floor</h2>
            <div className="grid grid-cols-3 gap-3">
              {tables.map(t => {
                const isSelected = selectedTableId === t.id;
                const isAvailable = t.state === "AVAILABLE";
                return (
                  <button
                    key={t.id}
                    disabled={!isAvailable}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? "bg-amber-400 text-black font-bold border-amber-300 scale-105 shadow-xl"
                        : isAvailable
                        ? "bg-black/40 border-emerald-500/40 text-emerald-400 hover:border-emerald-300"
                        : "bg-white/5 border-white/5 text-neutral-600 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-sm font-mono">{t.id}</span>
                    <span className="text-[10px] opacity-80">{t.capacity} Seats</span>
                    <span className="text-[9px] uppercase mt-1">{t.state}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Food Menu */}
      {step === "MENU" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-[#0e1017] p-4 rounded-xl border border-white/10">
            <div>
              <span className="text-xs text-neutral-400">Order for:</span>
              <h3 className="font-bold text-amber-400">Table {selectedTableId} — {guestName}</h3>
            </div>
            <button
              onClick={handleOrder}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase text-xs tracking-wider rounded-xl transition"
            >
              Place Kitchen Order ({Object.values(cart).reduce((a, b) => a + b, 0)} Items)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MENU_ITEMS.map(item => (
              <div key={item.id} className="bg-[#0e1017] border border-white/10 p-4 rounded-2xl flex gap-4 items-center">
                <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-xl" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-white">{item.name}</h4>
                    <span className="text-sm font-mono text-amber-400 font-bold">₹{item.price}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${item.isVeg ? "border-emerald-500 text-emerald-400" : "border-rose-500 text-rose-400"}`}>
                      {item.isVeg ? "VEG" : "NON-VEG"}
                    </span>
                    <div className="flex items-center gap-2 bg-black/60 rounded-lg p-1 border border-white/10">
                      <button onClick={() => setCart(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))} className="w-6 h-6 flex items-center justify-center text-neutral-300 hover:text-white">-</button>
                      <span className="text-xs font-mono w-4 text-center font-bold">{cart[item.id] || 0}</span>
                      <button onClick={() => setCart(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))} className="w-6 h-6 flex items-center justify-center text-neutral-300 hover:text-white">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Tracker & Bill */}
      {step === "TRACKER" && activeOrder && (
        <div className="max-w-lg mx-auto w-full bg-[#0e1017] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="text-center pb-3 border-b border-white/10">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">LIVE ORDER TIMELINE</span>
            <h2 className="text-xl font-bold text-white mt-1">Order #{activeOrder.orderId} (Table {activeOrder.tableId})</h2>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
              <span>✓</span> Order Confirmed & Sent to Kitchen
            </div>
            <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 flex items-center gap-2 font-bold">
              <span>●</span> Chef Marcus Preparing Dishes ({activeOrder.prepProgress}%)
            </div>
            <div className="p-3 rounded-lg bg-black/30 border border-white/5 text-neutral-500 flex items-center gap-2">
              <span>○</span> Server Waiter Dispatched for Table Delivery
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/50 border border-white/10 font-mono text-xs space-y-1.5">
            <div className="text-neutral-400 text-[10px] uppercase tracking-wider pb-1 border-b border-white/10">Invoice Items</div>
            {activeOrder.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-neutral-300">
                <span>{it.quantity}× {it.menuItem.name}</span>
                <span>₹{it.quantity * it.menuItem.price}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-amber-300 text-sm">
              <span>Total Payable:</span>
              <span>₹{activeOrder.total}</span>
            </div>
          </div>

          <button onClick={handlePay} className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-black font-bold uppercase text-xs tracking-wider rounded-xl transition shadow-lg shadow-emerald-400/20">
            Pay ₹{activeOrder.total} & Settle Folio
          </button>
        </div>
      )}
    </div>
  );
}
