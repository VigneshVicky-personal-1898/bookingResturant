# Admin 3D Restaurant Simulation Design

## Goal

Bring the attached autonomous restaurant simulator's visual design into the existing `/admin` view while keeping the current guest booking and ordering flow intact. The admin view should show the restaurant floor in 3D, live table and order information, and the operations controls represented by the attachment.

## Approved direction

Replace the current three-column `AdminApp` dashboard with a React implementation of the attached operations screen. Use the project's installed Three.js dependency and the existing Express/WebSocket server as the source of truth for tables, orders, and parking. Preserve the `/guest` and `/admin` routes.

## Screen structure

- A Three.js restaurant floor occupies the admin view, using the attached dark, warm, glass-panel visual style.
- A React HUD provides restaurant identity, live KPI cards, camera presets, staff-follow selection, ambient audio toggle, and walk-in action where supported.
- A React kitchen display lists active server orders and progress.
- A React table inspector shows selected table state, capacity, associated order, and bill details when available.
- Responsive controls keep the KDS and primary actions usable on narrow screens.

The existing eight server table IDs and positions are authoritative. The HTML attachment uses a separate numeric table blueprint, so its table IDs, occupancy, orders, revenue, and autonomous workflow must not be copied as independent application state.

## State and interactions

- `AdminApp` owns the WebSocket connection and live table, order, and parking state. It handles `INITIAL_STATE`, `ORDER_PLACED`, `ORDER_STATUS_UPDATED`, `TABLE_STATE_CHANGED`, and `PARKING_UPDATED` messages.
- KPI and KDS values are derived from those server records. Revenue is derived from completed orders; staff count reflects the displayed staff models.
- Selecting a 3D table or a table in the inspector updates one selected-table ID. The inspector renders from that table and its current order data.
- Table meshes are positioned from `TableRecord.pos`, and their visual state is derived from `TableRecord.state`.
- Three.js may animate staff and guest models for presentation, but it must not create bookings, orders, payments, table state transitions, or revenue locally.
- The walk-in control must use a real server-backed flow if implemented. If the current API cannot support it without inventing a separate workflow, omit or disable the control and surface that gap instead of showing a fake booking.
- Camera presets, follow target, and audio are local presentation state only. Audio starts only after a user gesture.

## React and Three.js boundaries

- Keep the existing Vite/React entry point; do not load a second Tailwind CDN or a separate Three.js CDN build.
- Split the implementation into focused UI and scene units, for example an admin shell/HUD, KDS, inspector, and a Three.js scene component or hook.
- Initialize the renderer, scene, camera, controls, raycaster, and animation frame inside a React effect attached to a container ref.
- Keep DOM UI in React. Three.js manages only canvas content and scene objects; avoid global `onclick` functions and `innerHTML` updates from the pasted file.
- On unmount, stop the animation frame and simulation timers, remove pointer/resize listeners, dispose renderer/controls/geometries/materials, and close any audio context created by the view.
- Use the installed Three.js version and its supported OrbitControls module; do not depend on the attachment's legacy CDN globals.

## Error and empty states

- If the WebSocket is disconnected, retain the last received view and show a connection indicator; do not replace live data with fabricated operations.
- Render useful empty states for no active kitchen orders and no selected table.
- If WebGL is unavailable, keep the React operations panels usable and show a clear scene-unavailable message.
- Guard JSON parsing and malformed WebSocket payload handling so one bad message does not crash the admin view.

## Out of scope

- Replacing or redesigning the guest flow.
- Adding new backend workflows for walk-ins, order dispatch, revenue accounting, or payment simulation.
- Copying the attachment's auto-arrival timers, random orders, self-settling payments, or independent table lifecycle.
- Introducing new external runtime CDNs or dependencies.

## Verification

- Run TypeScript checking and the client production build.
- Manually verify `/admin` scene rendering, orbit/camera controls, responsive drawers, table selection, and that live server table/order updates reach both the HUD and inspector.
- Manually verify `/guest` remains accessible and that navigating between routes mounts/unmounts the 3D resources cleanly.
- Confirm no automatic simulation changes backend state and no timers/listeners continue after leaving `/admin`.

## Review notes

- The attachment is a standalone 1,428-line HTML/JavaScript page and uses Three.js r128 via CDN; the repo currently uses React, Vite, and Three.js 0.165.
- The attachment's autonomous lifecycle would conflict with the existing server's WebSocket state. This design keeps backend records authoritative and limits local scene state to presentation.
- The repository directory is not a Git worktree, so this design document cannot be committed here.
