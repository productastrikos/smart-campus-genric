/**
 * GENERIC-MODE BUILDING DISPLAY LABELS
 * ===================================================================
 * DISPLAY LAYER ONLY. This is not a building registry and it is not a
 * second source of truth.
 *
 * The system of record stays exactly where it already is: data/buildings.csv,
 * loaded server-side into `db.buildings` and keyed by `building_id`
 * (Z01…Z12). Nothing in this file is written back, and no CSV, database
 * record or API response is renamed by it.
 *
 * A search of the codebase before this file was added confirmed the project
 * had NO existing Generic building-name mapping — Layout.jsx's
 * GENERIC_NAV_LABELS maps navigation keys, not buildings, and no other
 * module carried one. So this is the project's single Generic building
 * label map, in one place, for any future Generic-mode module to reuse
 * rather than each page inventing its own.
 *
 * The IDs and the ordering below are taken verbatim from the real
 * buildings.csv (12 rows, Z01-Z12); each label is the neutral
 * smart-campus equivalent of that row's actual purpose as recorded in its
 * `type` column. No building was added, removed or re-keyed.
 *
 * Anything not in the map falls back to `Building <id>` rather than to the
 * source name, so an unmapped ID can never leak a non-neutral label into
 * Generic mode.
 */

export const GENERIC_BUILDING_NAMES = {
  Z01: 'Main Administration',
  Z02: 'Academic Block A',
  Z03: 'Academic Block B',
  Z04: 'Applied Laboratories',
  Z05: 'Central Library',
  Z06: 'Residence Hall North',
  Z07: 'Residence Hall South',
  Z08: 'Sports & Recreation Complex',
  Z09: 'Secure Storage Facility',
  Z10: 'Dining Facility',
  Z11: 'Auditorium & Assembly Hall',
  Z12: 'Central Plant & Data Centre',
};

/** Neutral display label for a building_id. Never returns a source name. */
export const genericBuildingName = (id) => GENERIC_BUILDING_NAMES[id] || `Building ${id}`;
