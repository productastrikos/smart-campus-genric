import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  BUILDING GEOMETRY — mirrors the estate data model at building scale */
/* ------------------------------------------------------------------ */
const ROOM_W = 3.0, ROOM_D = 3.4, ROOM_H = 2.0, GAP = 0.02;
const WALL_T = 0.08, WALL_INSET = 0.05, DOOR_W = 0.9;
const COL = ROOM_W + GAP;
const CORR_D = 2.0, FF_CORR_D = 1.6;
const GF_ROW1_Z = ROOM_D + CORR_D;
const GF_DEPTH = GF_ROW1_Z + ROOM_D;
const FF_DEPTH = ROOM_D + FF_CORR_D;
const STORY_H = 3.5;
const GF_COLS = 5, FF_COLS = 4;
const GF_WIDTH = GF_COLS * COL - GAP;
const FF_WIDTH = FF_COLS * COL - GAP;
// every floor shares one footprint, like a real building — First Floor's rooms just don't fill all of it
const BUILDING_W = GF_WIDTH;
const BUILDING_D = GF_DEPTH;
const WALL_PAD = 0.5; // exterior wall setback from the outermost room face

function slot(room) {
  const isFF = room.floor === "First Floor";
  const z = isFF ? 0 : room.y === 0 ? 0 : GF_ROW1_Z;
  return { x: room.x * COL, y: isFF ? STORY_H : 0, z };
}
// which wall the door opens onto, so every room fronts directly onto the corridor it actually borders
function doorSide(room) {
  if (room.floor === "First Floor") return "south";
  return room.y === 0 ? "south" : "north";
}

function roomVisual(room) {
  if (room.status === "critical") return { color: "#ef4444", pulse: true, label: "CRITICAL" };
  if (room.status === "alert") return { color: "#f59e0b", pulse: true, label: "ANOMALY" };
  if (room.status === "vacant") return { color: "#10b981", pulse: false, label: "AVAILABLE" };
  if (room.type === "Hybrid") return { color: "#818cf8", pulse: false, label: "HYBRID ACTIVE" };
  return { color: "#22d3ee", pulse: false, label: "IN SESSION" };
}
const tempColor = (t) => (t < 21.5 ? "#38bdf8" : t < 23.5 ? "#10b981" : t < 25.5 ? "#f59e0b" : "#ef4444");
const powerColor = (kw) => (kw < 0.9 ? "#10b981" : kw < 1.4 ? "#f59e0b" : "#ef4444");

const VIEW_PRESETS = {
  "Estate Orbit": { pos: [16, 13, 20], target: [7, 2, 6] },
  "Top Down": { pos: [7.5, 26, 7], target: [7.5, 0, 5] },
  "Ground Floor": { pos: [9, 5, 14], target: [7.5, 1, 4.5] },
  "First Floor": { pos: [7, 9, 12], target: [6, STORY_H + 1, 2.5] },
};

/* ------------------------------------------------------------------ */
/*  WALLS — thin, lightly-glazed partitions with a real door opening   */
/* ------------------------------------------------------------------ */
function WallX({ x0, x1, z, y, height, color }) {
  const len = x1 - x0;
  if (len <= 0) return null;
  return (
    <mesh position={[(x0 + x1) / 2, y + height / 2, z]}>
      <boxGeometry args={[len, height, WALL_T]} />
      <meshPhysicalMaterial color={color} transparent opacity={0.16} roughness={0.25} metalness={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}
function WallZ({ z0, z1, x, y, height, color }) {
  const len = z1 - z0;
  if (len <= 0) return null;
  return (
    <mesh position={[x, y + height / 2, (z0 + z1) / 2]}>
      <boxGeometry args={[WALL_T, height, len]} />
      <meshPhysicalMaterial color={color} transparent opacity={0.16} roughness={0.25} metalness={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}
function DoorWallX({ x0, x1, z, y, height, color }) {
  const mid = (x0 + x1) / 2, half = DOOR_W / 2;
  return (
    <>
      <WallX x0={x0} x1={mid - half} z={z} y={y} height={height} color={color} />
      <WallX x0={mid + half} x1={x1} z={z} y={y} height={height} color={color} />
      <mesh position={[mid, y + 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[DOOR_W, WALL_T * 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ROOM — real walls + doorway, a status-tinted floor, simple desks   */
/* ------------------------------------------------------------------ */
function RoomBox({ room, selected, hovered, onSelect, onHover, layers, envMode, index }) {
  const { x, y, z } = slot(room);
  const vis = roomVisual(room);
  const floorRef = useRef();
  const groupRef = useRef();

  const temp = 19 + ((index * 1.7) % 8);
  const power = 0.5 + (room.occupied / room.capacity) * 1.35;
  let color = vis.color;
  let overlay = null;
  if (envMode === "Thermal/CO2 Comfort") { color = tempColor(temp); overlay = `${temp.toFixed(1)}°C`; }
  else if (envMode === "Power/Energy") { color = powerColor(power); overlay = `${power.toFixed(2)}kW`; }

  const wallColor = selected ? "#67e8f9" : color;
  const baseFloorOpacity = selected ? 0.5 : hovered ? 0.38 : 0.22;
  const dSide = doorSide(room);
  const x0 = WALL_INSET, x1 = ROOM_W - WALL_INSET, z0 = WALL_INSET, z1 = ROOM_D - WALL_INSET;

  const deskCols = [ROOM_W * 0.28, ROOM_W * 0.5, ROOM_W * 0.72];
  const deskRowsZ = [ROOM_D * 0.35, ROOM_D * 0.62];
  const occupiedDesks = Math.round((room.occupied / room.capacity) * 6);

  useFrame(({ clock }) => {
    if (vis.pulse && floorRef.current) {
      floorRef.current.opacity = baseFloorOpacity * (0.6 + Math.sin(clock.elapsedTime * (room.status === "critical" ? 3.2 : 1.8)) * 0.4);
    }
    if (groupRef.current) {
      const targetY = y + (hovered && !selected ? 0.1 : 0);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.15);
    }
  });

  return (
    <group ref={groupRef} position={[x, y, z]}>
      {/* status-tinted floor — the interactive surface for hover/click */}
      <mesh
        position={[ROOM_W / 2, 0.02, ROOM_D / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(room.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = "auto"; }}
      >
        <planeGeometry args={[ROOM_W - WALL_INSET * 2, ROOM_D - WALL_INSET * 2]} />
        <meshBasicMaterial ref={floorRef} color={color} transparent opacity={baseFloorOpacity} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* four walls, one with a real doorway onto the corridor it fronts */}
      {dSide === "north"
        ? <DoorWallX x0={x0} x1={x1} z={z0} y={0} height={ROOM_H} color={wallColor} />
        : <WallX x0={x0} x1={x1} z={z0} y={0} height={ROOM_H} color={wallColor} />}
      {dSide === "south"
        ? <DoorWallX x0={x0} x1={x1} z={z1} y={0} height={ROOM_H} color={wallColor} />
        : <WallX x0={x0} x1={x1} z={z1} y={0} height={ROOM_H} color={wallColor} />}
      <WallZ z0={z0} z1={z1} x={x0} y={0} height={ROOM_H} color={wallColor} />
      <WallZ z0={z0} z1={z1} x={x1} y={0} height={ROOM_H} color={wallColor} />

      {/* simple desk rows — enough to read as a classroom, not an empty cell */}
      {deskRowsZ.map((dz, ri) =>
        deskCols.map((dx, ci) => {
          const idx = ri * deskCols.length + ci;
          const occ = idx < occupiedDesks;
          return (
            <mesh key={`${ri}-${ci}`} position={[dx, 0.28, dz]}>
              <boxGeometry args={[0.42, 0.05, 0.3]} />
              <meshStandardMaterial color={occ ? "#22d3ee" : "#475569"} roughness={0.55} emissive={occ ? "#0891b2" : "#000000"} emissiveIntensity={occ ? 0.3 : 0} />
            </mesh>
          );
        })
      )}

      {/* status beacon above the room */}
      <mesh position={[ROOM_W / 2, ROOM_H + 0.15, ROOM_D / 2]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {layers.rpc && (
        <mesh position={[ROOM_W * 0.25, ROOM_H - 0.1, ROOM_D * 0.25]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color="#38bdf8" toneMapped={false} />
        </mesh>
      )}
      {layers.iot && (
        <mesh position={[ROOM_W * 0.7, ROOM_H - 0.1, ROOM_D * 0.3]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color="#10b981" toneMapped={false} />
        </mesh>
      )}
      {layers.ble && (
        <mesh position={[ROOM_W * 0.5, ROOM_H - 0.1, ROOM_D * 0.7]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#a78bfa" toneMapped={false} />
        </mesh>
      )}

      <Html position={[ROOM_W / 2, ROOM_H + 0.5, ROOM_D / 2]} center distanceFactor={16} occlude={false} zIndexRange={[5, 0]}>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}
          onMouseEnter={() => onHover(room.id)}
          onMouseLeave={() => onHover(null)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap backdrop-blur-sm transition"
          style={{ background: selected ? `${color}33` : "rgba(11,17,30,0.75)", border: `1px solid ${color}`, color: "#e2e8f0" }}
        >
          <span className="font-mono font-bold" style={{ color }}>{room.id}</span>
          <span className="text-slate-400">{overlay || `${room.occupied}/${room.capacity}`}</span>
        </button>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  FLOOR SHELL — slab, glass envelope, corridor, IDF closet            */
/* ------------------------------------------------------------------ */
// one exterior glazed wall panel with a real mullion grid — a facade, not just a wireframe box
function CurtainWall({ from, to, y, height, color = "#38bdf8" }) {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const cx = (from[0] + to[0]) / 2, cz = (from[1] + to[1]) / 2;
  const angle = Math.atan2(dz, dx);
  const bays = Math.max(2, Math.round(len / 1.3));

  return (
    <group position={[cx, y, cz]} rotation={[0, -angle, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[len, height]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.16} roughness={0.15} metalness={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* vertical mullions */}
      {Array.from({ length: bays - 1 }, (_, i) => ((i + 1) / bays - 0.5) * len).map((lx, i) => (
        <mesh key={i} position={[lx, height / 2, 0]}>
          <boxGeometry args={[0.035, height, 0.035]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} toneMapped={false} />
        </mesh>
      ))}
      {/* floor-band mullions */}
      {[0.34, 0.67].map((t, i) => (
        <mesh key={i} position={[0, height * t, 0]}>
          <boxGeometry args={[len, 0.035, 0.035]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      ))}
      {/* base + roofline */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[len, 0.05, 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[len, 0.06, 0.06]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

// the four exterior walls enclosing one floor's full footprint
function Facade({ width, depth, y, height, color = "#38bdf8" }) {
  const nw = [-WALL_PAD, -WALL_PAD], ne = [width + WALL_PAD, -WALL_PAD];
  const se = [width + WALL_PAD, depth + WALL_PAD], sw = [-WALL_PAD, depth + WALL_PAD];
  return (
    <>
      <CurtainWall from={nw} to={ne} y={y} height={height} color={color} />
      <CurtainWall from={ne} to={se} y={y} height={height} color={color} />
      <CurtainWall from={se} to={sw} y={y} height={height} color={color} />
      <CurtainWall from={sw} to={nw} y={y} height={height} color={color} />
    </>
  );
}

function Corridor({ width, z0, z1, y = 0, entrance }) {
  const depth = z1 - z0;
  return (
    <group position={[width / 2, y + 0.01, z0 + depth / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0d1728" roughness={0.85} />
      </mesh>
      <Line points={[[-width / 2, 0.005, 0], [width / 2, 0.005, 0]]} color="#fbbf24" opacity={0.5} transparent dashed dashSize={0.35} gapSize={0.25} />
      {entrance && (
        <Html position={[-width / 2 + 0.3, 0.3, 0]} center distanceFactor={16} occlude={false}>
          <div className="px-2 py-1 rounded text-[9px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-400/50 whitespace-nowrap tracking-wide">
            ENTRANCE
          </div>
        </Html>
      )}
    </group>
  );
}

function IdfCloset({ x, z, y = 0, label }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0.4, 0.55, 0.4]}>
        <boxGeometry args={[0.8, 1.1, 0.8]} />
        <meshStandardMaterial color="#7c3aed" transparent opacity={0.35} emissive="#7c3aed" emissiveIntensity={0.3} />
      </mesh>
      <Html position={[0.4, 1.3, 0.4]} center distanceFactor={16} occlude={false}>
        <div className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-violet-200 bg-violet-950/70 border border-violet-400/50 whitespace-nowrap">{label}</div>
      </Html>
    </group>
  );
}

function StairCore({ x, z, height, y = 0 }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0.5, height / 2, 0.5]}>
        <boxGeometry args={[1.0, height, 1.0]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.75} />
      </mesh>
      <Html position={[0.5, -0.3, 0.5]} center distanceFactor={16} occlude={false}>
        <div className="px-1.5 py-0.5 rounded text-[9px] text-slate-300 bg-slate-900/70 border border-slate-600 whitespace-nowrap">STAIR / LIFT</div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  LIGHTING + CAMERA RIG                                              */
/* ------------------------------------------------------------------ */
function Lighting() {
  return (
    <>
      <hemisphereLight args={["#a9d4f5", "#0b1220", 0.9]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 16, 8]} intensity={0.8} color="#eaf3ff" />
      <pointLight position={[GF_WIDTH / 2, STORY_H + 3, GF_DEPTH / 2]} intensity={0.5} color="#dbeafe" distance={30} decay={1.4} />
    </>
  );
}

function PresetDriver({ target, controlsRef }) {
  useFrame(({ camera }) => {
    if (!target || !controlsRef.current) return;
    camera.position.lerp(new THREE.Vector3(...target.pos), 0.07);
    controlsRef.current.target.lerp(new THREE.Vector3(...target.target), 0.07);
    controlsRef.current.update();
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  SCENE                                                               */
/* ------------------------------------------------------------------ */
function EstateScene({ rooms, layers, envMode, selectedId, hoveredId, setHoveredId, onSelect, presetTarget, controlsRef }) {
  const gfRooms = rooms.filter((r) => r.floor === "Ground Floor");
  const ffRooms = rooms.filter((r) => r.floor === "First Floor");

  return (
    <group>
      <Lighting />
      <PresetDriver target={presetTarget} controlsRef={controlsRef} />

      {/* Ground Floor */}
      <mesh position={[BUILDING_W / 2, -0.01, BUILDING_D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BUILDING_W + WALL_PAD * 2, BUILDING_D + WALL_PAD * 2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>
      {layers.buildings && <Facade width={BUILDING_W} depth={BUILDING_D} y={0} height={STORY_H - 0.25} />}
      <Corridor width={BUILDING_W} z0={ROOM_D} z1={GF_ROW1_Z} entrance />
      <IdfCloset x={GF_WIDTH + 0.3} z={ROOM_D + 0.2} label="IDF-01" />
      {gfRooms.map((r, i) => (
        <RoomBox key={r.id} room={r} index={i} selected={r.id === selectedId} hovered={r.id === hoveredId} onSelect={onSelect} onHover={setHoveredId} layers={layers} envMode={envMode} />
      ))}

      {/* First Floor — same footprint as Ground Floor, so the building reads as one consistent volume */}
      <mesh position={[BUILDING_W / 2, STORY_H - 0.01, BUILDING_D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BUILDING_W + WALL_PAD * 2, BUILDING_D + WALL_PAD * 2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>
      {layers.buildings && <Facade width={BUILDING_W} depth={BUILDING_D} y={STORY_H} height={STORY_H - 0.45} />}
      <Corridor width={BUILDING_W} z0={ROOM_D} z1={FF_DEPTH} y={STORY_H} />
      <IdfCloset x={FF_WIDTH + 0.3} z={0.2} y={STORY_H} label="IDF-02" />
      {ffRooms.map((r, i) => (
        <RoomBox key={r.id} room={r} index={i + 10} selected={r.id === selectedId} hovered={r.id === hoveredId} onSelect={onSelect} onHover={setHoveredId} layers={layers} envMode={envMode} />
      ))}

      <StairCore x={-1.6} z={ROOM_D + CORR_D / 2 - 0.5} height={STORY_H + STORY_H - 0.3} />

      {layers.idf && rooms.map((r) => {
        const { x, y, z } = slot(r);
        const cx = x + ROOM_W / 2, cz = z + ROOM_D / 2;
        const isFF = r.floor === "First Floor";
        const idfPt = isFF ? [FF_WIDTH + 0.7, STORY_H + 0.55, 0.6] : [GF_WIDTH + 0.7, 0.55, ROOM_D + 0.6];
        return (
          <Line key={`idf-${r.id}`} points={[[cx, y + ROOM_H, cz], idfPt]} color="#7c3aed" opacity={0.35} transparent dashed dashSize={0.2} gapSize={0.15} lineWidth={1} />
        );
      })}

      {layers.cctv && (
        <>
          <mesh position={[GF_WIDTH * 0.2, 0.3, -0.4]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#10b981" toneMapped={false} /></mesh>
          <mesh position={[GF_WIDTH * 0.8, 0.3, GF_DEPTH + 0.4]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#f59e0b" toneMapped={false} /></mesh>
        </>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  EXPORTED WRAPPER                                                   */
/* ------------------------------------------------------------------ */
export default function EstateDigitalTwin3D({ rooms, layers, envMode, selectedId, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [presetName, setPresetName] = useState("Estate Orbit");
  const [presetTarget, setPresetTarget] = useState(null);
  const controlsRef = useRef();

  const applyPreset = (name) => { setPresetName(name); setPresetTarget(VIEW_PRESETS[name]); };

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden bg-[#050810]">
      <Canvas shadows camera={{ fov: 45, position: VIEW_PRESETS["Estate Orbit"].pos, near: 0.1, far: 100 }}>
        <fog attach="fog" args={["#050810", 22, 46]} />
        <EstateScene
          rooms={rooms} layers={layers} envMode={envMode} selectedId={selectedId}
          hoveredId={hoveredId} setHoveredId={setHoveredId} onSelect={onSelect}
          presetTarget={presetTarget} controlsRef={controlsRef}
        />
        <OrbitControls
          ref={controlsRef}
          target={VIEW_PRESETS["Estate Orbit"].target}
          minPolarAngle={0.15}
          maxPolarAngle={1.45}
          minDistance={6}
          maxDistance={45}
          enableDamping
          dampingFactor={0.08}
          onStart={() => setPresetTarget(null)}
        />
      </Canvas>

      {/* view presets */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 backdrop-blur-sm">
        {Object.keys(VIEW_PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => applyPreset(name)}
            className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-medium transition ${
              presetName === name ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="absolute top-3 left-3 text-[10px] text-slate-500 bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
        Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
}
