import React from 'react';
import { useLang } from '../i18n';
import { useAppMode } from '../appMode';

/* Generic-mode label remap for portal names. Applied here rather than in
   config/portals.js so ZMU mode keeps the real portal names untouched and
   every page that renders a SourceLink row is covered by one change. The
   url/port are NOT remapped - those point at real running services. */
const GENERIC_PORTAL_LABELS = {
  'Cadet Experience Portal': 'Student Experience Portal',
  // The three below belong to the Readiness module, which App.jsx already
  // blocks in Generic Mode - included so the labels can never leak if that
  // portal row is ever surfaced elsewhere.
  'HPO Fitness & Readiness': 'Wellness & Performance',
  'Military Training Record': 'Training & Development Record',
  'Conduct & Discipline Register': 'Compliance & Policy Register',
};

/**
 * SourceLink — a row of "open the real source portal" links shown ABOVE a
 * module's KPIs. Each jumps to the real ZMU demo environment (a new tab); the
 * differentiator this dashboard adds is the AI advisory layer on top of them.
 * props: portals: [{ label, port, url }]
 */
export default function SourceLink({ portals }) {
  const { t } = useLang();
  const { isGeneric } = useAppMode();
  const portalLabel = (l) => (isGeneric && GENERIC_PORTAL_LABELS[l]) || l;
  if (!portals || !portals.length) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: 'var(--app-surface)', border: '1px solid var(--app-panel-border)',
      borderRadius: 12, padding: '10px 14px', marginBottom: 14,
    }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--app-text-faint)' }}>
        {t('common.sourceSystem')}
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
        {portals.map((p) => (
          <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 650,
              padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
              background: 'var(--app-accent-bg)', color: 'var(--app-accent)', border: '1px solid var(--app-accent-border)',
            }}>
            {portalLabel(p.label)}
            {p.port && <span className="ltr-num" style={{ opacity: 0.7, fontSize: 10 }}>:{p.port} ↗</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
