import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, fmt } from '../services/api';
import KPICard, { IcoBolt, IcoDroplet, IcoGlobe, IcoBuilding, IcoActivity, IcoBarChart } from '../components/KPICard';
import { Panel, StatusChip, Loading, PageHeader, KPIGrid, DataTable } from '../components/ui';
import { TrendChart, Bars, C } from '../components/charts';
import KPIDetailPanel from '../components/KPIDetailPanel';
import { genericBuildingName } from '../genericBuildings';

/**
 * SUSTAINABILITY & ENERGY — Generic-mode core module.
 * ===================================================================
 * Every figure on this page is aggregated by GET /api/sustainability from
 * two existing datasets only: data/energy_daily.csv (building_id, date,
 * kwh, water_m3, solar_kwh) and data/buildings.csv (area_m2, type, floors).
 *
 * Deliberately NOT shown, because the source data does not support it:
 *   - grid import      — `kwh` is metered consumption recorded independently
 *                        of `solar_kwh`, so `kwh − solar_kwh` is not a valid
 *                        grid figure for this dataset.
 *   - peak demand (kW) — the series is daily energy, not instantaneous
 *                        demand, so the peak is reported as a consumption peak.
 *   - targets, benchmarks, savings, forecasts, year-on-year trends — none of
 *                        these exist in the data and none are invented here.
 *
 * The only stated assumption is the grid emission factor used for the
 * carbon estimate; it is returned by the API and printed on the card.
 *
 * Building labels are resolved through genericBuildings.js at render time.
 * The real building_id is preserved for the Digital Twin deep links.
 */

/* "2026-06-21" → "21 Jun" (chart axis / compact display) */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[+m - 1]}`;
};
const longDate = (iso) => (iso ? `${shortDate(iso)} ${iso.slice(0, 4)}` : '—');
const n1 = (n) => (n == null ? '—' : Number(n).toFixed(1));
const n2 = (n) => (n == null ? '—' : Number(n).toFixed(2));

export default function Sustainability() {
  const { data, error } = useApi('/sustainability');
  const [detail, setDetail] = useState(null);

  if (error) return <Panel title="Data unavailable">Unable to load resource data: {String(error)}</Panel>;
  if (!data) return <Loading text="Loading sustainability & energy…" />;

  const { period, totals, assumptions, meta, daily, buildings, peakConsumptionDay } = data;

  /* ── period, derived from the data itself — never hard-coded ── */
  const periodLabel = `${shortDate(period.start)} – ${shortDate(period.end)} ${String(period.end || '').slice(0, 4)}`;
  const dayLabel = `${period.days}-day consumption`;

  /* ── derived, real-data-only figures ── */
  const carbonTonnes = totals.carbon_kg / 1000;
  const solarShare = totals.kwh ? (totals.solar_kwh / totals.kwh) * 100 : 0;
  const avgDailyKwh = period.days ? totals.kwh / period.days : 0;

  /* ── chart series (built from the returned rows, nothing synthesised) ── */
  const trend = daily.map((d) => ({ day: shortDate(d.date), kwh: d.kwh, water: d.water_m3 }));
  const solarTrend = daily
    .map((d) => ({ day: shortDate(d.date), solar: d.solar_kwh }))
    .filter(() => totals.solar_kwh > 0);

  const solarBuildings = buildings.filter((b) => b.hasSolar);
  const solarVsUse = solarBuildings.map((b) => ({
    name: genericBuildingName(b.building_id),
    consumption: b.kwh,
    solar: b.solar_kwh,
  }));

  const intensityRank = buildings
    .filter((b) => b.intensity != null)
    .slice()
    .sort((a, b) => b.intensity - a.intensity)
    .map((b) => ({ name: genericBuildingName(b.building_id), intensity: b.intensity }));

  const waterRank = buildings
    .slice()
    .sort((a, b) => b.water_m3 - a.water_m3)
    .map((b) => ({ name: genericBuildingName(b.building_id), water: b.water_m3 }));

  /* Detail-panel table reused by several cards. */
  const buildingRows = buildings.map((b) => ({
    ...b,
    label: genericBuildingName(b.building_id),
  }));

  return (
    <>
      <PageHeader
        title="Sustainability & Energy"
        subtitle="Campus resource consumption, generation and efficiency"
      />

      <KPIGrid min={200}>
        {/* 1 — Energy Consumption ─ sum of energy_daily.kwh */}
        <KPICard label="Energy Consumption" value={fmt.int(totals.kwh)} unit="kWh" icon={<IcoBolt />} rag="normal"
          subValues={[
            { label: 'Period', value: dayLabel },
            { label: 'Daily average', value: `${fmt.int(Math.round(avgDailyKwh))} kWh` },
          ]}
          onClick={() => setDetail({
            title: 'Energy Consumption',
            subtitle: `${fmt.int(totals.kwh)} kWh metered across ${meta.buildingsReporting} buildings · ${periodLabel}`,
            source: 'Energy metering — daily building series',
            definition: `Sum of the daily metered consumption recorded for every reporting building over the full available period (${period.days} days, ${longDate(period.start)} to ${longDate(period.end)}). No period outside the dataset is shown.`,
            stats: [
              { label: 'Total', value: `${fmt.int(totals.kwh)} kWh` },
              { label: 'Daily avg', value: fmt.int(Math.round(avgDailyKwh)) },
              { label: 'Buildings', value: meta.buildingsReporting },
            ],
            advisory: [
              `Highest single day in the series is ${longDate(peakConsumptionDay?.date)} at ${fmt.int(peakConsumptionDay?.kwh)} kWh, ${n1(((peakConsumptionDay?.kwh || 0) / (avgDailyKwh || 1) - 1) * 100)}% above the period daily average.`,
              'The dataset covers daily totals only; no sub-daily interval data is available to attribute this consumption to specific plant or time-of-day.',
            ],
            content: <TrendChart data={trend} x="day" height={240} type="area"
              series={[{ key: 'kwh', name: 'Consumption (kWh)', color: C.blue, area: true }]} />,
          })} />

        {/* 2 — Solar Generation ─ sum of energy_daily.solar_kwh */}
        <KPICard label="Solar Generation" value={fmt.int(totals.solar_kwh)} unit="kWh" icon={<IcoActivity />} rag="normal"
          subValues={[
            { label: 'Instrumented buildings', value: `${meta.solarInstrumentedBuildings} of ${meta.buildingsReporting}` },
            { label: 'Vs metered use', value: `${n1(solarShare)}%` },
          ]}
          onClick={() => setDetail({
            title: 'Solar Generation',
            subtitle: `${fmt.int(totals.solar_kwh)} kWh recorded at ${meta.solarInstrumentedBuildings} of ${meta.buildingsReporting} buildings · ${periodLabel}`,
            source: 'On-site generation — instrumented buildings only',
            definition: `Sum of recorded solar generation. Only ${meta.solarInstrumentedBuildings} of the ${meta.buildingsReporting} reporting buildings return a non-zero generation value, so this is not a campus-wide generation figure and is not presented as one.`,
            stats: [
              { label: 'Generated', value: `${fmt.int(totals.solar_kwh)} kWh` },
              { label: 'Instrumented', value: `${meta.solarInstrumentedBuildings} / ${meta.buildingsReporting}` },
              { label: 'Of metered use', value: `${n1(solarShare)}%` },
            ],
            advisory: [
              `Recorded generation is equivalent to ${n1(solarShare)}% of total metered consumption over the same period.`,
              'Consumption and generation are recorded as independent series in this dataset, so a net grid-import figure cannot be derived from it and is not shown.',
            ],
            content: (
              <DataTable
                columns={[
                  { key: 'label', label: 'Building' },
                  { key: 'solar_kwh', label: 'Generated (kWh)', align: 'right', render: (v) => fmt.int(v) },
                  { key: 'kwh', label: 'Metered use (kWh)', align: 'right', render: (v) => fmt.int(v) },
                ]}
                rows={buildingRows.filter((b) => b.hasSolar)} />
            ),
          })} />

        {/* 3 — Water Consumption ─ sum of energy_daily.water_m3 */}
        <KPICard label="Water Consumption" value={fmt.int(totals.water_m3)} unit="m³" icon={<IcoDroplet />} rag="normal"
          subValues={[
            { label: 'Period', value: `${period.days} days` },
            { label: 'Daily average', value: `${fmt.int(Math.round(totals.water_m3 / (period.days || 1)))} m³` },
          ]}
          onClick={() => setDetail({
            title: 'Water Consumption',
            subtitle: `${fmt.int(totals.water_m3)} m³ across ${meta.buildingsReporting} buildings · ${periodLabel}`,
            source: 'Water metering — daily building series',
            definition: 'Sum of the daily metered water volume recorded for every reporting building over the available period.',
            stats: [
              { label: 'Total', value: `${fmt.int(totals.water_m3)} m³` },
              { label: 'Daily avg', value: fmt.int(Math.round(totals.water_m3 / (period.days || 1))) },
              { label: 'Buildings', value: meta.buildingsReporting },
            ],
            advisory: [
              `Highest-consuming building over the period is ${waterRank[0]?.name} at ${fmt.int(waterRank[0]?.water)} m³.`,
              'The dataset records volume only; no sub-metering by end use (domestic, irrigation, cooling make-up) is available.',
            ],
            content: <TrendChart data={trend} x="day" height={240} type="area"
              series={[{ key: 'water', name: 'Water (m³)', color: C.cyan, area: true }]} />,
          })} />

        {/* 4 — Estimated Carbon ─ energy × stated grid factor (clearly an estimate) */}
        <KPICard label="Estimated Carbon" value={n1(carbonTonnes)} unit="tCO2e" icon={<IcoGlobe />} rag="normal"
          subValues={[
            { label: 'Basis', value: `Est. · ${assumptions.gridEmissionFactorLabel}` },
            { label: 'Applied to', value: `${fmt.int(totals.kwh)} kWh` },
          ]}
          onClick={() => setDetail({
            title: 'Estimated Carbon',
            subtitle: `${n1(carbonTonnes)} tCO2e estimated · based on ${assumptions.gridEmissionFactorLabel}`,
            source: 'Estimated — calculated, not measured',
            definition: `This is an ESTIMATE, not measured emissions data. It is metered consumption multiplied by a stated grid emission factor of ${assumptions.gridEmissionFactorLabel}: ${fmt.int(totals.kwh)} kWh × ${assumptions.gridEmissionFactorKgPerKwh} = ${fmt.int(totals.carbon_kg)} kg CO2e = ${n1(carbonTonnes)} tCO2e. No emissions are metered anywhere in this dataset.`,
            stats: [
              { label: 'Estimated', value: `${n1(carbonTonnes)} tCO2e` },
              { label: 'In kg', value: fmt.int(totals.carbon_kg) },
              { label: 'Factor', value: assumptions.gridEmissionFactorKgPerKwh },
            ],
            advisory: [
              `The factor is a stated assumption applied uniformly to all metered consumption; replacing it with a supplier-specific factor would scale this figure proportionally.`,
              'Recorded on-site generation is not deducted, because consumption and generation are independent series in this dataset — so this figure should be read as gross, not net.',
            ],
            content: (
              <DataTable
                columns={[
                  { key: 'label', label: 'Building' },
                  { key: 'kwh', label: 'Energy (kWh)', align: 'right', render: (v) => fmt.int(v) },
                  { key: 'carbon', label: 'Est. tCO2e', align: 'right', render: (v, r) => n1((r.kwh * assumptions.gridEmissionFactorKgPerKwh) / 1000) },
                ]}
                rows={[...buildingRows].sort((a, b) => b.kwh - a.kwh)} />
            ),
          })} />

        {/* 5 — Energy Intensity ─ kWh ÷ buildings.area_m2 */}
        <KPICard label="Energy Intensity" value={n2(totals.intensity_kwh_m2)} unit="kWh/m²" icon={<IcoBarChart />} rag="normal"
          subValues={[
            { label: 'Floor area', value: `${fmt.int(totals.area_m2)} m²` },
            { label: 'Over', value: `${period.days} days` },
          ]}
          onClick={() => setDetail({
            title: 'Energy Intensity',
            subtitle: `${n2(totals.intensity_kwh_m2)} kWh/m² over ${period.days} days · ${fmt.int(totals.area_m2)} m² of recorded floor area`,
            source: 'Energy metering ÷ recorded floor area',
            definition: `Metered consumption divided by the floor area held in the building records: ${fmt.int(totals.kwh)} kWh ÷ ${fmt.int(totals.area_m2)} m² = ${n2(totals.intensity_kwh_m2)} kWh/m². This covers the ${meta.buildingsWithArea} of ${meta.buildingsReporting} buildings that have a recorded area; no area is estimated or substituted where it is missing.`,
            stats: [
              { label: 'Campus', value: `${n2(totals.intensity_kwh_m2)} kWh/m²` },
              { label: 'Floor area', value: `${fmt.int(totals.area_m2)} m²` },
              { label: 'With area', value: `${meta.buildingsWithArea} / ${meta.buildingsReporting}` },
            ],
            advisory: [
              `Range across buildings is ${n2(intensityRank.at(-1)?.intensity)}–${n2(intensityRank[0]?.intensity)} kWh/m², with ${intensityRank[0]?.name} highest and ${intensityRank.at(-1)?.name} lowest for this period.`,
              'Intensity here is period-cumulative, not annualised — the dataset does not span a full year, so no annual figure is stated.',
            ],
            content: <Bars data={intensityRank} x="name" height={Math.max(240, intensityRank.length * 26)} layout="vertical" hideLegend catWidth={158}
              series={[{ key: 'intensity', name: 'kWh/m²', color: C.teal }]} />,
          })} />

        {/* 6 — Peak Consumption Day ─ max of the daily series (NOT demand, see note) */}
        <KPICard label="Peak Consumption Day" value={shortDate(peakConsumptionDay?.date)} icon={<IcoBuilding />} rag="normal"
          subValues={[
            { label: 'Consumption', value: `${fmt.int(peakConsumptionDay?.kwh)} kWh` },
            { label: 'Vs daily avg', value: `+${n1(((peakConsumptionDay?.kwh || 0) / (avgDailyKwh || 1) - 1) * 100)}%` },
          ]}
          onClick={() => setDetail({
            title: 'Peak Consumption Day',
            subtitle: `${longDate(peakConsumptionDay?.date)} · ${fmt.int(peakConsumptionDay?.kwh)} kWh`,
            source: 'Energy metering — daily building series',
            definition: 'The highest-consumption day in the available daily series. The source records daily energy (kWh), not instantaneous demand (kW), so this is a consumption peak and is not described as a demand peak — no kW or kVA figure can be derived from this dataset.',
            stats: [
              { label: 'Date', value: shortDate(peakConsumptionDay?.date) },
              { label: 'Consumption', value: `${fmt.int(peakConsumptionDay?.kwh)} kWh` },
              { label: 'Daily avg', value: fmt.int(Math.round(avgDailyKwh)) },
            ],
            advisory: [
              `This day sits ${n1(((peakConsumptionDay?.kwh || 0) / (avgDailyKwh || 1) - 1) * 100)}% above the ${fmt.int(Math.round(avgDailyKwh))} kWh period daily average.`,
              'Half-hourly or hourly interval data would be required to identify the contributing load or the time of peak; it is not present in this dataset.',
            ],
            content: <TrendChart data={trend} x="day" height={240}
              series={[{ key: 'kwh', name: 'Daily consumption (kWh)', color: C.amber }]} />,
          })} />
      </KPIGrid>

      {/* ── A. Energy consumption trend (+ water on a secondary axis) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Energy Consumption Trend"
          sub={`Daily metered consumption across ${meta.buildingsReporting} buildings · water shown on the right-hand axis (m³) as the units differ · ${periodLabel}`}
        >
          <TrendChart data={trend} x="day" height={272} rightAxisKeys={['water']}
            series={[
              { key: 'kwh', name: 'Energy (kWh)', color: C.blue, area: true },
              { key: 'water', name: 'Water (m³)', color: C.cyan },
            ]} />
        </Panel>

        {/* ── B. Solar generation — shown independently, no grid derivation ── */}
        {/* The long "why grid-import isn't shown" note was removed: it
            explained an ABSENCE, which no viewer needs. The two facts worth
            keeping - the real total/share, and that only some buildings are
            instrumented - are folded into the subtitle instead. */}
        <Panel
          title="Solar Generation"
          sub={totals.solar_kwh > 0
            ? `${fmt.int(totals.solar_kwh)} kWh · ${n1(solarShare)}% of metered consumption · recorded at ${meta.solarInstrumentedBuildings} of ${meta.buildingsReporting} buildings`
            : `Recorded at ${meta.solarInstrumentedBuildings} of ${meta.buildingsReporting} buildings — not campus-wide`}
        >
          {totals.solar_kwh > 0 ? (
            <TrendChart data={solarTrend} x="day" height={272} type="area"
              series={[{ key: 'solar', name: 'Generation (kWh)', color: C.green, area: true }]} />
          ) : (
            <div style={{ padding: '24px 4px', fontSize: 12, color: 'var(--app-text-faint)' }}>
              No generation values are recorded for this period.
            </div>
          )}
        </Panel>
      </div>

      {/* ── Generation vs metered use, instrumented buildings only ── */}
      {solarVsUse.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.55fr)', gap: 14, marginBottom: 14 }}>
          <Panel
            title="Generation vs Metered Use"
            sub="Instrumented buildings only — both series as recorded, not netted"
          >
            <Bars data={solarVsUse} x="name" height={230}
              series={[
                { key: 'consumption', name: 'Metered use (kWh)', color: C.blue },
                { key: 'solar', name: 'Generation (kWh)', color: C.green },
              ]} />
          </Panel>

          {/* ── C. Energy intensity by building ── */}
          <Panel
            title="Energy Intensity by Building"
            sub={`kWh per m² of recorded floor area over the available period · ${meta.buildingsWithArea} of ${meta.buildingsReporting} buildings have a recorded area`}
          >
            <Bars data={intensityRank} x="name" height={230} layout="vertical" hideLegend catWidth={158}
              series={[{ key: 'intensity', name: 'kWh/m²', color: C.teal }]} />
          </Panel>
        </div>
      )}

      {/* ── D. Water consumption by building ── */}
      <div style={{ marginBottom: 14 }}>
        <Panel title="Water Consumption by Building" sub={`Total metered volume (m³) per building · ${periodLabel}`}>
          <Bars data={waterRank} x="name" height={250} hideLegend
            series={[{ key: 'water', name: 'Water (m³)', color: C.cyan }]} />
        </Panel>
      </div>

      {/* ── Building breakdown ── */}
      <Panel
        title="Building Breakdown"
        sub={`Per-building totals for the available period · ${periodLabel}`}
        right={<StatusChip kind="accent">{`${buildings.length} buildings`}</StatusChip>}
      >
        <DataTable
          maxHeight={420}
          columns={[
            { key: 'label', label: 'Building', render: (v) => (
              <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{v}</span>
            ) },
            { key: 'kwh', label: 'Energy (kWh)', align: 'right', render: (v) => fmt.int(v) },
            { key: 'solar_kwh', label: 'Solar (kWh)', align: 'right', render: (v, r) => (
              r.hasSolar ? fmt.int(v) : <span style={{ color: 'var(--app-text-faint)' }}>Not instrumented</span>
            ) },
            { key: 'water_m3', label: 'Water (m³)', align: 'right', render: (v) => fmt.int(v) },
            { key: 'area_m2', label: 'Area (m²)', align: 'right', render: (v) => (v ? fmt.int(v) : <span style={{ color: 'var(--app-text-faint)' }}>—</span>) },
            { key: 'intensity', label: 'Intensity (kWh/m²)', align: 'right', render: (v) => (v == null ? <span style={{ color: 'var(--app-text-faint)' }}>—</span> : n2(v)) },
            {
              key: 'building_id',
              label: 'Digital Twin',
              // The real building_id from the source records is preserved and used
              // for the deep link — only the visible label above is transformed.
              render: (v) => (
                <Link to={`/digital-twin?building=${v}`} style={{ color: '#22d3ee', textDecoration: 'none' }}>
                  Open ↗
                </Link>
              ),
            },
          ]}
          rows={[...buildingRows].sort((a, b) => b.kwh - a.kwh)} />

        <div style={{ marginTop: 11, fontSize: 10.5, color: 'var(--app-text-faint)', lineHeight: 1.6 }}>
          Energy, solar and water are period totals as metered. Area is taken from the building records.
          Intensity is period energy ÷ recorded area and is not annualised. Estimated carbon uses
          a stated grid factor of {assumptions.gridEmissionFactorLabel} and is not measured emissions data.
        </div>
      </Panel>

      {/* Same detail-panel pattern as the existing core modules (CampusOps et al).
          `advisory` is passed explicitly on every card so the panel's generic
          keyword-matched advisory never fires — each line here is a statement
          computed from the same dataset the page renders. */}
      <KPIDetailPanel open={!!detail} onClose={() => setDetail(null)}
        title={detail?.title} subtitle={detail?.subtitle} source={detail?.source}
        definition={detail?.definition} stats={detail?.stats} advisory={detail?.advisory}>
        {detail?.content}
      </KPIDetailPanel>
    </>
  );
}
