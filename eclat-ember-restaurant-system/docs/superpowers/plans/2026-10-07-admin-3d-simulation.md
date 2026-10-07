# Admin 3D Restaurant Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic `/admin` dashboard with the attached 3D operations design, driven by the existing server's live restaurant state.

**Architecture:** `AdminApp` remains the owner of WebSocket data and React UI state. A `RestaurantScene` component owns the Three.js canvas and receives server table records, camera settings, and a table-selection callback. React renders the HUD, KDS, and inspector; Three.js renders the floor, tables, and staff scene.

**Tech Stack:** React 18, TypeScript, Vite, Three.js 0.165, installed `OrbitControls` addon, existing Express/WebSocket API, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-07-admin-3d-simulation-design.md`

## Global Constraints

- Use the existing eight server table IDs and positions as authoritative.
- Use the existing Express/WebSocket server as the source of truth for tables, orders, and parking.
- Three.js may animate staff and guest models for presentation, but it must not create bookings, orders, payments, table state transitions, or revenue locally.
- Keep DOM UI in React. Three.js manages only canvas content and scene objects; avoid global `onclick` functions and `innerHTML` updates from the pasted file.
- Use the installed Three.js version and its supported OrbitControls module; do not depend on the attachment's legacy CDN globals.
- On unmount, stop the animation frame and simulation timers, remove pointer/resize listeners, dispose renderer/controls/geometries/materials, and close any audio context created by the view.
- Do not add runtime CDNs, dependencies, or new backend workflows.

## Review Focus

- Malformed WebSocket JSON or unexpected message data must not crash `/admin`.
- A table update that arrives before scene creation or while the inspector selection changes must still render the latest state.
- Scene initialization must degrade to a usable React-only operations view if WebGL creation fails.
- Rapid route changes and React Strict Mode effect replay must not leave a second renderer, animation loop, listener, timer, or audio context alive.
- Narrow viewports must retain access to table selection, KDS, and primary camera controls.

---

## File Structure

- Create `client/src/admin/RestaurantScene.tsx`: Three.js scene lifecycle, floor/table/staff meshes, raycast selection, camera presets/follow mode, resize handling, and resource disposal.
- Modify `client/src/admin/AdminApp.tsx`: WebSocket lifecycle, derived KPIs, selected table state, React layout, error/connection states, and orchestration of the scene and operations panels.
- Create `client/src/admin/AdminHud.tsx`: brand, KPI strip, camera/follow/audio controls, and responsive walk-in affordance only if backed by an existing real API flow.
- Create `client/src/admin/KitchenPanel.tsx`: active order list derived from server orders.
- Create `client/src/admin/TableInspector.tsx`: selected table and associated order/bill presentation.
- Modify `client/src/AppRouter.tsx` and `client/vite.config.ts`: lazy-load the admin-only Three.js view and keep its vendor bundle separate from the guest entry chunk.
- No changes to `server/src/server.ts` or guest screens are required by this feature.

**Implementation ruling:** Split the 3D view into an on-demand route chunk and a Three.js vendor chunk because the first production build put the 3D runtime into a 674 KB initial bundle. This keeps `/guest` from downloading the admin scene and makes the browser load the 3D code only when `/admin` opens.

### Task 1: Build the managed Three.js scene

**Files:**
- Create: `client/src/admin/RestaurantScene.tsx`

**Interfaces:**
- Consumes: `tables: TableRecord[]`, `cameraPreset: "overview" | "dining" | "kitchen" | "entrance"`, `followTarget: "none" | "waiter-1" | "waiter-2" | "chef-1" | "customer-active"`, and `onSelectTable(tableId: string): void`.
- Produces: a full-size canvas scene that visually reflects each table record's current position and state; clicks call `onSelectTable` with the matching server ID; renderer errors call `onSceneError(message)`.

- [x] Create `RestaurantScene` props and a container ref. Initialize Three.js 0.165 renderer, scene, perspective camera, and `OrbitControls` from `three/addons/controls/OrbitControls.js` inside an effect.
- [x] Build the dark restaurant floor, warm architectural lighting, 8 table groups, and static chef/waiter models. Position table groups using each `TableRecord.pos`; label or otherwise map every server ID to the correct group.
- [x] Add a raycaster pointer handler that selects the intersected table and calls `onSelectTable(table.id)`. Ignore pointer events originating outside the canvas.
- [x] Apply `TableRecord.state` to table materials/indicators when the `tables` prop changes without recreating the renderer.
- [x] Apply camera preset/follow changes through effect updates without recreating the scene.
- [x] Handle resize with `ResizeObserver` on the scene container. If renderer creation fails, expose a scene error to the parent while leaving the parent renderable.
- [x] Add cleanup for animation frame, observer, pointer handlers, controls, geometries, materials, renderer, and any timers/audio resources.
- [x] Run `npx tsc --noEmit`; expected: no TypeScript errors.

### Task 2: Build React operations panels

**Files:**
- Create: `client/src/admin/AdminHud.tsx`
- Create: `client/src/admin/KitchenPanel.tsx`
- Create: `client/src/admin/TableInspector.tsx`

**Interfaces:**
- `AdminHud` consumes derived table/order/revenue/staff counts and camera/follow/audio values with typed callbacks.
- `KitchenPanel` consumes `orders: OrderRecord[]` and renders non-completed orders with status and `prepProgress`.
- `TableInspector` consumes `tables: TableRecord[]`, `table: TableRecord | null`, `order: OrderRecord | null`, and `onSelectTable(tableId: string): void`; it renders a server-backed table selector plus current status, capacity, order items, and totals.

- [x] Define exported prop types for each panel and implement the dark glass UI structure, visual hierarchy, controls, empty states, and responsive drawer affordance from the attachment.
- [x] Derive visible KDS orders from the input orders; show the no-pending-orders message when none remain.
- [x] Render the selected table inspector from props; show a select-table hint when the table is null, allow selection from server table records, and show order/bill details only when an associated order exists.
- [x] Ensure buttons, select, and audio controls use React callbacks and accessible labels; audio toggle begins only after user activation.
- [x] Keep all values sourced from props; do not introduce mock orders, local payment actions, or random walk-ins.
- [x] Run `npx tsc --noEmit`; expected: no TypeScript errors.

### Task 3: Connect admin state, live events, and scene

**Files:**
- Modify: `client/src/admin/AdminApp.tsx`
- Modify: `client/src/AppRouter.tsx`
- Modify: `client/vite.config.ts`

**Interfaces:**
- `AdminApp` owns `tables`, `orders`, `parking`, connection/error state, selected table ID, camera preset, follow target, and audio toggle state.
- It passes current tables and visual controls to `RestaurantScene`; it passes derived values and callbacks to the four React panels.

- [x] Implement one WebSocket effect. Parse messages inside a guarded handler and process `INITIAL_STATE`, `ORDER_PLACED`, `ORDER_STATUS_UPDATED`, `TABLE_STATE_CHANGED`, and `PARKING_UPDATED`.
- [x] Handle initial connection, open, error, close, and cleanup; render a visible connection indicator and retain the last known data after disconnection.
- [x] Update orders by ID on status changes and avoid duplicate `ORDER_PLACED` entries. Use functional state updates so event handlers do not read stale React state.
- [x] Derive active order count, kitchen queue count, occupied table count, and completed-order revenue from current state.
- [x] Keep selected table valid when table data arrives or selection changes. Derive its latest order by matching `tableId`.
- [x] Compose the scene and panels in the approved overlay layout. Preserve `/guest` and `/admin` route behavior.
- [x] Lazy-load the admin screen from `AppRouter` and split the Three.js dependency into its own Vite chunk without changing route behavior.
- [x] Verify malformed JSON is ignored safely and surface scene initialization errors without hiding operations panels.
- [x] Run `npx tsc --noEmit`; expected: no TypeScript errors.

### Task 4: Verify the integrated admin experience

**Files:**
- Modify only files above to correct integration issues.

- [x] Run `npx tsc --noEmit`; expected: no TypeScript errors.
- [x] Run `npm run build:client`; expected: Vite production build completes without errors and Tailwind emits utility styles.
- [ ] Start the existing server and client, open `/admin`, and confirm the 3D scene, all 8 server tables, and live operation panels render.
- [ ] Change table selection from both the 3D scene and inspector controls; confirm the inspector follows the selected server table.
- [ ] Place an order through `/guest`; confirm the admin KDS, KPI values, table indicator, and selected table details update from WebSocket events.
- [ ] Navigate between `/admin` and `/guest` repeatedly; confirm scene resources are cleaned up and the guest flow still renders.
- [ ] Check a narrow viewport, WebGL failure behavior, server disconnection behavior, and malformed WebSocket message behavior against the Review Focus list.

## Self-review

- **Spec coverage:** Scene and table mapping are in Task 1; HUD/KDS/inspector are in Task 2; WebSocket state, KPIs, and error states are in Task 3; responsive/lifecycle and end-to-end checks are in Task 4. No backend feature is added.
- **Step scan:** Each step names one implementation or verification action and a concrete result; component contracts are defined before consumers use them.
- **Type consistency:** `TableRecord`, `OrderRecord`, and camera/follow literal unions are used consistently across scene and panels. The selected order is derived by `tableId`.
- **Review focus:** Each listed condition is explicitly checked in Tasks 1, 3, or 4.
- **Proportion:** Four tasks cover the scene, panels, data integration, and final verification without introducing a new simulation backend.
- **Workspace note:** This directory is not a Git worktree, so plan commits cannot be created here.
