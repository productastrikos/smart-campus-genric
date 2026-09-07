import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Sparkles, Bell, Sun, Moon, User, ChevronDown, ChevronRight, X, ArrowLeft,
  Box, Layers, Thermometer, Zap, Wifi, Camera, Radio, DoorOpen, QrCode,
  Users, Fingerprint, Bluetooth, AlertTriangle, CheckCircle2, Activity,
  Cpu, Server, Lightbulb, SlidersHorizontal, Power, MonitorSmartphone,
  PenTool, Network, Gauge, Clock, MapPin, Video, MessageSquare, Building2,
  Wind, Volume2, ShieldCheck, RefreshCw, LayoutGrid, Eye, Antenna, Send,
  Mail, Phone, UserCheck, UserX, PhoneForwarded, ClipboardCheck, TimerReset,
} from "lucide-react";
import RoomDigitalTwin3D from "./RoomDigitalTwin3D";
import EstateDigitalTwin3D from "./EstateDigitalTwin3D";

/* ------------------------------------------------------------------ */
/*  DATA MODEL                                                         */
/* ------------------------------------------------------------------ */

const STATUS_STYLES = {
  "in-session": { color: "#06b6d4", label: "In Session", ring: "ring-cyan-400/60" },
  vacant: { color: "#10b981", label: "Vacant · Ready", ring: "ring-emerald-400/40" },
  alert: { color: "#f59e0b", label: "Anomaly Flagged", ring: "ring-amber-400/60" },
  critical: { color: "#ef4444", label: "Critical Fault", ring: "ring-red-400/60" },
};

// 14 physical rooms => 18 instances (4 Standard, 6 Hybrid, 4 Modular-split x2)
const ROOMS = [
  { id: "D-GF-01", floor: "Ground Floor", type: "Standard", capacity: 40, occupied: 36, status: "in-session", x: 0, y: 0, course: "ENG 101", idf: "IDF-01", instructor: "Dr. Fatima Al Zaabi", instructorEmail: "fatima.alzaabi@astrikos.edu", instructorPhone: "+971 50 111 2201" },
  { id: "D-GF-02", floor: "Ground Floor", type: "Standard", capacity: 40, occupied: 0, status: "vacant", x: 1, y: 0, course: "", idf: "IDF-01", instructor: "", instructorEmail: "", instructorPhone: "" },
  { id: "D-GF-03", floor: "Ground Floor", type: "Standard", capacity: 40, occupied: 32, status: "alert", x: 2, y: 0, course: "CSC 340", idf: "IDF-01", instructor: "Dr. Ahmed Al Mansoori", instructorEmail: "ahmed.almansoori@astrikos.edu", instructorPhone: "+971 50 111 2203" },
  { id: "D-GF-04", floor: "Ground Floor", type: "Standard", capacity: 40, occupied: 28, status: "in-session", x: 3, y: 0, course: "PHY 210", idf: "IDF-01", instructor: "Dr. Omar Al Suwaidi", instructorEmail: "omar.alsuwaidi@astrikos.edu", instructorPhone: "+971 50 111 2204" },
  { id: "D-GF-05", floor: "Ground Floor", type: "Hybrid", capacity: 45, occupied: 30, status: "in-session", x: 4, y: 0, course: "BUS 220", idf: "IDF-01", instructor: "Dr. Layla Hassan", instructorEmail: "layla.hassan@astrikos.edu", instructorPhone: "+971 50 111 2205" },
  { id: "D-GF-06", floor: "Ground Floor", type: "Hybrid", capacity: 45, occupied: 0, status: "vacant", x: 0, y: 1, course: "", idf: "IDF-01", instructor: "", instructorEmail: "", instructorPhone: "" },
  { id: "D-GF-07", floor: "Ground Floor", type: "Hybrid", capacity: 45, occupied: 41, status: "critical", x: 1, y: 1, course: "CHE 150", idf: "IDF-01", instructor: "Dr. Khalid Al Marzooqi", instructorEmail: "khalid.almarzooqi@astrikos.edu", instructorPhone: "+971 50 111 2207" },
  { id: "D-GF-08", floor: "Ground Floor", type: "Hybrid", capacity: 45, occupied: 22, status: "in-session", x: 2, y: 1, course: "ART 105", idf: "IDF-01", instructor: "Prof. Noura Al Shamsi", instructorEmail: "noura.alshamsi@astrikos.edu", instructorPhone: "+971 50 111 2208" },
  { id: "D-GF-09", floor: "Ground Floor", type: "Hybrid", capacity: 45, occupied: 19, status: "in-session", x: 3, y: 1, course: "HIS 230", idf: "IDF-01", instructor: "Dr. Sara Haddad", instructorEmail: "sara.haddad@astrikos.edu", instructorPhone: "+971 50 111 2209" },
  { id: "D-GF-10", floor: "Ground Floor", type: "Hybrid", capacity: 45, occupied: 33, status: "in-session", x: 4, y: 1, course: "MTH 310", idf: "IDF-01", instructor: "Dr. Yousef Al Blooshi", instructorEmail: "yousef.alblooshi@astrikos.edu", instructorPhone: "+971 50 111 2210" },
  { id: "D-FF-01", floor: "First Floor", type: "Modular", capacity: 60, occupied: 24, status: "in-session", x: 0, y: 2, split: ["A", "B"], course: "BIO 240", idf: "IDF-02", instructor: "Dr. Mariam Al Nuaimi", instructorEmail: "mariam.alnuaimi@astrikos.edu", instructorPhone: "+971 50 111 2211" },
  { id: "D-FF-02", floor: "First Floor", type: "Modular", capacity: 60, occupied: 0, status: "vacant", x: 1, y: 2, split: ["A", "B"], course: "", idf: "IDF-02", instructor: "", instructorEmail: "", instructorPhone: "" },
  { id: "D-FF-03", floor: "First Floor", type: "Modular", capacity: 60, occupied: 47, status: "in-session", x: 2, y: 2, split: ["A", "B"], course: "ECO 110", idf: "IDF-02", instructor: "Dr. Hamdan Al Falasi", instructorEmail: "hamdan.alfalasi@astrikos.edu", instructorPhone: "+971 50 111 2213" },
  { id: "D-FF-04", floor: "First Floor", type: "Modular", capacity: 60, occupied: 18, status: "in-session", x: 3, y: 2, split: ["A", "B"], course: "PSY 200", idf: "IDF-02", instructor: "Dr. Aisha Al Kaabi", instructorEmail: "aisha.alkaabi@astrikos.edu", instructorPhone: "+971 50 111 2214" },
];

const INSTANCE_COUNT = ROOMS.reduce((n, r) => n + (r.split ? r.split.length : 1), 0); // => 18

/* ------------------------------------------------------------------ */
/*  ESTATE-WIDE KPIs — leadership overview                             */
/* ------------------------------------------------------------------ */
function computeEstateKPIs(rooms) {
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const totalOccupied = rooms.reduce((s, r) => s + r.occupied, 0);
  const liveRooms = rooms.filter((r) => r.status !== "vacant");
  const vacantRooms = rooms.filter((r) => r.status === "vacant");
  const hybridActiveRooms = rooms.filter((r) => r.type === "Hybrid" && r.status === "in-session");
  const anomalyRooms = rooms.filter((r) => r.status === "alert");
  const criticalRooms = rooms.filter((r) => r.status === "critical");
  const roomPower = (r) => (r.status === "vacant" ? 0.12 : 0.55 + (r.occupied / r.capacity) * 1.35);
  const totalPowerKw = rooms.reduce((s, r) => s + roomPower(r), 0);
  return {
    utilizationPct: Math.round((totalOccupied / totalCapacity) * 100),
    totalCapacity, totalOccupied,
    liveRooms, vacantRooms, hybridActiveRooms, anomalyRooms, criticalRooms,
    totalPowerKw, roomPower,
  };
}
const ESTATE_STATS = computeEstateKPIs(ROOMS);

const KPI_DEFS = [
  { id: "utilization", label: "Estate Utilization", icon: Users, color: "#22d3ee", value: `${ESTATE_STATS.utilizationPct}%`, sub: `${ESTATE_STATS.totalOccupied}/${ESTATE_STATS.totalCapacity} seats live` },
  { id: "live", label: "Live Classrooms", icon: Activity, color: "#22d3ee", value: `${ESTATE_STATS.liveRooms.length}/14`, sub: `${ESTATE_STATS.vacantRooms.length} available now` },
  { id: "hybrid", label: "Hybrid Sessions", icon: Video, color: "#818cf8", value: `${ESTATE_STATS.hybridActiveRooms.length}`, sub: "Auto-bridged via S!aP" },
  { id: "anomalies", label: "Attendance Anomalies", icon: AlertTriangle, color: "#f59e0b", value: `${ESTATE_STATS.anomalyRooms.length}`, sub: ESTATE_STATS.anomalyRooms.length ? ESTATE_STATS.anomalyRooms.map((r) => r.id).join(", ") : "None flagged" },
  { id: "critical", label: "Critical Faults", icon: Zap, color: "#ef4444", value: `${ESTATE_STATS.criticalRooms.length}`, sub: ESTATE_STATS.criticalRooms.length ? ESTATE_STATS.criticalRooms.map((r) => r.id).join(", ") : "None open" },
  { id: "power", label: "Estate Power Draw", icon: Gauge, color: "#10b981", value: `${ESTATE_STATS.totalPowerKw.toFixed(1)} kW`, sub: "Real-time · RP-C reported" },
];

const LIGHTING_SCENES = ["Lecture", "Presentation / Dim", "Exam", "All Off"];
const BLIND_POSITIONS = ["Open", "75%", "Closed"];

const VLANS = [
  { id: 10, label: "AV", color: "#38bdf8" },
  { id: 20, label: "Control (BACnet/IP)", color: "#7c3aed" },
  { id: 30, label: "Data", color: "#10b981" },
  { id: 40, label: "QoS", color: "#f59e0b" },
];
const PORT_MAP = [10, 10, 20, 20, 30, 30, 40, 10];

const CAT_COLORS = { control: "#38bdf8", sensor: "#10b981", actuator: "#f59e0b", av: "#a78bfa" };
const CAT_LABELS = { control: "Network & Access", sensor: "Sensors", actuator: "Actuators", av: "AV & Display" };
const EQUIPMENT_PINS = [
  { n: 1, label: "RP-C Room Controller", cat: "control", u: 0.08, v: 0.10, lift: 204, detail: ["BACnet/IP · Edge Synced", "CPU 24% · Uplink OK"] },
  { n: 2, label: "8-Port PoE Switch", cat: "control", u: 0.08, v: 0.20, lift: 194, detail: ["8/8 Ports Linked", "VLAN 10/20/30/40"] },
  { n: 3, label: "Biometric Door Scanner", cat: "control", u: 0.90, v: 0.92, lift: 42, detail: ["32 Registered Scans", "Contactless · Active"] },
  { n: 4, label: "Entrance Signage Display", cat: "control", u: 0.78, v: 0.98, lift: 92, detail: ["CSC 340 · 10:00–11:15", "بنية البيانات"] },
  { n: 5, label: "Insight-Sensor (Ceiling Void)", cat: "sensor", u: 0.48, v: 0.42, lift: 212, detail: ["32 People · 36 BLE Badges", "480 Lux · 54 dB"] },
  { n: 6, label: "SXW Sensor (Side Wall)", cat: "sensor", u: 0.90, v: 0.32, lift: 100, detail: ["21.8°C · Setpoint 22.0°C", "640 ppm CO₂ · 48% RH"] },
  { n: 7, label: "BLE Receiver", cat: "sensor", u: 0.55, v: 0.34, lift: 208, detail: ["36 Cards Active", "Paired to Insight-Sensor"] },
  { n: 8, label: "Motorized Blinds Actuator", cat: "actuator", u: 0.93, v: 0.30, lift: 178, detail: ["Position: 75% Open", "Relay · Ready"] },
  { n: 9, label: "HVAC 0–10V Actuator", cat: "actuator", u: 0.66, v: 0.66, lift: 155, detail: ["Fan Speed 55%", "0–10V · Modulating"] },
  { n: 10, label: "Lighting Scene Controller", cat: "actuator", u: 0.30, v: 0.55, lift: 206, detail: ["Scene: Lecture", "4 Zones · DALI"] },
  { n: 11, label: "ADU Display — IdeaHub 86\"", cat: "av", u: 0.20, v: 0.08, lift: 150, detail: ["Teams Rooms · Live Slide", "Power: ON"] },
  { n: 12, label: "Digital Writing Board", cat: "av", u: 0.35, v: 0.10, lift: 96, detail: ["Connected · Synced", "Cloud Save Active"] },
  { n: 13, label: "Lecture-Capture Camera", cat: "av", u: 0.08, v: 0.30, lift: 186, detail: ["Teacher Track · Active", "1080p60 · Auto-Frame"] },
  { n: 14, label: "Ceiling Speaker / Mic Array", cat: "av", u: 0.70, v: 0.15, lift: 176, detail: ["Beamforming · 4 Mics", "Echo Cancel: ON"] },
];

const AUTOMATION_LOG = [
  { t: "10:00:00", text: "S!aP detected faculty off-site via Lenel badge event." },
  { t: "10:00:02", text: "Teams Rooms session auto-launched on Huawei IdeaHub 86\" screen." },
  { t: "10:00:03", text: "Teacher and student lecture-capture tracking cameras activated." },
  { t: "10:00:04", text: "Entrance signage updated to: \"Hybrid — Instructor Joining Remotely\"." },
];

/* ------------------------------------------------------------------ */
/*  SMALL UI PRIMITIVES                                                */
/* ------------------------------------------------------------------ */

function Panel({ className = "", children }) {
  return (
    <div className={`bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-2xl rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function StatusDot({ status, pulse = true }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.vacant;
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ backgroundColor: s.color }}
        />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: s.color }} />
    </span>
  );
}

function Badge({ children, tone = "cyan", className = "" }) {
  const tones = {
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-400/30",
    purple: "bg-indigo-500/10 text-indigo-300 border-indigo-400/30",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
    amber: "bg-amber-500/10 text-amber-300 border-amber-400/30",
    red: "bg-red-500/10 text-red-300 border-red-400/30",
    slate: "bg-slate-500/10 text-slate-300 border-slate-400/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
      {Icon && <Icon size={13} className="text-cyan-400" />}
      {children}
    </div>
  );
}

function Metric({ label, value, unit, tone = "text-slate-100" }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className={`font-mono text-sm ${tone}`}>
        {value}
        {unit && <span className="text-slate-500 text-xs ml-1">{unit}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HEADER                                                             */
/* ------------------------------------------------------------------ */

function TopHeader({ darkMode, setDarkMode, now }) {
  const gst = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Dubai",
  });
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-[#0b111e]/90 backdrop-blur-md sticky top-0 z-30">
      <div>
        <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
          <span>Campus Digital Twin</span>
          <ChevronRight size={13} className="text-slate-600" />
          <span>Academic Block D</span>
          <ChevronRight size={13} className="text-slate-600" />
          <span className="text-cyan-300 font-medium">Smart Classrooms (UIIC)</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Master Systems Integrator — Governed exchange backbone
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <Clock size={12} className="text-cyan-400" />
          {gst} GST
        </div>

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition">
          <Sparkles size={14} />
          AI Advisory
          <span className="bg-indigo-400/20 rounded-full px-1.5 text-[10px]">7</span>
        </button>

        <button
          onClick={() => setDarkMode((d) => !d)}
          className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/40 transition"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button className="relative p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/40 transition">
          <Bell size={15} />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
          Super Admin
        </span>

        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-slate-950">
          <User size={15} />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  AI ADVISORY BANNER                                                 */
/* ------------------------------------------------------------------ */

function AdvisoryBanner({ open, setOpen }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4 px-6 py-2.5 bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-slate-900/60 border-b border-indigo-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[11px] font-semibold shrink-0">
            <Sparkles size={12} /> AI ADVISORY
          </span>
          <p className="text-[12.5px] text-slate-300 truncate">
            <span className="text-cyan-300 font-medium">{INSTANCE_COUNT} classroom instances</span> live via S!aP ·{" "}
            <span className="text-indigo-300 font-medium">1 Hybrid session</span> running (Teams auto-bridged) ·{" "}
            <span className="text-amber-300 font-medium">1 attendance integrity anomaly</span> flagged in D-GF-03.
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-[12px] text-slate-300 hover:text-cyan-300 shrink-0 border border-slate-700 hover:border-cyan-400/40 rounded-lg px-2.5 py-1 transition"
        >
          7 advisories <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="absolute right-6 top-full mt-1 w-96 z-40">
          <Panel className="p-3 space-y-2">
            {[
              { tone: "amber", text: "D-GF-03: 4 BLE cards active without presence increment — possible proxy attendance." },
              { tone: "purple", text: "D-GF-03: Instructor off-site — auto-hybrid bridging engaged for CSC 340." },
              { tone: "red", text: "D-GF-07: HVAC actuator fault — CO₂ trending above comfort threshold." },
              { tone: "cyan", text: "IDF-01: PoE budget at 78% utilization across 8-port switch." },
              { tone: "slate", text: "D-FF-02: Room vacant 45+ min — setback energy mode recommended." },
              { tone: "emerald", text: "Oracle PeopleSoft sync healthy — audit hash verified 09:58 GST." },
              { tone: "cyan", text: "BLE tag drift detected near D-GF-05 corridor — recalibration suggested." },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: { amber: "#f59e0b", purple: "#7c3aed", red: "#ef4444", cyan: "#06b6d4", slate: "#64748b", emerald: "#10b981" }[a.tone] }} />
                {a.text}
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI STRIP — estate-wide leadership overview                        */
/* ------------------------------------------------------------------ */

function KPIStrip({ selectedKPI, onSelect }) {
  return (
    <div className="px-4 md:px-5 pt-4 shrink-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_DEFS.map((k) => {
          const active = selectedKPI === k.id;
          return (
            <button
              key={k.id}
              onClick={() => onSelect(k.id)}
              className="text-left rounded-xl border p-3 transition bg-slate-900/70 hover:border-slate-700"
              style={{
                borderColor: active ? k.color : "rgba(30,41,59,0.8)",
                backgroundColor: active ? `${k.color}14` : undefined,
                boxShadow: active ? `0 0 0 1px ${k.color}55` : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg" style={{ backgroundColor: `${k.color}1f`, color: k.color }}>
                  <k.icon size={14} />
                </span>
                <ChevronRight size={13} className="text-slate-600" />
              </div>
              <div className="font-mono text-xl font-semibold text-slate-100 leading-none">{k.value}</div>
              <div className="text-[10.5px] text-slate-400 mt-1.5 truncate">{k.label}</div>
              <div className="text-[9.5px] text-slate-600 mt-0.5 truncate">{k.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI DETAIL PANEL — explanation + AI recommendations                */
/* ------------------------------------------------------------------ */

function KPIRoomRow({ label, value, tone = "text-slate-300", room, onViewRoom }) {
  return (
    <button
      onClick={() => room && onViewRoom(room.id)}
      disabled={!room}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/70 text-left transition ${room ? "hover:border-cyan-400/40 cursor-pointer" : "cursor-default"}`}
    >
      <span className="text-[11.5px] text-slate-300">{label}</span>
      <span className={`text-[11px] font-mono ${tone} flex items-center gap-1`}>
        {value}
        {room && <ChevronRight size={12} className="text-slate-600" />}
      </span>
    </button>
  );
}

function getKPIContent(id) {
  const s = ESTATE_STATS;
  switch (id) {
    case "utilization": {
      const sorted = [...ROOMS].sort((a, b) => b.occupied / b.capacity - a.occupied / a.capacity);
      return {
        title: "Estate Utilization", icon: Users, color: "#22d3ee",
        value: `${s.utilizationPct}%`, badge: `${s.totalOccupied}/${s.totalCapacity} seats`,
        explanation: "Live seat occupancy across all 14 classrooms in Academic Block D (18 scheduled instances), calculated as occupied seats ÷ total capacity. Sourced from Insight-Sensor accurate people-count, cross-verified against biometric door scans.",
        breakdownLabel: "By classroom",
        breakdown: sorted.map((r) => ({ label: `${r.id} · ${r.course || "No course scheduled"}`, value: `${r.occupied}/${r.capacity} (${Math.round((r.occupied / r.capacity) * 100)}%)`, tone: r.occupied === 0 ? "text-slate-500" : "text-cyan-300", room: r })),
        recommendations: [
          s.vacantRooms.length > 0 && `${s.vacantRooms.length} room${s.vacantRooms.length > 1 ? "s are" : " is"} currently vacant (${s.vacantRooms.map((r) => r.id).join(", ")}). Enable eco setback to cut standby energy draw until the next scheduled block.`,
          sorted[0] && sorted[0].occupied / sorted[0].capacity > 0.85 && `${sorted[0].id} is running at ${Math.round((sorted[0].occupied / sorted[0].capacity) * 100)}% capacity — consider wayfinding signage toward nearby available rooms for walk-in students.`,
          "Utilization below 50% for two consecutive terms is typically the threshold Estates teams use to justify room decommission or repurposing.",
        ].filter(Boolean),
      };
    }
    case "live": {
      return {
        title: "Live Classrooms", icon: Activity, color: "#22d3ee",
        value: `${s.liveRooms.length}/14`, badge: `${s.vacantRooms.length} available`,
        explanation: "Classrooms currently hosting an active session — Standard, Hybrid, or Modular — detected via RP-C edge state and Insight-Sensor motion, independent of the timetable.",
        breakdownLabel: "Available now",
        breakdown: s.vacantRooms.length
          ? s.vacantRooms.map((r) => ({ label: `${r.id} · ${r.type}`, value: `${r.capacity} seats free`, tone: "text-emerald-300", room: r }))
          : [{ label: "No vacant rooms", value: "100% booked", tone: "text-slate-500", room: null }],
        recommendations: [
          s.vacantRooms.length > 0 && `${s.vacantRooms.map((r) => r.id).join(", ")} ${s.vacantRooms.length > 1 ? "are" : "is"} free this block — route overflow bookings or walk-in office hours there instead of opening a new room.`,
          "Cross-reference with Blackboard Ultra scheduling to confirm these rooms aren't booked but simply running late — Insight-Sensor motion typically lags a true no-show by 2–3 minutes.",
        ].filter(Boolean),
      };
    }
    case "hybrid": {
      return {
        title: "Hybrid Sessions Active", icon: Video, color: "#818cf8",
        value: `${s.hybridActiveRooms.length}`, badge: "Teams auto-bridged",
        explanation: "Sessions where S!aP detected the instructor off-site via Lenel badge event and auto-bridged Teams Rooms on the classroom's IdeaHub display, without manual AV setup.",
        breakdownLabel: "Active bridges",
        breakdown: s.hybridActiveRooms.length
          ? s.hybridActiveRooms.map((r) => ({ label: `${r.id} · ${r.course || "Untitled session"}`, value: `${r.occupied} on-site`, tone: "text-indigo-300", room: r }))
          : [{ label: "No hybrid bridges active", value: "—", tone: "text-slate-500", room: null }],
        recommendations: [
          s.hybridActiveRooms.length > 0 && "Confirm lecture-capture camera auto-framing is centered on the active teaching zone for each bridge — misframing is the top hybrid-session complaint in post-class surveys.",
          "VLAN 10 (AV) carries all Teams Rooms traffic — monitor for congestion if hybrid session count rises during peak hours.",
        ].filter(Boolean),
      };
    }
    case "anomalies": {
      const room = s.anomalyRooms[0];
      return {
        title: "Attendance Anomalies", icon: AlertTriangle, color: "#f59e0b",
        value: `${s.anomalyRooms.length}`, badge: room ? room.id : "Clear",
        explanation: "Glass Box AI cross-checks three independent identity signals — biometric door scans, Insight-Sensor optical people-count, and BLE badge detections — and flags discrepancies as potential proxy attendance or card-sharing.",
        breakdownLabel: "Flagged detail",
        breakdown: room
          ? [
              { label: "Biometric door scans", value: "32 registered", tone: "text-slate-300", room: null },
              { label: "Optical people-count", value: "32 present", tone: "text-slate-300", room: null },
              { label: "BLE badges detected", value: "36 active", tone: "text-amber-300", room: null },
              { label: `View ${room.id} full record`, value: "", tone: "text-cyan-300", room },
            ]
          : [{ label: "No anomalies flagged", value: "—", tone: "text-slate-500", room: null }],
        recommendations: room
          ? [
              "4 BLE badges detected without a matching optical or biometric increment — consistent with a card left behind or shared between students.",
              `Notify ${room.id}'s instructor before the next session and flag the affected student IDs for registrar review.`,
              "Cross-check against the Oracle PeopleSoft audit hash to confirm the authoritative attendance record before any grade or eligibility action.",
            ]
          : ["No attendance integrity issues detected across the estate in the current session window."],
      };
    }
    case "critical": {
      const room = s.criticalRooms[0];
      return {
        title: "Critical Faults", icon: Zap, color: "#ef4444",
        value: `${s.criticalRooms.length}`, badge: room ? room.id : "Clear",
        explanation: "Hardware or environmental faults requiring facilities dispatch — typically an HVAC actuator, an offline sensor, or a PoE port failure on the room's edge switch.",
        breakdownLabel: "Fault detail",
        breakdown: room
          ? [
              { label: "Fault type", value: "HVAC actuator", tone: "text-red-300", room: null },
              { label: "Occupancy at fault time", value: `${room.occupied}/${room.capacity} (${Math.round((room.occupied / room.capacity) * 100)}%)`, tone: "text-amber-300", room: null },
              { label: `View ${room.id} full record`, value: "", tone: "text-cyan-300", room },
            ]
          : [{ label: "No critical faults open", value: "—", tone: "text-slate-500", room: null }],
        recommendations: room
          ? [
              `Dispatch a facilities ticket for ${room.id} — the HVAC actuator is not responding to 0–10V modulation commands from the RP-C controller.`,
              `${room.id} is at ${Math.round((room.occupied / room.capacity) * 100)}% capacity, which will push CO₂ past the comfort threshold faster without working ventilation — consider a temporary room swap for the next scheduled session.`,
              "Log the fault window against the SLA — repeat HVAC actuator failures in the same room typically indicate a wiring or relay issue, not a one-off fault.",
            ]
          : ["No open hardware faults across the estate."],
      };
    }
    case "power": {
      const sorted = [...ROOMS].sort((a, b) => s.roomPower(b) - s.roomPower(a));
      return {
        title: "Estate Power Draw", icon: Gauge, color: "#10b981",
        value: `${s.totalPowerKw.toFixed(1)} kW`, badge: "Live",
        explanation: "Aggregate real-time draw across every RP-C-controlled classroom system — lighting, HVAC actuation, and AV displays — reported by the central S!aP server.",
        breakdownLabel: "Top consumers",
        breakdown: sorted.slice(0, 5).map((r) => ({ label: `${r.id} · ${r.type}`, value: `${s.roomPower(r).toFixed(2)} kW`, tone: "text-emerald-300", room: r })),
        recommendations: [
          s.vacantRooms.length > 0 && `Enabling auto setback on ${s.vacantRooms.map((r) => r.id).join(", ")} would cut roughly ${(s.vacantRooms.reduce((sum, r) => sum + s.roomPower(r), 0) * 0.6).toFixed(1)} kW of standby draw immediately.`,
          "Estate-wide draw peaks align with back-to-back Hybrid sessions — the IdeaHub 86\" displays and lecture-capture cameras are the largest single AV load per room.",
        ].filter(Boolean),
      };
    }
    default:
      return null;
  }
}

function KPIDetailPanel({ kpiId, onClose, onViewRoom }) {
  const content = useMemo(() => getKPIContent(kpiId), [kpiId]);
  if (!content) return null;
  const Icon = content.icon;
  return (
    <aside className="w-full md:w-[420px] shrink-0 h-full min-h-0 flex flex-col">
      <Panel className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg" style={{ backgroundColor: `${content.color}1f`, color: content.color }}>
                <Icon size={16} />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-100">{content.title}</h2>
                <p className="text-[10.5px] text-slate-500">Estate-wide · Academic Block D</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition p-1">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <span className="font-mono text-3xl font-semibold text-slate-100">{content.value}</span>
            <Badge tone="slate" className="mb-1">{content.badge}</Badge>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div>
            <SectionLabel icon={ShieldCheck}>What This Measures</SectionLabel>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">{content.explanation}</p>
          </div>

          <div>
            <SectionLabel icon={Layers}>{content.breakdownLabel}</SectionLabel>
            <div className="space-y-1.5">
              {content.breakdown.map((row, i) => (
                <KPIRoomRow key={i} label={row.label} value={row.value} tone={row.tone} room={row.room} onViewRoom={onViewRoom} />
              ))}
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-3.5">
            <div className="flex items-center gap-2 text-indigo-300 text-[12px] font-semibold mb-2">
              <Sparkles size={14} /> AI Recommendations
            </div>
            <ul className="space-y-2">
              {content.recommendations.map((rec, i) => (
                <li key={i} className="text-[11.5px] text-indigo-100/80 leading-relaxed flex gap-2">
                  <span className="text-indigo-400 shrink-0">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  FLOOR VIEWPORT (2.5D estate overview + room focus)                 */
/* ------------------------------------------------------------------ */

function LayersCard({ layers, setLayers, envMode, setEnvMode, onZoomToFit }) {
  const layerKeys = [
    ["buildings", "Buildings (3-D)"],
    ["rpc", "RP-C Controllers"],
    ["iot", "IoT Sensors"],
    ["cctv", "CCTV"],
    ["ble", "BLE Tags"],
    ["idf", "IDF Backbone"],
  ];
  return (
    <Panel className="p-3.5 w-56 text-[12px]">
      <SectionLabel icon={Layers}>Layers</SectionLabel>
      <div className="space-y-1.5 mb-3">
        {layerKeys.map(([key, label]) => (
          <div key={key}>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-cyan-200">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                className="accent-cyan-400 h-3.5 w-3.5 rounded"
              />
              {label}
            </label>
            {key === "cctv" && layers.cctv && (
              <div className="pl-[22px] text-[10px] text-slate-500 mt-0.5">
                <span className="text-emerald-400">●</span> 2 online ·{" "}
                <span className="text-amber-400">●</span> 1 alert
              </div>
            )}
          </div>
        ))}
      </div>
      <SectionLabel icon={Thermometer}>Environment & Utilities</SectionLabel>
      <div className="space-y-1.5 mb-3">
        {["None", "Thermal/CO2 Comfort", "Power/Energy"].map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-cyan-200">
            <input
              type="radio"
              name="env"
              checked={envMode === opt}
              onChange={() => setEnvMode(opt)}
              className="accent-cyan-400 h-3.5 w-3.5"
            />
            {opt}
          </label>
        ))}
      </div>
      <button
        onClick={onZoomToFit}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-[11px] hover:border-cyan-400/40 hover:text-cyan-300 transition"
      >
        <RefreshCw size={11} /> Zoom to fit
      </button>
    </Panel>
  );
}


function FloorOverview({ layers, setLayers, envMode, setEnvMode, selectedId, onSelect }) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <div className="relative h-full w-full">
      <EstateDigitalTwin3D key={resetKey} rooms={ROOMS} layers={layers} envMode={envMode} selectedId={selectedId} onSelect={onSelect} />

      <div className="absolute top-4 right-4">
        <LayersCard
          layers={layers} setLayers={setLayers} envMode={envMode} setEnvMode={setEnvMode}
          onZoomToFit={() => setResetKey((k) => k + 1)}
        />
      </div>

      <div className="absolute bottom-4 left-4 pointer-events-none">
        <Panel className="px-3.5 py-2.5 flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#22d3ee" }} />In Session</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#818cf8" }} />Hybrid Active</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#10b981" }} />Available</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />Anomaly</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />Critical</span>
        </Panel>
      </div>
    </div>
  );
}


function FloorViewport({ layers, setLayers, envMode, setEnvMode, selectedRoom, onSelect, onBack }) {
  return (
    <div className="relative h-full">
      {!selectedRoom ? (
        <FloorOverview
          layers={layers} setLayers={setLayers} envMode={envMode} setEnvMode={setEnvMode}
          selectedId={null} onSelect={onSelect}
        />
      ) : (
        <div className="h-full min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-1 pb-3 shrink-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[12px] text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-400/40 rounded-lg px-3 py-1.5 transition"
            >
              <ArrowLeft size={13} /> Back to Estate Overview
            </button>
            <span className="flex items-center gap-1.5 text-[11px] text-cyan-300/80 border border-cyan-400/20 bg-cyan-500/5 rounded-lg px-3 py-1.5">
              Live 3D Digital Twin
            </span>
          </div>
          <div className="flex-1 min-h-0 rounded-xl border border-slate-800/70 bg-slate-950/40 overflow-hidden">
            <RoomDigitalTwin3D room={selectedRoom} rooms={ROOMS} onSwitchRoom={onSelect} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DETAIL DRAWER — HEADER + SIGNAGE                                   */
/* ------------------------------------------------------------------ */

function SignagePreview({ room }) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800/80">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Entrance Signage Preview</span>
        <span className="text-[10px] text-cyan-400 flex items-center gap-1"><Wifi size={10} /> Live from LMS</span>
      </div>
      <div className="p-3.5 space-y-2">
        <div>
          <div className="text-[13px] font-semibold text-slate-100">CSC 340 — Data Structures &amp; Algorithms</div>
          <div dir="rtl" className="text-[12px] text-cyan-300 mt-0.5">بنية البيانات والخوارزميات</div>
        </div>
        <div className="flex items-center justify-between text-[11.5px] text-slate-400">
          <span>Dr. Ahmed Al Mansoori</span>
          <span className="font-mono text-slate-300">10:00 – 11:15</span>
        </div>
        <div className="h-px bg-slate-800/80" />
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Next: MTH 210 — Calculus II</span>
          <span className="font-mono">11:30 – 12:45</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Users size={12} className="text-cyan-400" /> {room.occupied} occupants live
          </span>
          <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center">
            <QrCode size={22} className="text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 1 — EDGE HARDWARE & RP-C TELEMETRY                             */
/* ------------------------------------------------------------------ */

function TabHardware({ room, controls, updateControl }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel icon={Cpu}>SpaceLogic RP-C Room Controller</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Uplink" value="BACnet/IP" unit="8-port PoE" tone="text-cyan-300" />
          <Metric label="CPU Load" value="24" unit="%" />
          <Metric label="Edge State" value="Synced" tone="text-emerald-300" />
        </div>
      </div>

      <div>
        <SectionLabel icon={Radio}>IoT Sensors</SectionLabel>
        <div className="space-y-2">
          <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11.5px] font-medium text-slate-200">Insight-Sensor (Ceiling Void)</span>
              <Badge tone="emerald"><Activity size={10} /> Active</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Metric label="People Count" value={room.occupied} unit="accurate" />
              <Metric label="Motion" value="Active" tone="text-emerald-300" />
              <Metric label="Ambient Light" value="480" unit="Lux" />
              <Metric label="Acoustic" value="54" unit="dB" />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-slate-400">
              <Bluetooth size={11} className="text-cyan-400" /> BLE Receiver — Active
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11.5px] font-medium text-slate-200">SXW Sensor (Side Wall)</span>
              <Badge tone="cyan"><Thermometer size={10} /> Normal</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Metric label="Temperature" value="21.8" unit="°C" />
              <Metric label="Setpoint" value="22.0" unit="°C" />
              <Metric label="Rel. Humidity" value="48" unit="%" />
              <Metric label="CO₂ Level" value="640" unit="ppm" tone="text-emerald-300" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel icon={Lightbulb}>Actuators &amp; Scene Controls</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {LIGHTING_SCENES.map((scene) => (
            <button
              key={scene}
              onClick={() => updateControl("lighting", scene)}
              className={`px-1.5 py-2 rounded-lg text-[10px] font-medium border transition text-center leading-tight ${
                controls.lighting === scene
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              {scene}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[10.5px] text-slate-500 w-20 shrink-0">Blinds</span>
          {BLIND_POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => updateControl("blinds", pos)}
              className={`flex-1 py-1.5 rounded-md text-[10.5px] border transition ${
                controls.blinds === pos
                  ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3 mb-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] text-slate-500 flex items-center gap-1.5"><Wind size={12} /> HVAC Fan Speed (0–10V)</span>
            <span className="font-mono text-[11px] text-cyan-300">{controls.fanSpeed}%</span>
          </div>
          <input
            type="range" min="0" max="100" value={controls.fanSpeed}
            onChange={(e) => updateControl("fanSpeed", Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateControl("aduOn", !controls.aduOn)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[11px] transition ${
              controls.aduOn ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300" : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
          >
            <span className="flex items-center gap-1.5"><MonitorSmartphone size={13} /> IdeaHub K3 86"</span>
            <Power size={13} />
          </button>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800 bg-slate-950/60 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5"><PenTool size={13} className="text-indigo-300" /> Writing Board</span>
            <Badge tone="emerald">Connected</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SHARED — instructor contact card                                   */
/* ------------------------------------------------------------------ */

function InstructorCard({ room, note }) {
  if (!room.instructor) {
    return (
      <div className="text-[11px] text-slate-500 italic bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
        No instructor assigned — room is currently unscheduled.
      </div>
    );
  }
  const initials = room.instructor.replace(/^(Dr\.|Prof\.)\s*/, "").split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-slate-950 shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-slate-200 truncate">{room.instructor}</div>
          <div className="text-[10.5px] text-slate-500 truncate">{room.course} · {room.id}</div>
        </div>
      </div>
      {note && <p className="text-[10.5px] text-slate-500 mb-3 leading-relaxed">{note}</p>}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`mailto:${room.instructorEmail}`}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-700 text-slate-300 text-[11px] hover:border-cyan-400/40 hover:text-cyan-300 transition"
        >
          <Mail size={12} /> Email
        </a>
        <a
          href={`tel:${room.instructorPhone.replace(/\s/g, "")}`}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-700 text-slate-300 text-[11px] hover:border-cyan-400/40 hover:text-cyan-300 transition"
        >
          <Phone size={12} /> Call
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 2 — TRI-FACTOR ATTENDANCE                                      */
/* ------------------------------------------------------------------ */

const FLAGGED_BADGES = [
  { id: "BLE-TAG-2291", note: "No matching optical increment" },
  { id: "BLE-TAG-2318", note: "No matching optical increment" },
  { id: "BLE-TAG-2344", note: "Detected 12 min after door scan" },
  { id: "BLE-TAG-2367", note: "No matching biometric scan" },
];

function TabAttendance({ room }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const flagged = room.status === "alert";
  const biometric = room.occupied;
  const optical = room.occupied;
  const ble = flagged ? room.occupied + 4 : room.occupied;
  const absent = room.capacity - room.occupied;

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel icon={ShieldCheck}>Tri-Factor Identity Resolution</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3 text-center">
            <Fingerprint size={18} className="mx-auto text-cyan-400 mb-1.5" />
            <div className="text-lg font-mono text-slate-100">{biometric}</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">Door Biometric<br />Scans Registered</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3 text-center">
            <Eye size={18} className="mx-auto text-emerald-400 mb-1.5" />
            <div className="text-lg font-mono text-slate-100">{optical}</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">Visual/Thermal<br />People Present</div>
          </div>
          <div className={`bg-slate-950/60 border rounded-lg p-3 text-center ${flagged ? "border-amber-700/50" : "border-slate-800/70"}`}>
            <Bluetooth size={18} className={`mx-auto mb-1.5 ${flagged ? "text-amber-400" : "text-cyan-400"}`} />
            <div className={`text-lg font-mono ${flagged ? "text-amber-300" : "text-slate-100"}`}>{ble}</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">BLE ID Cards<br />Detected Active</div>
          </div>
        </div>
      </div>

      {flagged ? (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg overflow-hidden">
          <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between p-3.5 text-left">
            <div className="flex items-center gap-2 text-amber-300 text-[12px] font-semibold">
              <AlertTriangle size={14} /> Attendance Discrepancy Flagged
            </div>
            <ChevronDown size={14} className={`text-amber-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
          </button>
          <div className="px-3.5 pb-3.5">
            <p className="text-[11.5px] text-amber-100/80 leading-relaxed">
              4 BLE cards detected without a corresponding physical presence increment. Suspected proxy
              attendance or card left behind. Glass Box AI has escalated this to the attendance audit queue.
              <span className="text-amber-300"> Click to {expanded ? "hide" : "view"} class details, contact the instructor, and take action.</span>
            </p>
          </div>

          {expanded && (
            <div className="border-t border-amber-400/20 p-3.5 space-y-3.5 bg-slate-950/30">
              <div>
                <SectionLabel icon={User}>Session &amp; Instructor</SectionLabel>
                <InstructorCard room={room} note={`Flag occurred during the ${room.course || "current"} session — notify the instructor before the next class if unresolved.`} />
              </div>

              <div>
                <SectionLabel icon={Bluetooth}>Flagged Badge IDs</SectionLabel>
                <div className="space-y-1.5">
                  {FLAGGED_BADGES.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-slate-950/60 border border-amber-700/30 rounded-lg px-3 py-2">
                      <span className="text-[10.5px] font-mono text-amber-300">{b.id}</span>
                      <span className="text-[10px] text-slate-500 text-right">{b.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setReviewed(true)}
                  disabled={reviewed}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition ${
                    reviewed ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-300" : "border border-slate-700 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"
                  }`}
                >
                  {reviewed ? <><CheckCircle2 size={12} /> Marked Reviewed</> : <><ClipboardCheck size={12} /> Mark Reviewed</>}
                </button>
                <button
                  onClick={() => setEscalated(true)}
                  disabled={escalated}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition ${
                    escalated ? "bg-amber-500/15 border border-amber-400/40 text-amber-300" : "border border-slate-700 text-slate-300 hover:border-amber-400/40 hover:text-amber-300"
                  }`}
                >
                  {escalated ? <><CheckCircle2 size={12} /> Escalated</> : <><Send size={12} /> Escalate to Registrar</>}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3.5 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[11.5px] text-emerald-100/80">No attendance discrepancies detected this session — all identity signals match.</span>
        </div>
      )}

      <div>
        <SectionLabel icon={Network}>Upstream Sync Status</SectionLabel>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/70 rounded-lg px-3 py-2.5">
            <span className="text-[11.5px] text-slate-300">Blackboard Ultra (LMS)</span>
            <Badge tone="emerald"><CheckCircle2 size={10} /> {room.occupied} Present · {absent} Absent</Badge>
          </div>
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/70 rounded-lg px-3 py-2.5">
            <span className="text-[11.5px] text-slate-300">Oracle PeopleSoft (SIS)</span>
            <Badge tone="cyan"><ShieldCheck size={10} /> Audit Hash Verified</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 3 — HYBRID ORCHESTRATION                                       */
/* ------------------------------------------------------------------ */

const GRACE_PERIOD_START = 240; // seconds before S!aP auto-triggers hybrid if the instructor hasn't badged in

function TabHybrid({ room, hybridActive, setHybridActive }) {
  const [arrivalConfirmed, setArrivalConfirmed] = useState(true);
  const [graceSeconds, setGraceSeconds] = useState(GRACE_PERIOD_START);
  const [substituteAssigned, setSubstituteAssigned] = useState(false);
  const awaitingArrival = !hybridActive && !arrivalConfirmed;

  useEffect(() => {
    if (!awaitingArrival) return;
    if (graceSeconds <= 0) { setHybridActive(true); return; }
    const t = setInterval(() => setGraceSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [awaitingArrival, graceSeconds, setHybridActive]);

  const mm = Math.floor(graceSeconds / 60), ss = String(graceSeconds % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/70 rounded-lg px-3.5 py-3">
        <div>
          <div className="text-[12px] font-medium text-slate-200">Simulate Remote Faculty / Hybrid Trigger</div>
          <div className="text-[10.5px] text-slate-500 mt-0.5">Toggles S!aP off-site badge automation</div>
        </div>
        <button
          onClick={() => setHybridActive((v) => {
            const next = !v;
            if (!next) setArrivalConfirmed(true); // turning it off returns to normal, not a fresh alert
            return next;
          })}
          className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${hybridActive ? "bg-indigo-500" : "bg-slate-700"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${hybridActive ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div>
        <SectionLabel icon={MapPin}>Instructor Location Radar (Lenel Access Control)</SectionLabel>
        <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3 text-[11.5px] text-slate-300 flex items-start gap-2">
          <MapPin size={14} className="text-cyan-400 mt-0.5 shrink-0" />
          {hybridActive ? (
            <span>
              {room.instructor || "Instructor"} badged in at <span className="text-cyan-300">Al Ain Campus, Academic Block 2</span> at{" "}
              <span className="font-mono text-slate-200">09:42 GST</span>.
            </span>
          ) : arrivalConfirmed ? (
            <span>
              {room.instructor || "Instructor"} badged in at <span className="text-emerald-300">{room.id} entrance</span> just now.
            </span>
          ) : (
            <span>
              No on-site badge event detected for {room.instructor || "the instructor"} in the last{" "}
              <span className="font-mono text-slate-200">{Math.round((GRACE_PERIOD_START - graceSeconds) / 60)} min</span>.
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Mode Switch State</span>
        {hybridActive ? (
          <Badge tone="purple"><Sparkles size={10} /> AUTO-HYBRID TRIGGERED</Badge>
        ) : arrivalConfirmed ? (
          <Badge tone="emerald"><UserCheck size={10} /> Instructor On-Site</Badge>
        ) : (
          <Badge tone="amber"><TimerReset size={10} /> Awaiting Arrival</Badge>
        )}
      </div>

      {!hybridActive && arrivalConfirmed && (
        <button
          onClick={() => { setGraceSeconds(GRACE_PERIOD_START); setArrivalConfirmed(false); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-700 text-slate-400 text-[10.5px] hover:border-amber-400/40 hover:text-amber-300 transition"
        >
          <TimerReset size={12} /> Simulate Instructor Delay
        </button>
      )}

      {awaitingArrival && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3.5 space-y-3.5">
          <div className="flex items-center gap-2 text-amber-300 text-[12px] font-semibold">
            <UserX size={14} /> Instructor Not Yet On-Site
          </div>
          <p className="text-[11.5px] text-amber-100/80 leading-relaxed">
            Auto-hybrid will trigger in <span className="font-mono text-amber-200">{mm}:{ss}</span> if no badge-in
            is detected. Resolve now to avoid an unplanned bridge.
          </p>
          <InstructorCard room={room} note="Contact the instructor directly, or take action below." />
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setHybridActive(true)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-[11px] font-medium hover:bg-indigo-500/30 transition"
            >
              <Video size={12} /> Trigger Hybrid Bridge Now
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setArrivalConfirmed(true); setGraceSeconds(GRACE_PERIOD_START); }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-700 text-slate-300 text-[11px] hover:border-emerald-400/40 hover:text-emerald-300 transition"
              >
                <UserCheck size={12} /> Mark Arrived
              </button>
              <button
                onClick={() => setSubstituteAssigned(true)}
                disabled={substituteAssigned}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] transition ${
                  substituteAssigned ? "bg-cyan-500/15 border border-cyan-400/40 text-cyan-300" : "border border-slate-700 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"
                }`}
              >
                {substituteAssigned ? <><CheckCircle2 size={12} /> TA Assigned</> : <><PhoneForwarded size={12} /> Assign Backup TA</>}
              </button>
            </div>
          </div>
          {substituteAssigned && (
            <div className="text-[10.5px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 rounded-lg px-3 py-2">
              Backup TA notified and covering {room.id} until {room.instructor || "the instructor"} arrives or the session ends.
            </div>
          )}
        </div>
      )}

      <div>
        <SectionLabel icon={Video}>Automation Log</SectionLabel>
        {hybridActive ? (
          <div className="space-y-2">
            {AUTOMATION_LOG.map((l, i) => (
              <div key={i} className="flex gap-2.5 text-[11px]">
                <span className="font-mono text-indigo-400 shrink-0">[{l.t}]</span>
                <span className="text-slate-400">{l.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 italic bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
            No hybrid automation events — instructor is present on-site.
          </div>
        )}
      </div>

      {hybridActive && (
        <div>
          <SectionLabel icon={Users}>Remote Session</SectionLabel>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/70 rounded-lg px-3 py-2.5">
              <span className="text-[11.5px] text-slate-300">Remote attendees (Teams)</span>
              <Badge tone="purple"><Video size={10} /> 3 joined</Badge>
            </div>
            <InstructorCard room={room} note="Instructor is bridged in remotely — contact directly if the feed drops." />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 4 — NETWORK, ENERGY & CENTRAL ARCHITECTURE                     */
/* ------------------------------------------------------------------ */

function TabNetwork({ power, setback }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel icon={Network}>8-Port PoE Switch — VLAN Map</SectionLabel>
        <div className="grid grid-cols-8 gap-1.5 mb-2.5">
          {PORT_MAP.map((vlan, i) => {
            const v = VLANS.find((x) => x.id === vlan);
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="h-8 w-full rounded-md border flex items-center justify-center text-[9px] font-mono"
                  style={{ borderColor: v.color + "80", backgroundColor: v.color + "1a", color: v.color }}
                >
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {VLANS.map((v) => (
            <span key={v.id} className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
              VLAN {v.id}: {v.label}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-3.5">
        <div className="flex items-center gap-2 text-indigo-300 text-[12px] font-semibold mb-1.5">
          <Server size={14} /> Central Architecture
        </div>
        <p className="text-[11.5px] text-indigo-100/80 leading-relaxed">
          Central UIIC S!aP Server replaces the local classroom server — lower CAPEX/OPEX, while local
          RP-C edge resilience is retained during WAN drop.
        </p>
      </div>

      <div>
        <SectionLabel icon={Gauge}>Energy KPI</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Real-Time Draw" value={power.toFixed(2)} unit="kW" tone="text-cyan-300" />
          <Metric
            label="Auto Setback"
            value={setback > 0 ? `${Math.floor(setback / 60)}:${String(setback % 60).padStart(2, "0")}` : "Active"}
            tone={setback > 0 ? "text-amber-300" : "text-emerald-300"}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DETAIL DRAWER                                                      */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "hardware", label: "Edge Hardware", icon: Cpu },
  { key: "attendance", label: "Attendance", icon: Fingerprint },
  { key: "hybrid", label: "Hybrid", icon: Video },
  { key: "network", label: "Network", icon: Network },
];

function DetailDrawer({ room, onClose, controls, updateControl, hybridActive, setHybridActive, power, setback }) {
  const [tab, setTab] = useState("hardware");
  const s = STATUS_STYLES[room.status];
  const pct = Math.round((room.occupied / room.capacity) * 100);

  return (
    <aside className="w-full md:w-[420px] shrink-0 h-full min-h-0 flex flex-col">
      <Panel className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-100">Classroom {room.id}</h2>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {room.type} Classroom · IDF-01 (42U Cat 6A)
              </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition p-1">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={room.status === "in-session" ? "cyan" : room.status === "alert" ? "amber" : room.status === "critical" ? "red" : "emerald"}>
              <StatusDot status={room.status} pulse={false} /> {s.label.toUpperCase()}
            </Badge>
            <Badge tone="slate">
              <Users size={10} /> {room.occupied}/{room.capacity} ({pct}%)
            </Badge>
          </div>
        </div>

        <div className="p-4 border-b border-slate-800/80">
          <SignagePreview room={room} />
        </div>

        <div className="flex border-b border-slate-800/80 px-2 pt-2 gap-1 overflow-x-auto sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-t-lg whitespace-nowrap transition ${
                tab === t.key
                  ? "text-cyan-300 border-b-2 border-cyan-400 bg-cyan-500/5"
                  : "text-slate-500 hover:text-slate-300 border-b-2 border-transparent"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "hardware" && <TabHardware key={room.id} room={room} controls={controls} updateControl={updateControl} />}
          {tab === "attendance" && <TabAttendance key={room.id} room={room} />}
          {tab === "hybrid" && <TabHybrid key={room.id} room={room} hybridActive={hybridActive} setHybridActive={setHybridActive} />}
          {tab === "network" && <TabNetwork key={room.id} power={power} setback={setback} />}
        </div>
      </Panel>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  FLOATING ASSISTANT                                                 */
/* ------------------------------------------------------------------ */

function AskSIA() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <Panel className="w-72 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-300">
              <Sparkles size={13} /> SIA — Campus AI
            </span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-200">
              <X size={14} />
            </button>
          </div>
          <p className="text-[11.5px] text-slate-400 mb-2.5">
            Ask about occupancy, anomalies, or hybrid sessions across Academic Block D.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              placeholder="e.g. Why is D-GF-03 flagged?"
              className="flex-1 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11.5px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/50"
            />
            <button className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition">
              <Send size={13} />
            </button>
          </div>
        </Panel>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[13px] font-medium shadow-2xl shadow-indigo-950/50 hover:shadow-indigo-500/30 transition"
      >
        <MessageSquare size={16} />
        Ask SIA
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ROOT MODULE                                                        */
/* ------------------------------------------------------------------ */

export default function SmartClassroomsUIIC({ embedded = false }) {
  const [darkMode, setDarkMode] = useState(true);
  const [advisoryOpen, setAdvisoryOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("D-GF-03");
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [now, setNow] = useState(new Date());

  const selectRoom = useCallback((id) => { setSelectedRoomId(id); setSelectedKPI(null); }, []);
  const selectKPI = useCallback((id) => { setSelectedKPI((cur) => (cur === id ? null : id)); setSelectedRoomId(null); }, []);

  const [layers, setLayers] = useState({
    buildings: true, rpc: true, iot: true, cctv: false, ble: true, idf: false,
  });
  const [envMode, setEnvMode] = useState("None");

  const [roomControls, setRoomControls] = useState({});
  const [hybridActiveMap, setHybridActiveMap] = useState({ "D-GF-03": true });
  const [setback, setSetback] = useState(154);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSetback((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const selectedRoom = useMemo(() => ROOMS.find((r) => r.id === selectedRoomId) || null, [selectedRoomId]);

  const controls = useMemo(() => {
    return (
      roomControls[selectedRoomId] || {
        lighting: "Lecture", blinds: "Open", fanSpeed: 55, aduOn: true,
      }
    );
  }, [roomControls, selectedRoomId]);

  const updateControl = useCallback((key, value) => {
    setRoomControls((prev) => ({
      ...prev,
      [selectedRoomId]: { ...(prev[selectedRoomId] || { lighting: "Lecture", blinds: "Open", fanSpeed: 55, aduOn: true }), [key]: value },
    }));
  }, [selectedRoomId]);

  const hybridActive = !!hybridActiveMap[selectedRoomId];
  const setHybridActive = useCallback((updater) => {
    setHybridActiveMap((prev) => ({
      ...prev,
      [selectedRoomId]: typeof updater === "function" ? updater(!!prev[selectedRoomId]) : updater,
    }));
  }, [selectedRoomId]);

  const power = useMemo(() => {
    if (!selectedRoom) return 0;
    return 0.6 + (selectedRoom.occupied / selectedRoom.capacity) * 1.1;
  }, [selectedRoom]);

  return (
    <div
      /* Embedded in the dashboard shell (Layout supplies the chrome), the module
         drops its own header and sizes itself to the remaining viewport instead
         of claiming the full screen. Standalone rendering is unchanged. */
      className={`w-full bg-[#080d16] text-slate-200 flex flex-col overflow-hidden ${embedded ? "rounded-2xl border border-slate-800/70" : "h-screen"}`}
      style={{
        backgroundImage: "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.05), transparent 40%), radial-gradient(circle at 90% 30%, rgba(124,58,237,0.06), transparent 45%)",
        ...(embedded ? { height: "calc(100vh - var(--app-header-h, 60px) - 66px)", minHeight: 640 } : null),
      }}
    >
      {!embedded && <TopHeader darkMode={darkMode} setDarkMode={setDarkMode} now={now} />}
      {!embedded && <AdvisoryBanner open={advisoryOpen} setOpen={setAdvisoryOpen} />}
      <KPIStrip selectedKPI={selectedKPI} onSelect={selectKPI} />

      <main className="flex-1 min-h-0 flex gap-4 p-4 md:p-5 overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0">
          <Panel className="h-full p-4">
            <FloorViewport
              layers={layers} setLayers={setLayers} envMode={envMode} setEnvMode={setEnvMode}
              selectedRoom={selectedRoom}
              onSelect={selectRoom}
              onBack={() => setSelectedRoomId(null)}
            />
          </Panel>
        </div>

        {selectedKPI ? (
          <KPIDetailPanel kpiId={selectedKPI} onClose={() => setSelectedKPI(null)} onViewRoom={selectRoom} />
        ) : selectedRoom && (
          <DetailDrawer
            room={selectedRoom}
            onClose={() => setSelectedRoomId(null)}
            controls={controls}
            updateControl={updateControl}
            hybridActive={hybridActive}
            setHybridActive={setHybridActive}
            power={power}
            setback={setback}
          />
        )}
      </main>

      {!embedded && <AskSIA />}
    </div>
  );
}
