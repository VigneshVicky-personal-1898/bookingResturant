import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { TableRecord, OrderRecord, ParkingSlot, WebSocketPayload } from "../../client/src/common/types";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

export const tablesDB: TableRecord[] = [
  { id: "T01", name: "Table T01", capacity: 2, state: "AVAILABLE", pos: { x: -6, y: 0, z: 2 } },
  { id: "T02", name: "Table T02", capacity: 4, state: "AVAILABLE", pos: { x: 0, y: 0, z: 2 } },
  { id: "T03", name: "Table T03", capacity: 2, state: "AVAILABLE", pos: { x: 6, y: 0, z: 2 } },
  { id: "T04", name: "Table T04", capacity: 4, state: "AVAILABLE", pos: { x: -6, y: 0, z: 7 } },
  { id: "T05", name: "Table T05", capacity: 4, state: "AVAILABLE", pos: { x: 0, y: 0, z: 7 } },
  { id: "T06", name: "Table T06", capacity: 6, state: "AVAILABLE", pos: { x: 6, y: 0, z: 7 } },
  { id: "V01", name: "VIP Lounge V01", capacity: 6, state: "AVAILABLE", pos: { x: -5, y: 0, z: -8 } },
  { id: "V02", name: "VIP Vault V02", capacity: 4, state: "AVAILABLE", pos: { x: 5, y: 0, z: -8 } },
];

export const parkingDB: ParkingSlot[] = [
  { slotId: "P01", status: "EMPTY" },
  { slotId: "P02", status: "EMPTY" },
  { slotId: "P03", status: "EMPTY" },
  { slotId: "P04", status: "EMPTY" }
];

export const ordersDB: Map<string, OrderRecord> = new Map();

export function broadcast(payload: WebSocketPayload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  });
}

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({
    type: "INITIAL_STATE",
    data: { tables: tablesDB, parking: parkingDB, orders: Array.from(ordersDB.values()) }
  }));
});

app.post("/api/bookings", (req, res) => {
  const { tableId, requiresParking, guestName } = req.body;
  const target = tablesDB.find(t => t.id === tableId);
  if (!target) return res.status(404).json({ success: false, error: "Table not found." });
  if (target.state !== "AVAILABLE") return res.status(409).json({ success: false, error: "Table is no longer available." });
  if (typeof guestName !== "string" || !guestName.trim()) return res.status(400).json({ success: false, error: "Guest name is required." });

  target.state = "RESERVED";
  if (requiresParking) {
    const slot = parkingDB.find(p => p.status === "EMPTY");
    if (slot) {
      slot.status = "OCCUPIED";
      slot.assignedGuestName = guestName;
      broadcast({ type: "PARKING_UPDATED", data: parkingDB });
    }
  }
  broadcast({ type: "TABLE_STATE_CHANGED", data: { tableId, state: "RESERVED" } });
  res.json({ success: true });
});

app.post("/api/orders", (req, res) => {
  const { tableId, guestName, items } = req.body;
  const table = tablesDB.find(tab => tab.id === tableId);
  if (!table) return res.status(404).json({ success: false, error: "Table not found." });
  if (table.state !== "RESERVED") return res.status(409).json({ success: false, error: "A confirmed reservation is required to order." });
  if (typeof guestName !== "string" || !guestName.trim() || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: "Guest name and at least one order item are required." });
  }
  if (items.some((item: any) => !item?.menuItem || !Number.isFinite(item.menuItem.price) || item.menuItem.price < 0 || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    return res.status(400).json({ success: false, error: "Order items must have a valid price and positive quantity." });
  }
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const subtotal = items.reduce((s: number, i: any) => s + i.menuItem.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const serviceCharge = 50;
  const total = subtotal + tax + serviceCharge;

  const order: OrderRecord = {
    orderId, tableId, guestName: guestName.trim(), items, subtotal, tax, serviceCharge, total, status: "ORDER_PLACED", prepProgress: 0
  };
  ordersDB.set(orderId, order);

  const t = tablesDB.find(tab => tab.id === tableId);
  if (t) t.state = "ORDERING";

  broadcast({ type: "ORDER_PLACED", data: order });
  broadcast({ type: "TABLE_STATE_CHANGED", data: { tableId, state: "ORDERING" } });

  // Autonomous Order Flow
  setTimeout(() => {
    order.status = "PREPARING";
    if (t) t.state = "PREPARING";
    broadcast({ type: "ORDER_STATUS_UPDATED", data: order });
    broadcast({ type: "TABLE_STATE_CHANGED", data: { tableId, state: "PREPARING" } });

    const int = setInterval(() => {
      order.prepProgress += 25;
      broadcast({ type: "ORDER_STATUS_UPDATED", data: order });
      if (order.prepProgress >= 100) {
        clearInterval(int);
        order.status = "FOOD_READY";
        if (t) t.state = "FOOD_READY";
        broadcast({ type: "ORDER_STATUS_UPDATED", data: order });
        broadcast({ type: "TABLE_STATE_CHANGED", data: { tableId, state: "FOOD_READY" } });

        setTimeout(() => {
          order.status = "DELIVERED";
          if (t) t.state = "DINING";
          broadcast({ type: "ORDER_STATUS_UPDATED", data: order });
          broadcast({ type: "TABLE_STATE_CHANGED", data: { tableId, state: "DINING" } });
        }, 3000);
      }
    }, 1500);
  }, 2000);

  res.json({ success: true, order });
});

app.post("/api/billing/pay", (req, res) => {
  const { tableId, orderId } = req.body;
  const t = tablesDB.find(tab => tab.id === tableId);
  const o = ordersDB.get(orderId);
  if (!t || !o || o.tableId !== tableId) return res.status(404).json({ success: false, error: "Order or table not found." });
  if (o.status === "COMPLETED") return res.json({ success: true });
  o.status = "COMPLETED";
  t.state = "AVAILABLE";
  broadcast({ type: "ORDER_STATUS_UPDATED", data: o });
  broadcast({ type: "TABLE_STATE_CHANGED", data: { tableId, state: "AVAILABLE" } });
  res.json({ success: true });
});

server.listen(4000, () => console.log("Server listening on 4000"));
