/**
 * CCTV grid — manual stream mapping.
 *
 * Each entry binds a grid slot to a camera in the VMS registry
 * (data/cctv_cameras.csv, joined by cameraId).
 *
 * Provide ONE of:
 *   - embedUrl : an iframe-embeddable player URL (ScreenPal, YouTube, an
 *                HLS/WebRTC gateway page, etc.). Used as-is in an <iframe>.
 *   - streamUrl: a direct video URL a browser <video> can play
 *                (MP4/WebM, or HLS .m3u8 in Safari). RTSP must be converted
 *                at the edge (MediaMTX / go2rtc) first.
 *
 * Leave both empty ('') to render the built-in simulated feed.
 * Swap URLs here without touching any component code.
 *
 * Six local demo clips (client/public/videos/v1–v6.mp4), one per tile.
 */
const V1 = '/videos/v1.mp4';
const V2 = '/videos/v2.mp4';
const V3 = '/videos/v3.mp4';
const V4 = '/videos/v4.mp4';
const V5 = '/videos/v5.mp4';
const V6 = '/videos/v6.mp4';

export const CAMERA_GRID = [
  { slot: 1, cameraId: 'CAM-01', embedUrl: '', streamUrl: V1 },
  { slot: 2, cameraId: 'CAM-02', embedUrl: '', streamUrl: V2 },
  { slot: 3, cameraId: 'CAM-03', embedUrl: '', streamUrl: V3 },
  { slot: 4, cameraId: 'CAM-04', embedUrl: '', streamUrl: V4 },
  { slot: 5, cameraId: 'CAM-05', embedUrl: '', streamUrl: V5 },
  { slot: 6, cameraId: 'CAM-06', embedUrl: '', streamUrl: V6 },
];

/**
 * GENERIC MODE — a completely separate camera grid + metadata set, per
 * explicit instruction not to touch the ZMU CAMERA_GRID above. Points at
 * the real files the user uploaded directly into
 * client/public/videos/generic/ (confirmed present: v1.mp4-v6.mp4,
 * ~358MB total, extracted from their uploaded zip - not reused ZMU
 * clips, not invented names).
 *
 * GENERIC_CAMERAS is a self-contained, frontend-only metadata set (NOT
 * joined against data/cctv_cameras.csv, which is real ZMU backend data
 * with names like "Armoury Entrance"/"Parade Ground" - per instruction
 * to prefer a frontend-only implementation and not touch backend/data
 * files). Shape matches exactly what IncidentManagement.jsx's
 * CameraTile already reads from a camera object (camera_id, name,
 * status, building_name, resolution, fps), so no component code needs
 * to change beyond which grid/metadata source it picks.
 */
/* Six DISTINCT clips, one per tile - no repeats. Chosen from the full
   generic-safe pool (videos/generic/ + videos/building/) by file size,
   smallest first, because all six tiles autoplay SIMULTANEOUSLY on this
   wall - unlike the Digital Twin popups, which load one clip on click.
   These six total ~99 MB versus ~352 MB for generic/v1-v6, and avoid
   generic/v1.mp4 (178 MB) entirely, which alone would stall the wall. */
const G1 = '/videos/building/b5.mp4';   // 2.6 MB
const G2 = '/videos/building/b6.mp4';   // 3.4 MB
const G3 = '/videos/generic/v5.mp4';    // 7.1 MB
const G4 = '/videos/generic/v2.mp4';    // 19 MB
const G5 = '/videos/building/b3.mp4';   // 29 MB
const G6 = '/videos/generic/v6.mp4';    // 38 MB

export const GENERIC_CAMERA_GRID = [
  { slot: 1, cameraId: 'GCAM-01', embedUrl: '', streamUrl: G1 },
  { slot: 2, cameraId: 'GCAM-02', embedUrl: '', streamUrl: G2 },
  { slot: 3, cameraId: 'GCAM-03', embedUrl: '', streamUrl: G3 },
  { slot: 4, cameraId: 'GCAM-04', embedUrl: '', streamUrl: G4 },
  { slot: 5, cameraId: 'GCAM-05', embedUrl: '', streamUrl: G5 },
  { slot: 6, cameraId: 'GCAM-06', embedUrl: '', streamUrl: G6 },
];

/* Labels match what each clip ACTUALLY shows, read off the rendered wall -
   the videos are assigned to slots by file size (smallest first, so the
   six autoplay together without stalling), not by subject, so the names
   are set here to fit the footage rather than the other way round.
     GCAM-01 b5.mp4 - modern block exterior, courtyard, people walking
     GCAM-02 b6.mp4 - students on steps entering a faculty building
     GCAM-03 v5.mp4 - library interior, reading stacks
     GCAM-04 v2.mp4 - multi-storey internal atrium / walkways
     GCAM-05 b3.mp4 - elevated wide shot over the campus rooftops
     GCAM-06 v6.mp4 - empty internal common room / corridor */
export const GENERIC_CAMERAS = [
  { camera_id: 'GCAM-01', name: 'Campus Courtyard', building_name: 'Central Campus', status: 'online', resolution: '4K', fps: 25 },
  { camera_id: 'GCAM-02', name: 'Faculty Building — Entrance Steps', building_name: 'Academic Building', status: 'online', resolution: '1080p', fps: 30 },
  { camera_id: 'GCAM-03', name: 'Library — Reading Stacks', building_name: 'Library', status: 'online', resolution: '4K', fps: 25 },
  { camera_id: 'GCAM-04', name: 'Academic Block — Atrium', building_name: 'Academic Building', status: 'online', resolution: '1080p', fps: 25 },
  { camera_id: 'GCAM-05', name: 'Campus Overview — Elevated', building_name: 'Central Campus', status: 'online', resolution: '1080p', fps: 25 },
  { camera_id: 'GCAM-06', name: 'Common Room', building_name: 'Student Center', status: 'online', resolution: '1080p', fps: 25 },
];

/**
 * GENERIC MODE display remap for the REAL VMS registry.
 * ======================================================
 * The Camera Health / Flagged Footage / Reported Incidents panels are
 * driven by real backend data (/api/cctv <- data/cctv_cameras.csv +
 * cctv_incidents.csv). The incident TYPES and DESCRIPTIONS in that data
 * are already fully generic ("Tailgating", "Camera obstruction",
 * "Loitering", "Unattended object", "Crowd density", "Dwell time
 * exceeded near controlled door"...) - only the camera NAMES and their
 * building names are ZMU/military-specific.
 *
 * So Generic Mode keeps the real records, real timestamps, real
 * severities, real statuses and real operators, and only remaps the
 * ZMU-specific camera/building labels. Nothing is fabricated and no row
 * is invented - each of the 12 real cameras gets a neutral campus
 * equivalent chosen to match its actual location type.
 *
 * The camera_id itself (CAM-01...) is left alone: it's a neutral
 * technical identifier, not military terminology.
 */
export const GENERIC_CAMERA_NAME_MAP = {
  'CAM-01': 'Main Gate — ANPR Lane',
  'CAM-02': 'Service Yard Entrance',
  'CAM-03': 'Academic Block B — Corridor',
  'CAM-04': 'Central Plaza — North',
  'CAM-05': 'Residence North — Lobby',
  'CAM-06': 'Data Centre Cage',
  'CAM-07': 'Dining Facility — Service',
  'CAM-08': 'Sports Complex — Pool Deck',
  'CAM-09': 'Library Reading Hall',
  'CAM-10': 'Labs Centre — East Door',
  'CAM-11': 'South Perimeter — Fence 7',
  'CAM-12': 'Roundabout — Traffic',
};

/* Real ZMU building names -> neutral campus equivalents, for the
   Location column in Flagged Footage. Buildings whose names are already
   neutral (Central Library, Dining Facility, Academic Block A/B,
   Applied Labs Centre, Central Plant & Data Centre) map to themselves. */
export const GENERIC_BUILDING_NAME_MAP = {
  'Command HQ & Admin': 'Main Administration',
  'Armoury & WMS': 'Service & Stores',
  'Auditorium & Parade Hall': 'Auditorium & Events Hall',
  'Cadet Accommodation North': 'Residence North',
  'Cadet Accommodation South': 'Residence South',
  'HPO & Sports Complex': 'Sports & Recreation Complex',
};
