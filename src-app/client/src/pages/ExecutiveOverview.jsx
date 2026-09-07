import React, { useState } from 'react';
import { useApi, fmt } from '../services/api';
import { Panel, Loading, PageHeader, StatusChip, sevChip, DataTable } from '../components/ui';
import { TrendChart, Bars, RadarPanel, Donut, C, ZONE_COLORS } from '../components/charts';
import KPICard, { IcoTarget, IcoHeart, IcoAlert, IcoCheck, IcoPeople, IcoActivity, IcoDollar, IcoWatch, IcoMoon } from '../components/KPICard';
import KPIDetailPanel from '../components/KPIDetailPanel';
import SmartWatchPanel from '../components/SmartWatchPanel';
import { useLang } from '../i18n';
import { useAppMode } from '../appMode';

/* Executive Overview — a deliberately high-level, low-detail view for senior
   leadership: plain-language headline KPIs (each with a one-click, one-line
   definition), a couple of easy-to-read comparison charts, and a rotating
   AI insight panel. No operational or technical detail. */

export default function ExecutiveOverview({ titleKey }) {
  const { t, lang } = useLang();
  const { isGeneric } = useAppMode();
  const { data } = useApi('/overview');
  // ZMU-only feed. Generic Mode passes null so the request is never
  // made at all (see useApi in services/api.js) - the readiness data is
  // military/cadet-specific (composite & wearable readiness, ACWR
  // injury risk, sleep, readiness-by-squadron), so Generic Mode must
  // not fetch it and then hide it, it must not ask for it.
  const { data: readiness } = useApi(isGeneric ? null : '/readiness');
  // Generic-mode-only sources, both real existing endpoints:
  //  - /iot/sensors  -> genuine device-health counts (total/online/faults)
  //    used to replace the ZMU "Readiness & Performance" domain card.
  //  - /alerts       -> the SAME alert records as /overview but UNSLICED
  //    (server/index.js line 148 caps /overview at slice(0,8), which is
  //    what left a short list once ZMU rows were filtered out).
  const { data: iot } = useApi(isGeneric ? '/iot/sensors' : null);
  const { data: allAlerts } = useApi(isGeneric ? '/alerts' : null);
  // Generic-mode-only: real per-building environmental readings
  // (temp / CO2 / occupancy) from the BMS, used for the Campus
  // Environment panel that replaces the ZMU wellbeing trend.
  const { data: campus } = useApi(isGeneric ? '/campus' : null);
  const ar = lang === 'ar';
  const chip = (s) => (ar ? t(`status.${s}`) : s.toUpperCase());
  const [detail, setDetail] = useState(null);
  if (!data || (!isGeneric && !readiness)) return <Loading text={t('common.loadingExec')} />;
  const k = data.kpis;

  /* domainStatus is real backend data (server/index.js line 142). Two of
     its four entries are genuinely generic (Enterprise & Finance, Smart
     Campus Operations); two are ZMU-specific:
       - "Readiness & Performance" -> "80.4 readiness" / "N high injury
         risk" (avg readiness_score + ACWR>1.4 count, both wearable data)
       - "Academics & Learning"    -> sub is "N at-risk cadets"

     Generic Mode REPLACES the readiness card with a real IoT device-health
     card built from /api/iot/sensors (total / online / faults) - genuine
     existing values, not invented - so the row keeps four cards and no
     gap appears. The academic card is kept (avg GPA is not ZMU-specific)
     with only its cadet-worded sub dropped. */
  /* The ZMU "readinessBySquadron" series is keyed by military company
     names (Falcon / Oryx / Saqr / Ghaf) - these surfaced in every
     View Details chart. Generic Mode substitutes a real per-building
     series derived from campus.comfort (/api/campus <- bms_hourly.csv):
     genuine occupancy readings per building, with the real building name
     kept in `full` for tooltips and a SHORTENED display label to stop
     the x-axis labels overlapping (screenshot 3). Nothing fabricated -
     only real BMS values, relabelled to the buildings they came from. */
  const shortLabel = (n = '') => n
    .replace(/^Command HQ & Admin$/i, 'Admin')
    .replace(/^Central Library$/i, 'Library')
    .replace(/^Applied Labs Centre$/i, 'Labs')
    .replace(/^Dining Facility$/i, 'Dining')
    .replace(/^Auditorium & Parade Hall$/i, 'Auditorium')
    .replace(/^Central Plant & Data Centre$/i, 'Plant')
    .replace(/^Academic Block ([AB])$/i, 'Academic $1')
    .replace(/^HPO & Sports Complex$/i, 'Sports')
    .replace(/^Cadet Accommodation (North|South)$/i, 'Residence $1')
    .replace(/^Armoury & WMS$/i, 'Stores');

  const genericBuildingSeries = (campus?.comfort || []).map((b) => ({
    squadron: shortLabel(b.name),
    full: b.name,
    composite: b.occupancy,
    fitness: b.occupancy,
    academic: b.occupancy,
  }));
  // In Generic Mode every chart that used readinessBySquadron reads this
  // real building-derived series instead.
  const activeGroupSeries = isGeneric ? genericBuildingSeries : data.readinessBySquadron;

  const iotKpis = iot?.kpis;
  const genericSystemsCard = iotKpis ? {
    key: 'systems',
    link: '/iot',
    name: 'Building Systems Health',
    status: iotKpis.faults > 5 ? 'critical' : iotKpis.faults > 0 ? 'warning' : 'healthy',
    metric: `${iotKpis.online}/${iotKpis.total} devices online`,
    sub: `${iotKpis.faults} need attention`,
  } : null;

  const activeDomainStatus = isGeneric
    ? data.domainStatus
        .filter((d) => d.key !== 'readiness')
        .map((d) => (/cadet|squadron|military/i.test(d.sub || '') ? { ...d, sub: '' } : d))
        .concat(genericSystemsCard ? [genericSystemsCard] : [])
    : data.domainStatus;

  /* Alerts: ZMU uses /overview's list (server-capped at 8). Generic uses
     the UNSLICED /alerts feed, filters out the 3 ZMU-specific records,
     then takes 8 - so the panel fills with 8 REAL alerts instead of
     leaving short rows. Same records, same shape, nothing fabricated. */
  const ZMU_ALERT_PATTERN = /cadet|acwr|hpo|armoury|weapon|field exercise|squadron|saqr|falcon|oryx|ghaf|military|readiness/i;
  const activeAlerts = isGeneric
    ? (allAlerts?.alerts || [])
        .filter((a) => !ZMU_ALERT_PATTERN.test(`${a.title} ${a.domain} ${a.source}`))
        .slice(0, 8)
    : data.alerts;

  return (
    <>
      <PageHeader
        title={isGeneric ? 'Operations Centre' : t(titleKey || 'page.executive')}
        subtitle={isGeneric ? 'Real-time campus operations, facilities, infrastructure, security and services.' : t('exec.subtitle')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
        <KPICard label={isGeneric ? 'System Availability' : t('exec.kpi.composite')} value={k.compositeReadiness} unit="/ 100" icon={<IcoTarget />}
          rag={k.compositeReadiness >= 75 ? 'normal' : 'warning'}
          subValues={[{ label: isGeneric ? 'Connected assets' : t('exec.sub.cadets'), value: fmt.int(k.cadetsEnrolled) }]}
          onClick={() => setDetail(isGeneric ? {
            title: 'System Availability',
            definition: 'One overall score for how available connected operations are, blending uptime, response time and throughput.',
            subtitle: `${k.compositeReadiness}/100 across ${fmt.int(k.cadetsEnrolled)} connected assets`,
            stats: [
              { label: 'Score', value: `${k.compositeReadiness}`, sub: '/ 100', tone: 'up' },
              { label: 'Assets', value: fmt.int(k.cadetsEnrolled) },
              { label: t('exec.sub.attendance'), value: `${k.attendanceAvg}%` },
            ],
            content: <Bars data={activeGroupSeries} x="squadron" height={220}
              series={[{ key: 'composite', name: 'Availability score', color: C.blue }]} hideLegend />,
          } : {
            title: t('exec.kpi.composite'),
            definition: ar ? 'درجة إجمالية واحدة لمدى جاهزية جسم الطلبة، تمزج الأكاديميا واللياقة والسلوك.' : 'One overall score for how ready the cadet body is, blending academics, fitness and conduct.',
            subtitle: ar ? `${k.compositeReadiness}/١٠٠ عبر ${fmt.int(k.cadetsEnrolled)} طالب ضابط` : `${k.compositeReadiness}/100 across ${fmt.int(k.cadetsEnrolled)} officer cadets`,
            stats: [
              { label: ar ? 'الدرجة' : 'Score', value: `${k.compositeReadiness}`, sub: '/ 100', tone: 'up' },
              { label: isGeneric ? 'Connected assets' : t('exec.sub.cadets'), value: fmt.int(k.cadetsEnrolled) },
              { label: t('exec.sub.attendance'), value: `${k.attendanceAvg}%` },
            ],
            content: <Bars data={activeGroupSeries} x="squadron" height={220}
              series={[{ key: 'composite', name: 'Composite score', color: C.blue }]} hideLegend />,
          })} />

        <KPICard label={isGeneric ? 'Occupant Wellbeing' : t('exec.kpi.wellbeing')} value={k.wearableReadiness} unit="/ 100" icon={<IcoHeart />}
          rag={k.wearableReadiness >= 75 ? 'normal' : 'warning'}
          subValues={[{ label: t('exec.sub.source'), value: isGeneric ? 'Environmental sensors' : t('exec.sub.trackers') }]}
          onClick={() => setDetail(isGeneric ? {
            title: 'Occupant Wellbeing',
            definition: 'A daily wellbeing score from connected environmental and occupancy sensors — comfort, air quality and safety.',
            subtitle: `${k.wearableReadiness}/100 average today`,
            stats: [
              { label: 'Today', value: `${k.wearableReadiness}`, sub: '/ 100' },
              { label: 'Availability', value: `${k.compositeReadiness}`, sub: '/ 100' },
            ],
            // No chart in Generic Mode - the only trend available here is
            // readiness.trend, which Generic Mode never fetches.
          } : {
            title: t('exec.kpi.wellbeing'),
            definition: ar ? 'درجة صحة يومية من أجهزة تتبّع اللياقة لدى الطلبة — النوم والتعافي وصحة القلب.' : 'A daily wellbeing score from cadets’ fitness trackers — sleep, recovery and heart health.',
            subtitle: ar ? `${k.wearableReadiness}/١٠٠ المتوسط اليوم` : `${k.wearableReadiness}/100 average today`,
            stats: [
              { label: ar ? 'اليوم' : 'Today', value: `${k.wearableReadiness}`, sub: '/ 100' },
              { label: ar ? 'المركّبة' : 'Composite', value: `${k.compositeReadiness}`, sub: '/ 100' },
            ],
            content: <TrendChart data={readiness.trend} x="date" height={220}
              series={[{ key: 'readiness', name: 'Wellbeing score', color: C.teal, area: true }]} />,
          })} />

        <KPICard label={t('exec.kpi.openIssues')} value={k.criticalAlerts} icon={<IcoAlert />}
          rag={k.criticalAlerts > 3 ? 'critical' : k.criticalAlerts > 0 ? 'warning' : 'normal'}
          subValues={[{ label: t('exec.sub.totalOpen'), value: k.openAlerts }]}
          onClick={() => setDetail({
            title: t('exec.kpi.openIssues'),
            definition: ar ? 'عدد المسائل عالية الأولوية المفتوحة حاليًا عبر الحرم والتي تحتاج انتباه القيادة.' : 'The number of high-priority issues currently open across the campus that need leadership attention.',
            subtitle: ar ? `${k.criticalAlerts} عالية الأولوية من ${k.openAlerts} مفتوحة إجمالًا` : `${k.criticalAlerts} high-priority of ${k.openAlerts} open in total`,
            stats: [
              { label: ar ? 'عالية الأولوية' : 'High priority', value: k.criticalAlerts, tone: 'down' },
              { label: t('exec.sub.totalOpen'), value: k.openAlerts },
            ],
            content: (
              <div>
                {activeDomainStatus.map((d) => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 2px', borderBottom: '1px solid var(--app-surface-raised)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--app-text)' }}>{d.name}</span>
                    <StatusChip kind={sevChip(d.status)}>{chip(d.status)}</StatusChip>
                  </div>
                ))}
              </div>
            ),
          })} />

        <KPICard label={t('exec.kpi.systemsHealth')} value={k.integrationHealth} unit="%" icon={<IcoCheck />}
          rag={k.integrationHealth >= 90 ? 'normal' : 'warning'}
          subValues={[{ label: t('exec.sub.systems'), value: `${k.systemsOnline}/${k.systemsTotal}` }]}
          onClick={() => setDetail({
            title: t('exec.kpi.systemsHealth'),
            definition: ar ? 'مدى جودة تشغيل الأنظمة الرقمية المتصلة بالجامعة، كنسبة مئوية إجمالية واحدة.' : 'How well the university’s connected digital systems are running, as one overall percentage.',
            subtitle: ar ? `${k.integrationHealth}٪ من الأنظمة المتصلة سليمة` : `${k.integrationHealth}% of connected systems healthy`,
            stats: [
              { label: ar ? 'الصحة' : 'Health', value: `${k.integrationHealth}%`, tone: k.integrationHealth < 90 ? 'warn' : 'up' },
              { label: t('status.online'), value: `${k.systemsOnline}/${k.systemsTotal}` },
            ],
            content: (
              <div>
                {activeDomainStatus.map((d) => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 2px', borderBottom: '1px solid var(--app-surface-raised)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--app-text)' }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--app-text-faint)' }}>{d.metric}</span>
                  </div>
                ))}
              </div>
            ),
          })} />

        <KPICard label={t('exec.kpi.occupancy')} value={k.occupancyNow} unit="%" icon={<IcoPeople />} rag="normal"
          subValues={[{ label: t('exec.sub.energyToday'), value: `${fmt.k(k.energyTodayKwh)} kWh` }]}
          onClick={() => setDetail({
            title: t('exec.kpi.occupancy'),
            definition: ar ? 'نسبة مباني الحرم المستخدمة حاليًا، وكيف تقارن باستهلاك الطاقة اليوم.' : 'Share of campus buildings currently in use, and how that compares with today’s energy use.',
            subtitle: ar ? `${k.occupancyNow}٪ من الحرم قيد الاستخدام الآن` : `${k.occupancyNow}% of campus in use right now`,
            stats: [
              { label: t('exec.kpi.occupancy'), value: `${k.occupancyNow}%` },
              { label: t('exec.sub.energyToday'), value: fmt.k(k.energyTodayKwh), sub: 'kWh' },
            ],
            content: <TrendChart data={data.occupancyEnergy} x="hour" height={220} rightAxisKeys={['kwh']}
              series={[
                { key: 'occupancy', name: 'Building usage %', color: C.blue, area: true },
                { key: 'kwh', name: 'Energy used', color: C.amber },
              ]} />,
          })} />

        <KPICard label={t('exec.kpi.availability')} value={`${k.systemsOnline}/${k.systemsTotal}`} icon={<IcoActivity />}
          rag={k.systemsOnline >= k.systemsTotal - 1 ? 'normal' : 'warning'}
          subValues={[{ label: t('exec.sub.attendance'), value: `${k.attendanceAvg}%` }]}
          onClick={() => setDetail({
            title: t('exec.kpi.availability'),
            definition: ar ? 'كم عدد الأنظمة الرقمية بالجامعة المتصلة والمتاحة الآن.' : 'How many of the university’s digital systems are online and available right now.',
            subtitle: ar ? `${k.systemsOnline} من ${k.systemsTotal} نظامًا متصلًا` : `${k.systemsOnline} of ${k.systemsTotal} systems online`,
            stats: [
              { label: t('status.online'), value: `${k.systemsOnline}/${k.systemsTotal}`, tone: 'up' },
              { label: t('exec.sub.attendance'), value: `${k.attendanceAvg}%` },
            ],
            content: (
              <p style={{ fontSize: 12, color: 'var(--app-text-muted)', lineHeight: 1.6 }}>
                {isGeneric
                  ? `${k.systemsOnline} of ${k.systemsTotal} platform systems are online and reporting normally. Average campus user activity today is ${k.attendanceAvg}%.`
                  : ar
                  ? `${k.systemsOnline} من ${k.systemsTotal} من أنظمة المنصة متصلة وتُبلّغ بشكل طبيعي. متوسط حضور الطلبة اليوم ${k.attendanceAvg}٪.`
                  : `${k.systemsOnline} of ${k.systemsTotal} platform systems are online and reporting normally. Average cadet attendance today is ${k.attendanceAvg}%.`}
              </p>
            ),
          })} />

        {/* Extra informative KPIs */}
        <KPICard label={isGeneric ? 'Students Enrolled' : t('exec.kpi.cadetsEnrolled')} value={fmt.int(k.cadetsEnrolled)} icon={<IcoPeople />} rag="normal"
          subValues={[{ label: isGeneric ? 'Departments' : t('cc.sub.companies'), value: '4' }]}
          onClick={() => setDetail(isGeneric ? {
            title: 'Students Enrolled',
            definition: 'Total students currently enrolled across the four campus departments.',
            subtitle: `${fmt.int(k.cadetsEnrolled)} students enrolled`,
            content: <Bars data={activeGroupSeries} x="squadron" height={200}
              series={[{ key: 'composite', name: 'Performance', color: C.blue }]} hideLegend />,
          } : {
            title: t('exec.kpi.cadetsEnrolled'),
            definition: ar ? 'إجمالي الطلبة الضباط المسجّلين حاليًا عبر السرايا الأربع.' : 'Total officer cadets currently enrolled across the four companies.',
            subtitle: `${fmt.int(k.cadetsEnrolled)} ${ar ? 'طالب ضابط' : 'officer cadets'}`,
            content: <Bars data={activeGroupSeries} x="squadron" height={200}
              series={[{ key: 'composite', name: ar ? 'المركّبة' : 'Composite', color: C.blue }]} hideLegend />,
          })} />

        <KPICard label={t('exec.kpi.budget')} value={`${k.budgetUtilization}%`} icon={<IcoDollar />}
          rag={k.budgetUtilization > 55 ? 'warning' : 'normal'}
          subValues={[{ label: t('exec.sub.midYearPlan'), value: '50%' }]}
          onClick={() => setDetail({
            title: t('exec.kpi.budget'),
            definition: ar ? 'نسبة الميزانية السنوية المُستخدمة حتى الآن، مقابل خطة منتصف العام.' : 'Share of the annual budget spent so far, against the mid-year plan.',
            subtitle: `${k.budgetUtilization}% ${ar ? 'مُستخدم' : 'utilized'}`,
            stats: [{ label: ar ? 'المُستخدم' : 'Utilized', value: `${k.budgetUtilization}%`, tone: k.budgetUtilization > 55 ? 'down' : 'up' }, { label: ar ? 'الخطة' : 'Plan', value: '50%' }],
          })} />

        {/* Readiness-derived KPIs — ZMU ONLY. These are sourced entirely
            from the /readiness feed (ACWR injury risk, Garmin device
            sync, cadet sleep), which Generic Mode never fetches, so they
            are removed rather than relabelled. */}
        {!isGeneric && (
          <>
            <KPICard label={t('exec.kpi.highInjuryRisk')} value={readiness.kpis.highInjuryRisk} icon={<IcoAlert />}
              rag={readiness.kpis.highInjuryRisk > 8 ? 'critical' : 'warning'}
              subValues={[{ label: ar ? 'القاعدة' : 'Rule', value: 'ACWR > 1.4' }]}
              onClick={() => setDetail({
                title: t('exec.kpi.highInjuryRisk'),
                definition: ar ? 'عدد الطلبة الذين يتجاوز عبء التدريب لديهم الحد الآمن (ACWR)، مما يستدعي تدخلًا مبكرًا.' : 'Cadets whose training load ratio (ACWR) exceeds the safe threshold — an early-intervention flag.',
                subtitle: `${readiness.kpis.highInjuryRisk} ${ar ? 'طالب معرّض' : 'cadets flagged'}`,
                content: <RadarPanel data={readiness.radar} angleKey="domain" height={200}
                  series={[{ key: 'score', name: ar ? 'الدفعة' : 'Cohort', color: C.blue }]} />,
              })} />

            <KPICard label={t('exec.kpi.deviceSync')} value={`${readiness.kpis.deviceSyncRate}%`} icon={<IcoWatch />}
              rag={readiness.kpis.deviceSyncRate < 90 ? 'warning' : 'normal'}
              subValues={[{ label: ar ? 'الأسطول' : 'Fleet', value: ar ? '٣٠٠ جهاز' : '300 devices' }]}
              onClick={() => setDetail({
                title: t('exec.kpi.deviceSync'),
                definition: ar ? 'نسبة أجهزة Garmin المُصدرة للطلبة التي زامنت بياناتها خلال آخر ١٢ ساعة.' : 'Share of the issued Garmin fleet that has synced telemetry within the last 12 hours.',
                subtitle: `${readiness.kpis.deviceSyncRate}% ${ar ? 'مُزامن' : 'synced'}`,
              })} />

            <KPICard label={t('exec.kpi.avgSleep')} value={readiness.kpis.avgSleep} unit={ar ? 'ساعة' : 'hrs'} icon={<IcoMoon />}
              rag={readiness.kpis.avgSleep < 6.5 ? 'warning' : 'normal'}
              subValues={[{ label: ar ? 'الهدف' : 'Target', value: ar ? '≥ ٧٫٠ ساعة' : '≥ 7.0 h' }]}
              onClick={() => setDetail({
                title: t('exec.kpi.avgSleep'),
                definition: ar ? 'متوسط ساعات نوم الطلبة الليلية عبر الدفعة، من الأجهزة القابلة للارتداء.' : 'Average nightly sleep across the cohort, from wearable devices.',
                subtitle: `${readiness.kpis.avgSleep}h ${ar ? 'متوسط' : 'average'}`,
                content: <TrendChart data={readiness.trend} x="date" height={200}
                  series={[{ key: 'sleep', name: ar ? 'النوم' : 'Sleep', color: C.cyan, area: true }]} />,
              })} />
          </>
        )}
      </div>

      {/* Smart Watch command-staff wellness + programme health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 14, marginBottom: 14, alignItems: 'stretch' }}>
        <SmartWatchPanel />
        <Panel title={t('exec.panel.programme')} sub={t('exec.panel.programmeSub')}>
          {activeDomainStatus.map((d) => (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 2px', borderBottom: '1px solid var(--app-surface-raised)' }}>
              <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--app-text)' }}>{d.name}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--app-text-faint)' }}>{d.metric}</span>
                <StatusChip kind={sevChip(d.status)}>{chip(d.status)}</StatusChip>
              </span>
            </div>
          ))}
        </Panel>
      </div>

      {/* Analytics — comparisons & trends (1) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
        <Panel title={isGeneric ? 'Department Performance Comparison' : t('exec.panel.companyComparison')} sub={isGeneric ? 'Comparative operational performance across campus departments' : t('exec.panel.companyComparisonSub')}>
          <Bars data={isGeneric ? activeGroupSeries.slice(0, 8) : activeGroupSeries} x="squadron" height={isGeneric ? 260 : 230} angledLabels={isGeneric}
            series={isGeneric ? [
              { key: 'composite', name: 'Availability', color: C.blue },
              { key: 'fitness', name: 'Utilization', color: C.violet },
              { key: 'academic', name: 'Performance', color: C.cyan },
            ] : [
              { key: 'composite', name: ar ? 'المركّبة' : 'Composite', color: C.blue },
              { key: 'fitness', name: ar ? 'اللياقة' : 'Fitness', color: C.violet },
              { key: 'academic', name: ar ? 'الأكاديمي' : 'Academic', color: C.cyan },
            ]} />
        </Panel>
        <Panel title={isGeneric ? 'Availability Share by Department' : t('exec.panel.companyShare')} sub={isGeneric ? 'Relative share of overall system availability' : t('exec.panel.companyShareSub')}>
          <Donut data={activeGroupSeries} nameKey="squadron" valueKey="composite" height={230} colors={ZONE_COLORS} />
        </Panel>
      </div>

      {/* Analytics — comparisons & trends (2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
        <Panel title={t('exec.panel.usageEnergy')} sub={t('exec.panel.usageEnergySub')}>
          <TrendChart data={data.occupancyEnergy} x="hour" height={230} rightAxisKeys={['kwh']}
            series={[
              { key: 'occupancy', name: ar ? 'استخدام المباني ٪' : 'Building usage %', color: C.blue, area: true },
              { key: 'kwh', name: ar ? 'الطاقة المستهلكة' : 'Energy used', color: C.amber },
            ]} />
        </Panel>
        {!isGeneric && (
          <Panel title={t('exec.panel.wellbeingTrend')} sub={t('exec.panel.wellbeingTrendSub')}>
            <TrendChart data={readiness.trend} x="date" height={230}
              series={[{ key: 'readiness', name: ar ? 'درجة الصحة' : 'Wellbeing score', color: C.teal, area: true }]} />
          </Panel>
        )}
        {isGeneric && (
          /* Generic replacement for the ZMU "Cadet Wellbeing Trend".
             Powered by REAL data: campus.comfort from /api/campus, which
             the server builds from bms_hourly.csv - actual per-building
             temperature and CO2 readings. Nothing fabricated, and the
             grid column stays filled so no empty space is left. */
          <Panel title="Campus Environment" sub="Indoor air quality by building — live BMS readings">
            {campus?.comfort ? (
              <Bars
                data={campus.comfort.slice(0, 8).map((b) => ({ ...b, label: shortLabel(b.name) }))}
                x="label" height={250} angledLabels
                series={[{ key: 'co2', name: 'CO₂ ppm', color: C.teal }]} hideLegend />
            ) : <Loading />}
          </Panel>
        )}
      </div>

      {/* Analytics — comparisons & trends (3) — ZMU ONLY, both panels are
          readiness-sourced (readiness domains radar + HRV/sleep recovery). */}
      {!isGeneric && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
          <Panel title={t('exec.panel.readinessDomains')} sub={t('exec.panel.readinessDomainsSub')}>
            <RadarPanel data={readiness.radar} angleKey="domain" height={230}
              series={[{ key: 'score', name: ar ? 'الدفعة' : 'Cohort', color: C.blue }]} />
          </Panel>
          <Panel title={t('exec.panel.recoveryTrend')} sub={t('exec.panel.recoveryTrendSub')}>
            <TrendChart data={readiness.trend} x="date" height={230} rightAxisKeys={['sleep']}
              series={[
                { key: 'hrv', name: 'HRV', color: C.violet, area: true },
                { key: 'sleep', name: ar ? 'النوم' : 'Sleep', color: C.cyan },
              ]} />
          </Panel>
        </div>
      )}

      {/* Analytics — comparisons & trends (4) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
        <Panel title={t('exec.panel.alertsBySeverity')} sub={t('exec.panel.alertsBySeveritySub')}>
          <Bars
            data={['critical', 'high', 'medium', 'low'].map((sev) => ({
              severity: ar ? t(`severity.${sev}`) : sev.toUpperCase(),
              count: activeAlerts.filter((a) => a.severity === sev).length,
            }))}
            x="severity" height={220} hideLegend
            series={[{ key: 'count', name: ar ? 'العدد' : 'Count', color: C.red }]} />
        </Panel>
        <Panel title={t('exec.panel.domainHealth')} sub={t('exec.panel.domainHealthSub')}>
          <Donut
            data={['healthy', 'warning', 'critical'].map((st) => ({
              status: chip(st), value: activeDomainStatus.filter((d) => d.status === st).length,
              color: st === 'healthy' ? C.green : st === 'warning' ? C.amber : C.red,
            })).filter((d) => d.value > 0)}
            nameKey="status" valueKey="value" height={220} />
        </Panel>
      </div>

      <KPIDetailPanel open={!!detail} onClose={() => setDetail(null)}
        title={detail?.title} subtitle={detail?.subtitle} definition={detail?.definition} stats={detail?.stats}>
        {detail?.content}
      </KPIDetailPanel>
    </>
  );
}
