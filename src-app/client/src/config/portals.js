/**
 * External source portals (the real ZMU demo environment).
 * The dashboard links out to these rather than re-implementing them — the
 * differentiator here is the AI advisory layer sitting on top.
 * Base: http://zmudemo-la.uaenorth.cloudapp.azure.com
 *
 * These are always the REAL labels/urls/ports — this file has no isGeneric
 * awareness on purpose (it's static data, not a component) and doesn't need
 * any: components/SourceLink.jsx owns the one-and-only ZMU → generic label
 * mapping (GENERIC_PORTAL_LABELS there), keyed off these `label` strings, so
 * every place that renders a SourceLink row is covered by that single
 * mapping. Don't add a second one here — it drifted out of sync with
 * SourceLink's map once already.
 */
const H = 'http://zmudemo-la.uaenorth.cloudapp.azure.com';

export const PORTALS = {
  academic: [
    { label: 'Student Information System', port: 8081, url: `${H}:8081/` },
    { label: 'Moodle LMS', port: 8082, url: `${H}:8082/login/index.php` },
    { label: 'Cadet Experience Portal', port: 8085, url: `${H}:8085/login` },
  ],
  readiness: [
    { label: 'HPO Fitness & Readiness', port: 8086, url: `${H}:8086/` },
    { label: 'Military Training Record', port: 8087, url: `${H}:8087/` },
    { label: 'Conduct & Discipline Register', port: 8088, url: `${H}:8088/` },
  ],
};
