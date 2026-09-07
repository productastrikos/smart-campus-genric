import React from 'react';
import SmartClassroomsUIIC from '../components/SmartClassrooms/SmartClassroomsUIIC';

/**
 * SMART CLASSROOMS — room-level Digital Twin (UIIC).
 * ======================================================================
 * The Campus Digital Twin (/digital-twin) models the estate from the air:
 * buildings, roads, perimeter, CCTV, patrols. This module is its
 * drill-down — Academic Block D's 14 physical classrooms as a live 3D
 * building twin, and each room as a fully instrumented 3D room twin
 * (RP-C controller, PoE fabric, Insight/SXW sensors, DALI lighting,
 * blinds, HVAC, AV and lecture capture).
 *
 * The module is rendered `embedded`, so it drops its own top bar and
 * floating assistant — Layout already supplies both — and sizes itself
 * to the remaining viewport rather than claiming the full screen.
 */
export default function SmartClassrooms() {
  return <SmartClassroomsUIIC embedded />;
}
