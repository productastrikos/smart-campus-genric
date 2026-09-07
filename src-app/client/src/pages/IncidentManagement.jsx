import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../services/api';
import KPICard, { IcoCamera, IcoAlert, IcoClipboard, IcoDatabase } from '../components/KPICard';
import { Panel, StatusChip, sevChip, Loading, PageHeader, KPIGrid, DataTable, timeAgo, ProgressBar } from '../components/ui';
import { CAMERA_GRID, GENERIC_CAMERA_GRID, GENERIC_CAMERAS, GENERIC_CAMERA_NAME_MAP, GENERIC_BUILDING_NAME_MAP } from '../config/cameras';
import { useAppMode } from '../appMode';

/* Incident Management — VMS live wall + flagged footage log.
   Stream URLs are mapped manually in src/config/cameras.js; slots without
   a URL render a simulated feed so the wall stays demo-ready. */

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function CameraTile({ cam, embedUrl, streamUrl, clock }) {
  const offline = cam?.status === 'offline';
  // Missing-file handling: if the configured video URL 404s or otherwise
  // fails to load, show a clean "Video unavailable" state instead of a
  // broken/blank <video> element, and log the actual attempted path for
  // debugging - never silently fall back to a different video.
  const [videoError, setVideoError] = useState(false);
  useEffect(() => {
    setVideoError(false); // reset whenever the URL for this slot changes (e.g. mode switch)
  }, [streamUrl]);

  return (
    <div className="cctv-tile">
      {offline ? (
        <div className="cctv-offline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 26, height: 26 }}>
            <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /><line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          SIGNAL LOST
        </div>
      ) : embedUrl ? (
        <iframe title={cam?.camera_id || 'camera'} src={embedUrl} className="cctv-frame"
          allow="autoplay; fullscreen" allowFullScreen scrolling="no" />
      ) : streamUrl && !videoError ? (
        <video
          src={streamUrl}
          autoPlay
          muted
          loop
          playsInline
          onError={() => {
            // eslint-disable-next-line no-console
            console.warn(`[CameraTile] Video failed to load for ${cam?.camera_id || 'unknown camera'}: ${streamUrl}`);
            setVideoError(true);
          }}
        />
      ) : streamUrl && videoError ? (
        <div className="cctv-offline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 26, height: 26 }}>
            <path d="M15 10l4.5 -3v10l-4.5 -3" /><rect x="1" y="5" width="14" height="14" rx="2" /><line x1="4" y1="9" x2="12" y2="9" />
          </svg>
          Video unavailable
        </div>
      ) : (
        <div className="cctv-feed" />
      )}
      <div className="cctv-label">
        {!offline && <span className="cctv-rec" />}
        {cam?.camera_id || '—'} · {cam?.name || 'Unassigned'}
      </div>
      <div className="cctv-ts">{clock.toLocaleTimeString('en-GB')} GST</div>
      {!offline && (
        <div className="cctv-meta">
          {cam?.building_name ? `${cam.building_name} · ` : ''}{cam?.resolution} · {cam?.fps} fps
        </div>
      )}
    </div>
  );
}

export default function IncidentManagement() {
  const { data } = useApi('/cctv');
  const clock = useClock();
  const { isGeneric } = useAppMode();

  // Both modes need the real /api/cctv data now: Generic Mode keeps the
  // real incident records and camera registry, only remapping the
  // ZMU-specific camera/building NAMES for display.
  if (!data) return <Loading text="Loading VMS module…" />;
  const k = data.kpis;

  /* Generic Mode display remap. The real incident data's types,
     descriptions, severities, timestamps, statuses and operators are
     already generic - only camera names and building names carry ZMU
     terminology, so only those are remapped. No record is dropped,
     invented, or renumbered. */
  const camName = (id, fallback) => (isGeneric && GENERIC_CAMERA_NAME_MAP[id]) || fallback;
  const bldName = (n) => (isGeneric && GENERIC_BUILDING_NAME_MAP[n]) || n;

  const activeCameras = isGeneric
    ? data.cameras.map((c) => ({ ...c, name: camName(c.camera_id, c.name) }))
    : data.cameras;
  const activeIncidents = isGeneric
    ? data.incidents.map((i) => ({
        ...i,
        camera: camName(i.camera_id, i.camera),
        building_name: bldName(i.building_name),
      }))
    : data.incidents;

  const camById = Object.fromEntries(activeCameras.map((c) => [c.camera_id, c]));
  const openIncidents = activeIncidents.filter((i) => i.status !== 'closed');

  // Live Camera Wall keeps its own dedicated generic video grid.
  const activeGrid = isGeneric ? GENERIC_CAMERA_GRID : CAMERA_GRID;
  const activeCamById = isGeneric ? Object.fromEntries(GENERIC_CAMERAS.map((c) => [c.camera_id, c])) : camById;

  const cameraHealthPanel = (
    <Panel title="Camera Health" sub={isGeneric ? 'CCTV registry — all channels' : 'VMS registry — all channels'}>
      <DataTable
        maxHeight={220}
        columns={[
          { key: 'camera_id', label: 'ID' },
          { key: 'name', label: 'Camera' },
          { key: 'status', label: 'Status', render: (v) => <StatusChip kind={v === 'online' ? 'success' : 'danger'}>{v.toUpperCase()}</StatusChip> },
        ]}
        rows={activeCameras} />
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--app-text-faint)', marginBottom: 4, fontWeight: 600 }}>STORAGE POOL — {k.storageUsedPct}% OF {k.retentionDays}-DAY RETENTION</div>
        <ProgressBar pct={k.storageUsedPct} />
      </div>
    </Panel>
  );

  return (
    <>
      <PageHeader
        title="Incident Management — CCTV"
        subtitle={isGeneric
          ? 'CCTV live wall · analytics-flagged footage · campus-wide video operations'
          : 'VMS live wall (ORANGE network) · analytics-flagged footage · stream URLs mapped in src/config/cameras.js'}
      />

      <KPIGrid>
        <KPICard label="Cameras Online" value={`${k.camerasOnline}/${k.camerasTotal}`} icon={<IcoCamera />}
          rag={k.camerasOnline < k.camerasTotal ? 'warning' : 'normal'}
          subValues={[{ label: 'Offline', value: k.camerasTotal - k.camerasOnline }]} />
        <KPICard label="Incidents — 24h" value={k.incidents24h} icon={<IcoAlert />} rag={k.incidents24h > 8 ? 'warning' : 'normal'} />
        <KPICard label="Open Incidents" value={k.openIncidents} icon={<IcoClipboard />}
          rag={k.openIncidents > 0 ? 'warning' : 'normal'}
          subValues={[{ label: 'Escalated', value: activeIncidents.filter((i) => i.status === 'escalated').length }]} />
        <KPICard label="Recording Retention" value={k.retentionDays} unit="days" icon={<IcoDatabase />}
          subValues={[{ label: 'Storage used', value: `${k.storageUsedPct}%` }]} />
      </KPIGrid>

      <Panel title="Live Camera Wall" sub={isGeneric ? '6-channel operator layout · Smart Digital Campus feeds' : '6-channel operator layout · feeds mapped in src/config/cameras.js'} style={{ marginBottom: 14 }}>
        <div className="cctv-grid">
          {activeGrid.map((slot) => (
            <CameraTile key={slot.slot} cam={activeCamById[slot.cameraId]} embedUrl={slot.embedUrl} streamUrl={slot.streamUrl} clock={clock} />
          ))}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        <Panel title="Flagged Footage" sub={isGeneric
          ? 'Video-analytics detections · clips retained for review · location links to the building\u2019s 3-D twin'
          : 'Video-analytics detections · clips retained for evidentiary review · location links to the building\u2019s 3-D twin'}>
          <DataTable
            maxHeight={340}
            columns={[
              { key: 'ts', label: 'Time', render: (v) => timeAgo(v) },
              { key: 'incident_id', label: 'Incident' },
              { key: 'camera_id', label: 'Camera' },
              { key: 'building_name', label: 'Location', render: (v, r) => r.building_id
                ? <Link to={`/digital-twin?building=${r.building_id}`} style={{ color: '#22d3ee', textDecoration: 'none' }}>{v} ↗</Link>
                : v },
              { key: 'type', label: 'Type' },
              { key: 'severity', label: 'Severity', render: (v) => <StatusChip kind={sevChip(v)}>{v.toUpperCase()}</StatusChip> },
              { key: 'clip_s', label: 'Clip', render: (v) => `${v}s`, align: 'right' },
              { key: 'status', label: 'Status', render: (v) => <StatusChip kind={v === 'closed' ? 'success' : v === 'escalated' ? 'danger' : 'warning'}>{v.toUpperCase()}</StatusChip> },
            ]}
            rows={activeIncidents} />
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Panel title="Reported Incidents" sub="Operator triage queue">
            {openIncidents.slice(0, 5).map((i) => (
              <div key={i.incident_id} style={{
                padding: '9px 12px', marginBottom: 6, borderRadius: 8, background: 'var(--app-surface-soft)',
                borderLeft: `3px solid ${i.severity === 'high' ? 'var(--app-danger)' : i.severity === 'medium' ? 'var(--app-warning)' : 'var(--app-info)'}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text)' }}>{i.type} — {i.camera_id}</div>
                <div style={{ fontSize: 10.5, color: 'var(--app-text-muted)', margin: '2px 0' }}>{i.description}</div>
                <div style={{ fontSize: 10, color: 'var(--app-text-faint)' }}>{timeAgo(i.ts)} · {i.operator} · {i.status}</div>
              </div>
            ))}
          </Panel>

          {cameraHealthPanel}
        </div>
      </div>
    </>
  );
}