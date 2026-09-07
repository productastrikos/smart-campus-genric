import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html, Line } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  ROOM GEOMETRY CONSTANTS                                            */
/* ------------------------------------------------------------------ */
const ROOM_W = 8, ROOM_D = 6, ROOM_H = 3.2;
const HALF_W = ROOM_W / 2, HALF_D = ROOM_D / 2;
const TEACH_X = -HALF_W; // teaching wall plane
const WINDOW_Z = -HALF_D; // window wall plane

const CAT_COLORS = { control: "#38bdf8", sensor: "#10b981", actuator: "#f59e0b", av: "#a78bfa" };

// device positions in 3D room space, derived once from the same UIIC hardware list
const DEVICES = [
  { n: 1, label: "RP-C Edge Hub", cat: "control", pos: [-3.3, ROOM_H + 0.18, -2.2], detail: ["24V · BACnet/IP OK", "CPU 24% · Edge Synced"] },
  { n: 2, label: "8-Port PoE Switch", cat: "control", pos: [-2.7, ROOM_H + 0.18, -2.2], detail: ["8/8 Ports Linked", "VLAN 10/20/30/40"] },
  { n: 3, label: "Biometric Reader", cat: "control", pos: [3.55, 1.1, 2.7], detail: ["32 Registered Scans", "Contactless · Active"] },
  { n: 5, label: "Insight-Sensor", cat: "sensor", pos: [0, ROOM_H - 0.1, -0.2], detail: ["32 Present · 36 BLE Tags", "480 Lux · 54 dB"] },
  { n: 6, label: "SXW Touch", cat: "sensor", pos: [-HALF_W + 0.05, 1.5, -3.2], detail: ["21.8°C · 640 ppm CO₂", "Setpoint 22.0°C · 48% RH"] },
  { n: 8, label: "Motorized Blinds", cat: "actuator", pos: [0, ROOM_H - 0.3, WINDOW_Z + 0.05], detail: ["Position: 75% Open", "Relay · Ready"] },
  { n: 9, label: "HVAC Diffuser", cat: "actuator", pos: [1.6, ROOM_H - 0.1, 0.6], detail: ["Fan Speed 55%", "0–10V · Modulating"] },
  { n: 11, label: "IdeaHub 86\"", cat: "av", pos: [TEACH_X + 0.05, 1.85, -0.8], detail: ["Teams Bridge Active", "Live Slide · CSC 340"] },
  { n: 13, label: "Lecture Camera", cat: "av", pos: [TEACH_X + 0.1, 2.85, -0.8], detail: ["Teacher Track · Active", "1080p60 · Auto-Frame"] },
];

const SCENES = {
  Lecture: { ambient: 0.85, sun: 0.9, fill: 0.95, warmth: "#eef6ff", screenGlow: 0.6 },
  "Video Presentation": { ambient: 0.32, sun: 0.25, fill: 0.4, warmth: "#dbeafe", screenGlow: 1.4 },
  Discussion: { ambient: 0.65, sun: 0.55, fill: 0.75, warmth: "#fde8cf", screenGlow: 0.5 },
  "Eco Setback": { ambient: 0.18, sun: 0.08, fill: 0.22, warmth: "#7c4a12", screenGlow: 0.25 },
};

const VIEW_PRESETS = {
  "Estate Orbit": { pos: [6.8, 4.2, 8.2], target: [-0.6, 1.0, -0.3] },
  "Teaching Wall": { pos: [-1.5, 2.3, 2.6], target: [TEACH_X + 1, 1.7, -0.6] },
  "Ceiling Void": { pos: [2.4, 4.6, 3.4], target: [-2.4, ROOM_H, -1.8] },
  "Occupancy View": { pos: [0.4, 5.6, 4.2], target: [0.4, 0, 0.2] },
};

/* ------------------------------------------------------------------ */
/*  LIVE SLIDE TEXTURE (canvas-drawn, used on the IdeaHub screen)      */
/* ------------------------------------------------------------------ */
function useSlideTexture(room) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 640;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, c.width, c.height);
    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, "#0b1220"); grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, c.width, c.height);

    ctx.fillStyle = "#38bdf8"; ctx.font = "700 44px monospace";
    ctx.fillText(room.course || "CSC 340", 48, 90);
    ctx.fillStyle = "#94a3b8"; ctx.font = "20px sans-serif";
    ctx.fillText("Data Structures & Algorithms — Lecture 07", 48, 130);
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2;
    ctx.strokeRect(48, 165, 620, 380);
    ctx.fillStyle = "#22d3ee"; ctx.font = "18px monospace";
    const code = [
      "class Node:",
      "    def __init__(self, val):",
      "        self.val = val",
      "        self.next = None",
      "",
      "def reverse(head):",
      "    prev = None",
      "    while head:",
      "        nxt = head.next",
      "        head.next = prev",
      "        prev, head = head, nxt",
      "    return prev",
    ];
    code.forEach((line, i) => ctx.fillText(line, 72, 205 + i * 28));

    // webcam tile (remote hybrid feed)
    ctx.fillStyle = "#0f172a"; ctx.fillRect(710, 165, 260, 190);
    ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 3; ctx.strokeRect(710, 165, 260, 190);
    ctx.fillStyle = "#a78bfa"; ctx.font = "14px sans-serif"; ctx.fillText("Dr. Ahmed Al Mansoori · Remote", 718, 372);
    ctx.beginPath(); ctx.arc(840, 250, 44, 0, Math.PI * 2); ctx.fillStyle = "#312e81"; ctx.fill();
    ctx.beginPath(); ctx.arc(840, 235, 22, 0, Math.PI * 2); ctx.fillStyle = "#a5b4fc"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(840, 305, 34, 26, 0, Math.PI, 0); ctx.fillStyle = "#a5b4fc"; ctx.fill();

    ctx.fillStyle = "#f59e0b"; ctx.font = "16px sans-serif";
    ctx.fillText("● LIVE · Teams Rooms Bridge", 710, 400);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [room.course]);
}

/* ------------------------------------------------------------------ */
/*  FURNITURE                                                          */
/* ------------------------------------------------------------------ */
function Desk({ position }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.95, 0.05, 0.55]} radius={0.02} position={[0, 0.74, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3a5674" metalness={0.12} roughness={0.55} />
      </RoundedBox>
      {[[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.74, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Chair({ position, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[0.42, 0.05, 0.42]} radius={0.05} position={[0, 0.46, 0]} castShadow>
        <meshStandardMaterial color="#475569" roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.4, 0.5, 0.05]} radius={0.08} position={[0, 0.72, -0.19]} castShadow>
        <meshStandardMaterial color="#475569" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Avatar({ position }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2 + position[0]) * 0.01;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#22d3ee" transparent opacity={0.55} emissive="#0891b2" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.15, 0.36, 4, 8]} />
        <meshStandardMaterial color="#22d3ee" transparent opacity={0.45} emissive="#0891b2" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  ROOM SHELL                                                         */
/* ------------------------------------------------------------------ */
function GhostWall({ args, position, rotation }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={args} />
      <meshPhysicalMaterial
        color="#0a1220" transparent opacity={0.4} roughness={0.15} metalness={0.1}
        side={THREE.DoubleSide} envMapIntensity={0.6}
      />
    </mesh>
  );
}

function RimEdges({ args, position, rotation, color = "#22d3ee" }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(...args)), [args]);
  return (
    <lineSegments geometry={geo} position={position} rotation={rotation}>
      <lineBasicMaterial color={color} transparent opacity={0.55} />
    </lineSegments>
  );
}

function Floor({ showHeatmap, occupiedSeats }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#16233a" roughness={0.8} metalness={0.05} />
      </mesh>
      {/* glowing perimeter plinth along the two open (front) edges */}
      {[
        [[0, 0.02, HALF_D], [ROOM_W, 0.04, 0.04]],
        [[HALF_W, 0.02, 0], [0.04, 0.04, ROOM_D]],
      ].map(([pos, size], i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={size} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      {showHeatmap && occupiedSeats.map((p, i) => (
        <mesh key={i} position={[p[0], 0.015, p[2] + 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55, 24]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function CeilingVoid({ plenumOpen }) {
  return (
    <group>
      <mesh position={[0, ROOM_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={plenumOpen ? 0.06 : 0.85} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, ROOM_H + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(ROOM_W, ROOM_D, 4, 3)]} />
        <lineBasicMaterial color="#334155" transparent opacity={plenumOpen ? 0.15 : 0.6} />
      </lineSegments>
      {/* cable tray, only legible once the plenum is opened */}
      <mesh position={[-2.9, ROOM_H + 0.18, -1.4]}>
        <boxGeometry args={[1.6, 0.04, 0.1]} />
        <meshStandardMaterial color="#334155" transparent opacity={plenumOpen ? 0.9 : 0.1} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  SENSOR VISUALS                                                     */
/* ------------------------------------------------------------------ */
function InsightSensorField({ position }) {
  const coneRef = useRef();
  const particlesRef = useRef();
  const particles = useMemo(() => {
    const n = 26;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = Math.random() * 1.3, a = Math.random() * Math.PI * 2, h = Math.random() * 2.6;
      arr[i * 3] = Math.cos(a) * r * (1 - h / 3.2);
      arr[i * 3 + 1] = -h; // relative to the sensor group — matches the cone's local span, not world Y
      arr[i * 3 + 2] = Math.sin(a) * r * (1 - h / 3.2);
    }
    return arr;
  }, [position]);

  useFrame(({ clock }) => {
    if (coneRef.current) coneRef.current.material.opacity = 0.1 + Math.sin(clock.elapsedTime * 1.4) * 0.05 + 0.1;
    if (particlesRef.current) particlesRef.current.rotation.y = clock.elapsedTime * 0.15;
  });

  return (
    <group position={position}>
      <mesh ref={coneRef} position={[0, -1.3, 0]}>
        <coneGeometry args={[1.3, 2.6, 32, 1, true]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#a78bfa" size={0.05} transparent opacity={0.8} sizeAttenuation depthWrite={false} />
      </points>
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 0.04, 16]} />
        <meshStandardMaterial color="#0b111e" emissive="#38bdf8" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function HVACStream({ active }) {
  const ref = useRef();
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.6, ROOM_H - 0.2, 0.6),
    new THREE.Vector3(1.2, 1.8, 0.9),
    new THREE.Vector3(0.6, 0.9, 1.1),
    new THREE.Vector3(0.2, 0.05, 1.3),
  ]), []);
  const t = useRef(0);
  useFrame((_, delta) => {
    if (!active || !ref.current) return;
    t.current = (t.current + delta * 0.3) % 1;
    const p = curve.getPoint(t.current);
    ref.current.position.copy(p);
  });
  if (!active) return null;
  return (
    <group>
      <Line points={curve.getPoints(20)} color="#10b981" transparent opacity={0.35} lineWidth={1} />
      <mesh ref={ref}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color="#10b981" toneMapped={false} />
      </mesh>
    </group>
  );
}

function NetworkTrace({ active, from, to }) {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, delta) => {
    if (!active || !ref.current) return;
    t.current = (t.current + delta * 0.6) % 1;
    ref.current.position.set(
      from[0] + (to[0] - from[0]) * t.current,
      from[1] + (to[1] - from[1]) * t.current,
      from[2] + (to[2] - from[2]) * t.current
    );
  });
  if (!active) return null;
  return (
    <group>
      <Line points={[from, to]} color="#7c3aed" transparent opacity={0.5} lineWidth={1.5} />
      <mesh ref={ref}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#c4b5fd" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  HUD PIN (billboarded AR-style callout)                             */
/* ------------------------------------------------------------------ */
function DevicePin({ device, selected, onSelect }) {
  const color = CAT_COLORS[device.cat];
  return (
    <group position={device.pos}>
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.11, 0.13, 24]} />
          <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Html distanceFactor={8} occlude={false} zIndexRange={[10, 0]}>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(device); }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap backdrop-blur-sm transition"
          style={{
            background: selected ? `${color}33` : "rgba(11,17,30,0.75)",
            border: `1px solid ${color}`,
            color: "#e2e8f0",
            transform: "translate(-50%, -140%)",
            boxShadow: selected ? `0 0 12px ${color}88` : "none",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          {device.label}
        </button>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  CAMERA RIG — handles preset transitions within OrbitControls        */
/* ------------------------------------------------------------------ */
function PresetDriver({ presetTarget, controlsRef }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!presetTarget || !controlsRef.current) return;
    camera.position.lerp(new THREE.Vector3(...presetTarget.pos), 0.06);
    controlsRef.current.target.lerp(new THREE.Vector3(...presetTarget.target), 0.06);
    controlsRef.current.update();
  });
  return null;
}

function SceneLighting({ scene }) {
  const s = SCENES[scene];
  const ambRef = useRef(), sunRef = useRef(), hemiRef = useRef(), fill1Ref = useRef(), fill2Ref = useRef();
  useFrame(() => {
    const lerp = (ref, target) => { if (ref.current) ref.current.intensity = THREE.MathUtils.lerp(ref.current.intensity, target, 0.05); };
    lerp(ambRef, s.ambient);
    lerp(sunRef, s.sun);
    lerp(hemiRef, s.fill);
    lerp(fill1Ref, s.fill * 0.9);
    lerp(fill2Ref, s.fill * 0.65);
  });
  return (
    <>
      {/* soft omnidirectional fill so the room reads even where the sun/screen light don't reach */}
      <hemisphereLight ref={hemiRef} args={["#a9d4f5", "#0b1220", s.fill]} />
      <ambientLight ref={ambRef} intensity={s.ambient} color={s.warmth} />
      <directionalLight ref={sunRef} position={[-2, 4, -6]} intensity={s.sun} color="#bfe3ff" />
      {/* room-center fill lights — this is what actually lights the desks and chairs */}
      <pointLight ref={fill1Ref} position={[0.5, 2.6, 0.9]} intensity={s.fill * 0.9} color="#eaf3ff" distance={8} decay={1.5} />
      <pointLight ref={fill2Ref} position={[-1.3, 2.4, 2.0]} intensity={s.fill * 0.65} color="#eaf3ff" distance={7} decay={1.5} />
      <pointLight position={[TEACH_X + 1, 2, -0.8]} intensity={s.screenGlow} color="#38bdf8" distance={4} />
      {scene === "Video Presentation" && (
        <spotLight position={[-1, 3, 0]} target-position={[-3, 0.7, 0.3]} angle={0.5} penumbra={0.6} intensity={1.2} color="#38bdf8" />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN SCENE                                                         */
/* ------------------------------------------------------------------ */
function RoomScene({ room, layers, scene, presetTarget, selectedDevice, setSelectedDevice, controlsRef }) {
  const slideTex = useSlideTexture(room);
  const seatsOccupied = Math.max(0, Math.min(12, Math.round((room.occupied / room.capacity) * 12)));
  const deskGrid = [];
  const cols = [-2.55, -1.15, 0.25, 1.65], rows = [-1.5, 0, 1.5];
  let idx = 0;
  const seatPositions = [];
  rows.forEach((z) => cols.forEach((x) => {
    seatPositions.push([x, 0, z]);
    idx += 1;
  }));

  return (
    <group>
      <SceneLighting scene={scene} />
      <PresetDriver presetTarget={presetTarget} controlsRef={controlsRef} />

      <GhostWall args={[ROOM_D, ROOM_H]} position={[TEACH_X, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} />
      <RimEdges args={[ROOM_D, ROOM_H]} position={[TEACH_X, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} />
      <GhostWall args={[ROOM_W, ROOM_H]} position={[0, ROOM_H / 2, WINDOW_Z]} rotation={[0, 0, 0]} />
      <RimEdges args={[ROOM_W, ROOM_H]} position={[0, ROOM_H / 2, WINDOW_Z]} rotation={[0, 0, 0]} />
      {/* louvers casting soft shadow slats on the window wall */}
      {[-1.4, -0.9, -0.4, 0.1, 0.6, 1.1, 1.6].map((y, i) => (
        <mesh key={i} position={[0, ROOM_H / 2 + y, WINDOW_Z + 0.03]}>
          <boxGeometry args={[ROOM_W - 0.4, 0.05, 0.02]} />
          <meshStandardMaterial color="#0a1220" transparent opacity={0.6} />
        </mesh>
      ))}

      <Floor showHeatmap={layers.heatmap} occupiedSeats={seatPositions.slice(0, seatsOccupied)} />
      <CeilingVoid plenumOpen={layers.plenum} />

      {/* teaching-wall IdeaHub + writing board */}
      <mesh position={[TEACH_X + 0.04, 1.85, -0.8]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 1.5]} />
        <meshBasicMaterial map={slideTex} toneMapped={false} />
      </mesh>
      <mesh position={[TEACH_X + 0.02, 1.85, -0.8]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 1.6]} />
        <meshStandardMaterial color="#0b1220" />
      </mesh>
      <mesh position={[TEACH_X + 0.03, 1.6, 1.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.3, 1.0]} />
        <meshStandardMaterial color="#e2e8f0" opacity={0.08} transparent />
      </mesh>

      {/* lectern with glowing touch controls */}
      <group position={[TEACH_X + 0.9, 0, 2.0]}>
        <RoundedBox args={[0.6, 0.95, 0.45]} radius={0.03} position={[0, 0.47, 0]} castShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
        </RoundedBox>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.15 + i * 0.15, 0.96, 0.1]}>
            <circleGeometry args={[0.03, 12]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 0.95, -0.35]}>
          <boxGeometry args={[0.5, 0.4, 0.03]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* desks, chairs, avatars — seating faces -X, toward the teaching wall's screen */}
      {seatPositions.map((p, i) => {
        const occ = i < seatsOccupied;
        return (
          <group key={i}>
            <Desk position={p} />
            <Chair position={[p[0] + 0.55, 0, p[2]]} rotationY={-Math.PI / 2} />
            {occ ? <Avatar position={[p[0] + 0.4, 0, p[2]]} /> : (
              <mesh position={[p[0] + 0.4, 0.6, p[2]]}>
                <boxGeometry args={[0.2, 0.4, 0.2]} />
                <meshBasicMaterial color="#334155" wireframe />
              </mesh>
            )}
          </group>
        );
      })}

      {/* attendance anomaly warning above row 3 */}
      {room.status === "alert" && (
        <Html position={[0.6, 2.1, 1.5]} center distanceFactor={9} zIndexRange={[5, 0]}>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/50 text-amber-300 text-[10px] font-medium whitespace-nowrap backdrop-blur-sm">
            ⚠️ 4 Phantom BLE Signals · No Optical Verification
          </div>
        </Html>
      )}

      <InsightSensorField position={[0, ROOM_H - 0.1, -0.2]} />
      <HVACStream active={layers.thermal} />
      <NetworkTrace active={layers.plenum} from={[-3.3, ROOM_H + 0.18, -2.2]} to={[-2.7, ROOM_H + 0.18, -2.2]} />

      {DEVICES.map((d) => (
        <DevicePin key={d.n} device={d} selected={selectedDevice?.n === d.n} onSelect={setSelectedDevice} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  EXPORTED WRAPPER — Canvas + floating HUD chrome                    */
/* ------------------------------------------------------------------ */
export default function RoomDigitalTwin3D({ room, rooms, onSwitchRoom }) {
  const [layers, setLayers] = useState({ thermal: false, ble: true, plenum: false, heatmap: false });
  const [scene, setScene] = useState("Lecture");
  const [presetName, setPresetName] = useState("Estate Orbit");
  const [presetTarget, setPresetTarget] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const controlsRef = useRef();

  const applyPreset = (name) => {
    setPresetName(name);
    setPresetTarget(VIEW_PRESETS[name]);
    if (name === "Ceiling Void") setLayers((l) => ({ ...l, plenum: true }));
    if (name === "Occupancy View") setLayers((l) => ({ ...l, heatmap: true }));
  };

  const toggleLayer = (key) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden bg-[#050810]">
      <Canvas shadows camera={{ fov: 45, position: VIEW_PRESETS["Estate Orbit"].pos, near: 0.1, far: 60 }}>
        <fog attach="fog" args={["#050810", 10, 22]} />
        <RoomScene
          room={room} layers={layers} scene={scene}
          presetTarget={presetTarget} selectedDevice={selectedDevice} setSelectedDevice={setSelectedDevice}
          controlsRef={controlsRef}
        />
        <OrbitControls
          ref={controlsRef}
          target={VIEW_PRESETS["Estate Orbit"].target}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={1.3}
          minAzimuthAngle={-Math.PI / 2.6}
          maxAzimuthAngle={Math.PI / 2.6}
          enablePan={false}
          minDistance={3.5}
          maxDistance={13}
          enableDamping
          dampingFactor={0.08}
          onStart={() => setPresetTarget(null)}
        />
      </Canvas>

      {/* top-left: breadcrumb + quick switcher */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-cyan-300 font-mono backdrop-blur-sm">
          {room.id}
        </span>
        {rooms && onSwitchRoom && (
          <select
            value={room.id}
            onChange={(e) => onSwitchRoom(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 backdrop-blur-sm focus:outline-none"
          >
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
          </select>
        )}
      </div>

      {/* top-right: visualization layer pills + view presets, one stacked column */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 max-w-[190px]">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 pr-1">Layers</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {[["thermal", "Thermal Grid"], ["ble", "BLE Mesh"], ["plenum", "Plenum Void"], ["heatmap", "Occupancy Heatmap"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border backdrop-blur-sm transition whitespace-nowrap ${
                layers[key] ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300" : "bg-slate-900/70 border-slate-800 text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[9px] uppercase tracking-wider text-slate-500 pr-1 mt-1.5">View Presets</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {Object.keys(VIEW_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border backdrop-blur-sm transition whitespace-nowrap ${
                presetName === name ? "bg-indigo-500/25 border-indigo-400/50 text-indigo-200" : "bg-slate-900/70 border-slate-800 text-slate-400"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* bottom-center: lighting scene controller */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 backdrop-blur-sm">
        {Object.keys(SCENES).map((s) => (
          <button
            key={s}
            onClick={() => setScene(s)}
            className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-medium transition ${
              scene === s ? "bg-indigo-500/25 text-indigo-200" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* micro inspection card for the selected device */}
      {selectedDevice && (
        <div className="absolute bottom-16 left-3 w-64 bg-slate-900/90 border rounded-lg p-3 backdrop-blur-sm" style={{ borderColor: CAT_COLORS[selectedDevice.cat] }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-slate-100">{selectedDevice.label}</span>
            <button onClick={() => setSelectedDevice(null)} className="text-slate-500 hover:text-slate-300 text-[11px]">✕</button>
          </div>
          {selectedDevice.detail.map((line, i) => (
            <div key={i} className="text-[10.5px] text-slate-400 font-mono">{line}</div>
          ))}
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[9.5px] text-slate-500">
            <span>Latency 12ms</span><span>Voltage 24.1V</span><span>Packet Loss 0%</span>
          </div>
        </div>
      )}
    </div>
  );
}
