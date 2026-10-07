import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { TableRecord } from "../common/types";

export type CameraPreset = "overview" | "dining" | "kitchen" | "entrance";
export type FollowTarget = "none" | "waiter-1" | "waiter-2" | "chef-1" | "customer-active";

interface RestaurantSceneProps {
  tables: TableRecord[];
  cameraPreset: CameraPreset;
  followTarget: FollowTarget;
  onSelectTable: (tableId: string) => void;
  onSceneError: (message: string | null) => void;
}

const STATE_COLORS: Record<string, number> = {
  AVAILABLE: 0x34d399,
  RESERVED: 0xfbbf24,
  ORDERING: 0xf59e0b,
  ORDER_SENT: 0xf59e0b,
  PREPARING: 0xfb923c,
  FOOD_READY: 0x38bdf8,
  SERVING: 0x38bdf8,
  DINING: 0xc084fc,
  BILL_REQUESTED: 0xf472b6,
  PAYMENT: 0xf472b6,
  CLEANING: 0x94a3b8,
};

const CAMERA_VIEWS: Record<CameraPreset, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  overview: { position: new THREE.Vector3(0, 20, 26), target: new THREE.Vector3(0, 0, 0) },
  dining: { position: new THREE.Vector3(0, 10, 14), target: new THREE.Vector3(0, 0, 3) },
  kitchen: { position: new THREE.Vector3(-10, 8, 4), target: new THREE.Vector3(-11, 0, -6) },
  entrance: { position: new THREE.Vector3(0, 6, 21), target: new THREE.Vector3(0, 0, 13) },
};

function addBox(
  parent: THREE.Group | THREE.Scene,
  size: [number, number, number],
  position: [number, number, number],
  color: number,
  roughness = 0.7,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addStaff(scene: THREE.Scene, position: [number, number, number], uniform: number, scale = 1) {
  const person = new THREE.Group();
  person.position.set(...position);
  person.scale.setScalar(scale);
  const uniformMaterial = new THREE.MeshStandardMaterial({ color: uniform, roughness: 0.55 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xc89470, roughness: 0.7 });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.55, 8), uniformMaterial);
  legs.position.y = 0.28;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.42, 4, 8), uniformMaterial);
  torso.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 12), skinMaterial);
  head.position.y = 1.3;
  for (const part of [legs, torso, head]) {
    part.castShadow = true;
    person.add(part);
  }
  scene.add(person);
  return person;
}

export default function RestaurantScene({ tables, cameraPreset, followTarget, onSelectTable, onSceneError }: RestaurantSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const tableGroupsRef = useRef(new Map<string, THREE.Group>());
  const stateRingsRef = useRef(new Map<string, THREE.Mesh>());
  const staffRef = useRef(new Map<string, THREE.Group>());
  const followTargetRef = useRef(followTarget);
  const onSelectTableRef = useRef(onSelectTable);
  const onSceneErrorRef = useRef(onSceneError);

  useEffect(() => { followTargetRef.current = followTarget; }, [followTarget]);
  useEffect(() => { onSelectTableRef.current = onSelectTable; }, [onSelectTable]);
  useEffect(() => { onSceneErrorRef.current = onSceneError; }, [onSceneError]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | undefined;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.className = "absolute inset-0 h-full w-full touch-none outline-none";
      renderer.domElement.setAttribute("aria-label", "Interactive 3D restaurant floor. Select a table to inspect it.");
      renderer.domElement.tabIndex = 0;
      host.appendChild(renderer.domElement);
    } catch {
      const message = "The 3D floor is unavailable in this browser. Live restaurant operations are still available.";
      onSceneErrorRef.current(message);
      return;
    }

    onSceneErrorRef.current(null);
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080b);
    scene.fog = new THREE.FogExp2(0x07080b, 0.018);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 200);
    camera.position.copy(CAMERA_VIEWS.overview.position);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.target.copy(CAMERA_VIEWS.overview.target);

    scene.add(new THREE.AmbientLight(0xffecd6, 1.25));
    const chandelier = new THREE.PointLight(0xffb766, 170, 36);
    chandelier.position.set(2, 9, 2);
    chandelier.castShadow = true;
    scene.add(chandelier);
    const kitchenLight = new THREE.SpotLight(0xffaa44, 220, 28, Math.PI / 3, 0.45, 1);
    kitchenLight.position.set(-11, 9, -5);
    kitchenLight.target.position.set(-11, 0, -7);
    kitchenLight.castShadow = true;
    scene.add(kitchenLight, kitchenLight.target);
    const foyerLight = new THREE.PointLight(0x88ccff, 70, 20);
    foyerLight.position.set(0, 6, 15);
    scene.add(foyerLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 42),
      new THREE.MeshStandardMaterial({ color: 0x17181d, roughness: 0.38, metalness: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    addBox(scene, [34, 5, 0.45], [0, 2.5, -20], 0x11141b);
    addBox(scene, [0.45, 5, 40], [-17, 2.5, 0], 0x11141b);
    addBox(scene, [0.45, 5, 40], [17, 2.5, 0], 0x11141b);

    // Kitchen station and host stand establish the same visual zones as the reference layout.
    addBox(scene, [8, 1.1, 3.5], [-11, 0.55, -9], 0x24252a, 0.35);
    addBox(scene, [2.5, 1.8, 1.4], [0, 0.9, 13], 0x3b2d1c, 0.4);
    const staff = new Map<string, THREE.Group>();
    staff.set("chef-1", addStaff(scene, [-11, 0, -6.5], 0xe7e9eb, 1.05));
    staff.set("waiter-1", addStaff(scene, [2.2, 0, 0], 0x151922));
    staff.set("waiter-2", addStaff(scene, [-2.2, 0, 0], 0x222936));
    staff.set("customer-active", addStaff(scene, [0, 0, 8.2], 0x7c4a33, 0.9));

    const tableGroups = new Map<string, THREE.Group>();
    const stateRings = new Map<string, THREE.Mesh>();
    const gold = new THREE.MeshStandardMaterial({ color: 0xcaa54a, metalness: 0.82, roughness: 0.24 });
    for (const table of tables) {
      const group = new THREE.Group();
      group.position.set(table.pos.x, table.pos.y, table.pos.z);
      group.userData.tableId = table.id;

      const radius = table.id.startsWith("V") ? 1.45 : table.capacity >= 6 ? 1.32 : 1.05;
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.12, 32),
        new THREE.MeshStandardMaterial({ color: table.id.startsWith("V") ? 0x252127 : 0xd8d0c4, roughness: 0.2, metalness: 0.1 }),
      );
      top.position.y = 1.12;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.38, 1.05, 12), gold);
      base.position.y = 0.52;
      base.castShadow = true;
      group.add(base);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.08, 0.045, 8, 40),
        new THREE.MeshStandardMaterial({ color: STATE_COLORS[table.state] ?? 0x34d399, emissive: STATE_COLORS[table.state] ?? 0x34d399, emissiveIntensity: 0.22 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.21;
      ring.userData.stateIndicator = true;
      group.add(ring);

      for (let seat = 0; seat < table.capacity; seat++) {
        const angle = (seat / table.capacity) * Math.PI * 2;
        const chair = new THREE.Mesh(
          new THREE.BoxGeometry(0.52, 0.58, 0.48),
          new THREE.MeshStandardMaterial({ color: table.id.startsWith("V") ? 0x493a28 : 0x282b32, roughness: 0.5 }),
        );
        chair.position.set(Math.cos(angle) * (radius + 0.65), 0.3, Math.sin(angle) * (radius + 0.65));
        chair.rotation.y = -angle;
        chair.castShadow = true;
        group.add(chair);
      }

      scene.add(group);
      tableGroups.set(table.id, group);
      stateRings.set(table.id, ring);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointerDown = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...tableGroups.values()], true);
      const tableId = hits.find(hit => typeof hit.object.parent?.userData.tableId === "string")?.object.parent?.userData.tableId
        ?? hits.find(hit => typeof hit.object.parent?.parent?.userData.tableId === "string")?.object.parent?.parent?.userData.tableId;
      if (typeof tableId === "string") onSelectTableRef.current(tableId);
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    rendererRef.current = renderer;
    cameraRef.current = camera;
    controlsRef.current = controls;
    sceneRef.current = scene;
    tableGroupsRef.current = tableGroups;
    stateRingsRef.current = stateRings;
    staffRef.current = staff;

    const resize = () => {
      const nextWidth = Math.max(host.clientWidth, 1);
      const nextHeight = Math.max(host.clientHeight, 1);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight, false);
    };
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();

    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      const targetName = followTargetRef.current;
      const targetObject = staff.get(targetName);
      if (targetObject && targetName !== "none") controls.target.lerp(targetObject.position, 0.045);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      sceneRef.current = null;
      tableGroupsRef.current.clear();
      stateRingsRef.current.clear();
      staffRef.current.clear();
    };
  }, [tables.map(table => table.id).join("|")]);

  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;
    const view = CAMERA_VIEWS[cameraPreset];
    camera.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
  }, [cameraPreset]);

  useEffect(() => {
    for (const table of tables) {
      const group = tableGroupsRef.current.get(table.id);
      if (group) group.position.set(table.pos.x, table.pos.y, table.pos.z);
      const ring = stateRingsRef.current.get(table.id);
      if (ring && ring.material instanceof THREE.MeshStandardMaterial) {
        const color = STATE_COLORS[table.state] ?? 0x94a3b8;
        ring.material.color.setHex(color);
        ring.material.emissive.setHex(color);
      }
    }
  }, [tables]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#07080b]">
    </div>
  );
}
