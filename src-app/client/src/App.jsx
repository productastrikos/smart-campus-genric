import React, { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import ExecutiveOverview from './pages/ExecutiveOverview';
import CommandCenter from './pages/CommandCenter';
// import DigitalTwin from './pages/DigitalTwin'; // old isometric-SVG twin — commented out in favour of the real GIS/map twin below
import DigitalTwin2 from './pages/digitalTwin_2';
// Room-level drill-down of the Digital Twin — Academic Block D's smart classrooms (UIIC).
import SmartClassrooms from './pages/SmartClassrooms';
import Academic from './pages/Academic';
import Readiness from './pages/Readiness';
import Enterprise from './pages/Enterprise';
import CampusOps from './pages/CampusOps';
import IoTSensors from './pages/IoTSensors';
import IncidentManagement from './pages/IncidentManagement';
// Restored extended modules — Super-Admin only (RBAC-guarded below)
import SIS from './pages/SIS';
import LMS from './pages/LMS';
import MeritBoard from './pages/MeritBoard';
import StreamPage from './pages/Streams';
import CadetJourney from './pages/CadetJourney';
import ITManagement from './pages/ITManagement';
import SecurityOps from './pages/SecurityOps';
import Integration from './pages/Integration';
import StandaloneShell from './components/StandaloneShell';
// Generic-mode-only core module. Imported unconditionally (so the bundle is
// built once) but only ever mounted behind the mode gate below.
import Sustainability from './pages/Sustainability';
import { ROLE_ROUTES, homeFor, GENERIC_ONLY_ROUTE, GENERIC_EXTRA_ROUTES } from './components/Layout';
import { useAppMode } from './appMode';

// Modules launched in their own tab from the Academics / Readiness pages.
// Rendered via StandaloneShell (no navigation back to the dashboard).
export const STANDALONE_MODULES = {
  sis: 'page.sis', lms: 'page.lms', merit: 'page.merit', 'cadet-journey': 'page.cadetJourney',
  hpo: 'page.hpo', military: 'page.military', conduct: 'page.conduct',
};
// Which roles may open which standalone modules (superadmin always may).
const ACADEMIC_SLUGS = ['sis', 'lms', 'merit', 'cadet-journey'];
const READINESS_SLUGS = ['hpo', 'military', 'conduct'];
function canOpenStandalone(role, slug) {
  if (role === 'superadmin') return true;
  if (role === 'academics') return ACADEMIC_SLUGS.includes(slug);
  if (role === 'readiness') return READINESS_SLUGS.includes(slug);
  // Squadron leaders reach both the academic and readiness modules (their data
  // is scoped to their own companies by the API).
  if (role === 'squadron1' || role === 'squadron2') return ACADEMIC_SLUGS.includes(slug) || READINESS_SLUGS.includes(slug);
  return false;
}

const AUTH_KEY = 'zmu_auth';

/* ZMU-ONLY surfaces. Readiness & Performance and the HPO / Military /
   Conduct / Cadet-Journey / Merit standalone modules are built entirely
   around ZMU concepts (Garmin wearables, ACWR, cadet ID, squadron
   scoping, conduct scoring) and have no Generic equivalent, so Generic
   Mode blocks them at the URL level rather than rendering military
   content. Nothing is deleted - ZMU Mode reaches them exactly as before;
   this is purely an application-mode restriction layered on top of the
   existing RBAC, which is untouched. */
const ZMU_ONLY_ROUTES = ['/readiness'];
const ZMU_ONLY_STANDALONE_SLUGS = ['hpo', 'military', 'conduct', 'cadet-journey', 'merit'];

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch { return null; }
  });
  const location = useLocation();
  const { isGeneric } = useAppMode();

  const login = useCallback((u) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  if (!user) {
    if (location.pathname !== '/login') return <Navigate to="/login" replace />;
    return <Login onLogin={login} />;
  }

  if (location.pathname === '/login') return <Navigate to={homeFor(user.role)} replace />;

  // Application-mode guard — Generic Mode blocks the ZMU-only routes, so
  // typing /readiness directly redirects home instead of rendering
  // military content. Runs before the RBAC guard below; ZMU Mode skips
  // this entirely and behaves exactly as before.
  if (isGeneric && ZMU_ONLY_ROUTES.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  // Role guard — restricted roles only see their allowed routes; bounced home
  // otherwise. Standalone module tabs are exempt here and gated separately by
  // canOpenStandalone below (their allow-list is per-slug, not per-route).
  // ZMU mode: identical to before. Generic mode: the additive Generic-only
  // allow-list entry is appended for this render only; ROLE_ROUTES is not mutated.
  const baseAllowed = ROLE_ROUTES[user.role];
  const allowed = baseAllowed && isGeneric && GENERIC_EXTRA_ROUTES[user.role]
    ? [...baseAllowed, ...GENERIC_EXTRA_ROUTES[user.role]]
    : baseAllowed;
  if (allowed && !location.pathname.startsWith('/standalone/')
      && !allowed.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  // Standalone module tabs — rendered without the dashboard Layout so there's
  // no path back to the dashboard. Super-Admin (all), the academic/readiness
  // heads, and the squadron leaders (their own modules, squadron-scoped data).
  if (location.pathname.startsWith('/standalone/')) {
    const slug = location.pathname.split('/standalone/')[1];
    // Generic Mode blocks the ZMU-only standalone modules before the RBAC
    // check, so /standalone/hpo, /military, /conduct, /cadet-journey and
    // /merit redirect home rather than opening.
    if (isGeneric && ZMU_ONLY_STANDALONE_SLUGS.includes(slug)) return <Navigate to="/" replace />;
    if (!canOpenStandalone(user.role, slug)) return <Navigate to={homeFor(user.role)} replace />;
    return (
      <Routes>
        <Route path="/standalone/sis" element={<StandaloneShell titleKey="page.sis"><SIS user={user} /></StandaloneShell>} />
        <Route path="/standalone/lms" element={<StandaloneShell titleKey="page.lms"><LMS user={user} /></StandaloneShell>} />
        <Route path="/standalone/merit" element={<StandaloneShell titleKey="page.merit"><MeritBoard user={user} /></StandaloneShell>} />
        <Route path="/standalone/cadet-journey" element={<StandaloneShell titleKey="page.cadetJourney"><CadetJourney /></StandaloneShell>} />
        <Route path="/standalone/hpo" element={<StandaloneShell titleKey="page.hpo"><StreamPage user={user} which="hpo" /></StandaloneShell>} />
        <Route path="/standalone/military" element={<StandaloneShell titleKey="page.military"><StreamPage user={user} which="military" /></StandaloneShell>} />
        <Route path="/standalone/conduct" element={<StandaloneShell titleKey="page.conduct"><StreamPage user={user} which="conduct" /></StandaloneShell>} />
        <Route path="*" element={<Navigate to={homeFor(user.role)} replace />} />
      </Routes>
    );
  }

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        {/* Content swapped per request: the Executive route now renders the
            operational Command-Center view (exec's single screen, enriched),
            and the Command Center route renders the high-level Executive view.
            `titleKey` keeps each route's H1 matching its sidebar label. */}
        <Route path="/executive" element={<CommandCenter user={user} titleKey="page.executive" />} />
        <Route path="/" element={<ExecutiveOverview user={user} titleKey="page.command" />} />
        {/* <Route path="/digital-twin" element={<DigitalTwin />} /> old isometric-SVG twin */}
        <Route path="/digital-twin" element={<DigitalTwin2 />} />
        <Route path="/digital-twin-2" element={<DigitalTwin2 />} />
        <Route path="/smart-classrooms" element={<SmartClassrooms />} />
        <Route path="/academic" element={<Academic />} />
        <Route path="/readiness" element={<Readiness />} />
        <Route path="/enterprise" element={<Enterprise />} />
        <Route path="/campus-ops" element={<CampusOps />} />
        <Route path="/iot" element={<IoTSensors />} />
        <Route path="/incidents" element={<IncidentManagement />} />
        {/* Extended modules kept in the sidebar */}
        <Route path="/it-ops" element={<ITManagement />} />
        <Route path="/security" element={<SecurityOps />} />
        <Route path="/integration" element={<Integration />} />
        {/* Generic-mode-only core module — Sustainability & Energy.
            The route is only REGISTERED when mode === 'generic'. In ZMU mode
            it does not exist at all, so manually entering /sustainability falls
            through to the catch-all below and is redirected home — exactly the
            project's existing behaviour for any unavailable route. */}
        {isGeneric && <Route path={GENERIC_ONLY_ROUTE} element={<Sustainability />} />}
        <Route path="*" element={<Navigate to={homeFor(user.role)} replace />} />
      </Routes>
    </Layout>
  );
}
