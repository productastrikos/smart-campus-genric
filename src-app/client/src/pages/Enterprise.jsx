import React, { useState } from 'react';
import { useApi, fmt } from '../services/api';
import KPICard, { IcoDollar, IcoClipboard, IcoPeople, IcoTrendUp, IcoCalendar, IcoDatabase } from '../components/KPICard';
import { Panel, StatusChip, sevChip, Loading, PageHeader, KPIGrid, DataTable, ProgressBar } from '../components/ui';
import { TrendChart, Bars, Donut, C } from '../components/charts';
import KPIDetailPanel from '../components/KPIDetailPanel';
import { SiaAgentInline } from '../components/SiaAgent';
import { useLang } from '../i18n';
import { useAppMode } from '../appMode';

/* GENERIC MODE display remaps for the Enterprise & Finance module.
   All figures (budget, spend, headcount, attrition, PO values, ageing,
   cashflow) are REAL backend data and pass through untouched - only the
   ZMU/military-specific LABELS are relabelled. Anything already neutral
   (Academic Programs, ICT & Digital Campus, Finance & Procurement,
   Catering, IT Hardware, Software Licences...) maps to itself. */
const GENERIC_COST_CENTER_MAP = {
  'Military Training': 'Training & Development',
  'Medical & HPO': 'Health & Wellness',
};
const GENERIC_DEPARTMENT_MAP = {
  'Military Training Wing': 'Training & Development',
  'Cadet Affairs': 'Student Affairs',
  'Medical & HPO': 'Health & Wellness',
  'Security & Protocol': 'Security & Safety',
};
const GENERIC_PO_CATEGORY_MAP = {
  'Uniforms & Kit': 'Workwear & Equipment',
};
const GENERIC_SUPPLIER_MAP = {
  'Al Ain Uniforms': 'Al Ain Workwear',
  'Sheikh Zayed Labs Supply': 'Metro Labs Supply',
  'Falcon Facilities Co': 'Summit Facilities Co',
};
/* Headcount split: "Military / Civilian / Outsourced" is a defence
   staffing model. The generic equivalent keeps the same three real
   numbers under neutral employment-type labels. */
const GENERIC_HEADCOUNT_LABELS = { Military: 'Permanent', Civilian: 'Contract', Outsourced: 'Outsourced' };

export default function Enterprise() {
  const { data, error } = useApi('/enterprise');
  const { lang } = useLang();
  const { isGeneric } = useAppMode();
  const ar = lang === 'ar';
  const [detail, setDetail] = useState(null);
  if (error) return <Panel title="Error">{String(error)}</Panel>;
  if (!data) return <Loading text={ar ? 'جارٍ تحميل مجال المؤسسة…' : 'Loading enterprise domain…'} />;
  const k = data.kpis;

  /* Display-only remaps. Declared AFTER the !data guard above, since
     `data` is null on the first render before the API resolves. */
  const gl = (map, v) => (isGeneric && map[v]) || v;
  const budget = isGeneric
    ? (data.budget || []).map((r) => ({ ...r, cost_center: gl(GENERIC_COST_CENTER_MAP, r.cost_center) }))
    : data.budget;
  const departments = isGeneric
    ? (data.departments || []).map((r) => ({ ...r, department: gl(GENERIC_DEPARTMENT_MAP, r.department) }))
    : data.departments;
  const recentPos = isGeneric
    ? (data.recentPos || []).map((r) => ({
        ...r,
        supplier: gl(GENERIC_SUPPLIER_MAP, r.supplier),
        category: gl(GENERIC_PO_CATEGORY_MAP, r.category),
        department: gl(GENERIC_DEPARTMENT_MAP, r.department),
      }))
    : data.recentPos;
  const approvals = isGeneric
    ? (data.approvals || []).map((r) => ({
        ...r,
        supplier: gl(GENERIC_SUPPLIER_MAP, r.supplier),
        category: gl(GENERIC_PO_CATEGORY_MAP, r.category),
        department: gl(GENERIC_DEPARTMENT_MAP, r.department),
      }))
    : data.approvals;
  const vendorSpend = isGeneric
    ? (data.vendorSpend || []).map((r) => ({ ...r, supplier: gl(GENERIC_SUPPLIER_MAP, r.supplier) }))
    : data.vendorSpend;

  /* AP/AR ageing buckets: the raw labels ("1-30 days", "31-60 days",
     "61-90 days", "90+ days") are too long for five categories in this
     narrow panel and collide on the x-axis. Shorten the DISPLAY label
     only - "days" is already implied by the bucket format and the panel
     subtitle. Applied in BOTH modes, since the overlap is a layout
     problem, not a ZMU/Generic one. The underlying values are untouched. */
  const aging = (data.aging || []).map((r) => ({
    ...r,
    bucket: r.bucket.replace(/\s*days$/i, '').trim(),
  }));

  const headcountDonut = [
    { name: isGeneric ? GENERIC_HEADCOUNT_LABELS.Military : 'Military', value: data.departments.reduce((s, d) => s + d.military, 0), color: C.blue },
    { name: isGeneric ? GENERIC_HEADCOUNT_LABELS.Civilian : 'Civilian', value: data.departments.reduce((s, d) => s + d.civilian, 0), color: C.violet },
    { name: isGeneric ? GENERIC_HEADCOUNT_LABELS.Outsourced : 'Outsourced', value: data.departments.reduce((s, d) => s + d.outsourced, 0), color: C.amber },
  ];

  return (
    <>
      <PageHeader
        title={ar ? 'المؤسسة والمالية' : 'Enterprise & Finance'}
        subtitle={isGeneric ? 'Unified ERP — Finance & GL · HRMS / Workforce · Procurement · Scheduling · statutory reporting interface (flow 2)' : (ar ? 'تخطيط موارد موحّد على السحابة السيادية — المالية · الموارد البشرية · المشتريات · الجدولة · واجهة وزارة المالية' : 'Unified ERP on sovereign cloud — Finance & GL · HRMS / Manpower · Procurement · Scheduling · DoF statutory interface (flow 2)')}
        right={<StatusChip kind="success">{ar ? 'توافر النظام ٩٩٫٩٧٪' : 'ERP AVAILABILITY 99.97%'}</StatusChip>}
      />

      <KPIGrid>
        <KPICard label={isGeneric ? 'Operational Budget' : (ar ? 'ميزانية موازنة' : 'Muwazana Budget')} value={k.budgetTotal} unit={ar ? 'مليون درهم' : 'M AED'} icon={<IcoDollar />} rag="normal"
          subValues={[{ label: ar ? 'المُستخدم' : 'Utilized', value: `${k.budgetUsedPct}%` }, { label: ar ? 'الخطة (منتصف العام)' : 'Plan (mid-year)', value: '50%' }]}
          onClick={() => setDetail({
            title: isGeneric ? 'Operational Budget' : 'Muwazana Budget', subtitle: `${k.budgetTotal}M AED total · ${k.budgetUsedPct}% utilized vs 50% mid-year plan`, source: 'ERP — Finance & GL',
            stats: [
              { label: 'Total budget', value: `${k.budgetTotal}`, sub: 'M AED' },
              { label: 'Utilized', value: `${k.budgetUsedPct}%`, tone: k.budgetUsedPct > 55 ? 'warn' : 'up' },
              { label: 'Mid-year plan', value: '50%' },
            ],
            content: <Bars data={budget} x="cost_center" layout="vertical" height={260}
              series={[
                { key: 'budget_maed', name: 'Budget', color: C.slate },
                { key: 'actual_maed', name: 'Actual', color: C.blue },
              ]} />,
          })} />
        <KPICard label={ar ? 'قيمة أوامر الشراء المفتوحة' : 'Open PO Value'} value={k.openPoValue} unit={ar ? 'مليون درهم' : 'M AED'} icon={<IcoClipboard />} rag="normal"
          subValues={[{ label: ar ? 'بانتظار الاعتماد' : 'Pending approval', value: k.posPendingApproval }]}
          onClick={() => setDetail({
            title: 'Open PO Value', subtitle: `${k.openPoValue}M AED open · ${k.posPendingApproval} pending approval`, source: 'ERP — Procurement',
            stats: [
              { label: 'Open value', value: `${k.openPoValue}`, sub: 'M AED' },
              { label: 'Pending approval', value: k.posPendingApproval, tone: 'warn' },
              { label: 'Suppliers', value: '10', sub: 'active' },
            ],
            content: (
              <DataTable maxHeight={280}
                columns={[
                  { key: 'po_id', label: 'PO' },
                  { key: 'supplier', label: 'Supplier' },
                  { key: 'value_kaed', label: 'Value kAED', align: 'right', render: (v) => v.toLocaleString() },
                  { key: 'status', label: 'Status', render: (v) => <StatusChip kind={['Paid', 'Delivered'].includes(v) ? 'success' : v === 'Pending Approval' ? 'warning' : 'info'}>{v.toUpperCase()}</StatusChip> },
                ]}
                rows={recentPos} />
            ),
          })} />
        <KPICard label={ar ? 'عدد الموظفين' : 'Headcount'} value={fmt.int(k.headcount)} icon={<IcoPeople />} rag="normal"
          subValues={[{ label: ar ? 'الملاك' : 'Establishment', value: fmt.int(k.establishment) }, { label: ar ? 'الشواغر' : 'Vacancies', value: k.vacancies }]}
          onClick={() => setDetail({
            title: 'Headcount', subtitle: `${fmt.int(k.headcount)} of ${fmt.int(k.establishment)} established positions filled`, source: 'HRMS — Workforce Planning',
            stats: [
              { label: 'Headcount', value: fmt.int(k.headcount) },
              { label: 'Vacancies', value: k.vacancies, sub: 'open positions', tone: 'warn' },
              { label: 'Attrition', value: `${k.attrition}%`, tone: k.attrition > 6 ? 'warn' : 'up' },
            ],
            content: (
              <>
                <Donut data={headcountDonut} nameKey="name" valueKey="value" height={190} />
                <DataTable maxHeight={200}
                  columns={[
                    { key: 'department', label: 'Department' },
                    { key: 'headcount', label: 'HC', align: 'right' },
                    { key: 'vacancies', label: 'Vac.', align: 'right' },
                  ]}
                  rows={departments} />
              </>
            ),
          })} />
        <KPICard label={ar ? 'معدل الاستنزاف' : 'Attrition (avg)'} value={`${k.attrition}%`} icon={<IcoTrendUp />} rag={k.attrition > 6 ? 'warning' : 'normal'}
          subValues={[{ label: ar ? 'الاستعانة الخارجية' : 'Outsourced', value: fmt.int(k.outsourced) }]}
          onClick={() => setDetail({
            title: 'Attrition (avg)', subtitle: `${k.attrition}% average across departments`, source: 'HRMS — Workforce Planning',
            content: (
              <DataTable
                columns={[
                  { key: 'department', label: 'Department' },
                  { key: 'attrition_pct', label: 'Attr %', align: 'right', render: (v) => <b style={{ color: v > 7 ? 'var(--app-danger)' : 'var(--app-text)' }}>{v}</b> },
                ]}
                rows={[...departments].sort((a, b) => b.attrition_pct - a.attrition_pct)} />
            ),
          })} />
        <KPICard label={ar ? 'استخدام القاعات' : 'Room Utilization'} value={`${k.roomUtilization}%`} icon={<IcoCalendar />} rag="normal"
          subValues={[{ label: ar ? 'المصدر' : 'Source', value: ar ? 'الجدولة الرئيسية' : 'Master scheduling' }]}
          onClick={() => setDetail({
            title: 'Room Utilization', subtitle: `${k.roomUtilization}% average across all space types`, source: 'ERP — Master Scheduling',
            content: (
              <DataTable
                columns={[
                  { key: 'space_type', label: 'Space' },
                  { key: 'utilization_pct', label: 'Util %', align: 'right' },
                  { key: 'no_show_pct', label: 'No-show', align: 'right', render: (v) => `${v}%` },
                ]}
                rows={data.rooms} />
            ),
          })} />
        <KPICard label={isGeneric ? 'Statutory Interface' : (ar ? 'واجهة وزارة المالية' : 'DoF Interface')} value={ar ? 'سليمة' : 'OK'} icon={<IcoDatabase />} rag="normal"
          subValues={[{ label: ar ? 'آخر دفعة نظامية' : 'Last statutory push', value: '02:00 GST' }]}
          onClick={() => setDetail({
            title: isGeneric ? 'Statutory Interface' : 'DoF Interface', subtitle: isGeneric ? 'Statutory batch to the finance authority' : 'Statutory batch to Department of Finance', source: isGeneric ? 'ERP ↔ statutory interface (flow 2)' : 'ERP ↔ DoF (flow 2)',
            content: (
              <>
                <p style={{ fontSize: 12, color: 'var(--app-text-muted)', lineHeight: 1.7, marginBottom: 12 }}>
                  The ERP pushes chart of accounts, GL postings and budget transfers to the Department of Finance
                  on a nightly scheduled batch (last run 02:00 GST), governed by an approved ICD.
                </p>
                <TrendChart data={data.cashflow} x="month" height={200}
                  series={[{ key: 'dof_transfer_maed', name: isGeneric ? 'Statutory transfers M AED' : 'DoF transfers M AED', color: C.cyan, area: true }]} />
              </>
            ),
          })} />
      </KPIGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
        <Panel title={ar ? 'الميزانية مقابل الفعلي حسب مركز التكلفة' : 'Budget vs Actual by Cost Center'} sub={isGeneric ? 'Executive budget dashboard · variance vs 50% mid-year plan' : (ar ? 'لوحة موازنة التنفيذية · الانحراف مقابل خطة منتصف العام ٥٠٪' : 'Muwazana executive dashboard · variance vs 50% mid-year plan')}>
          <Bars data={budget} x="cost_center" layout="vertical" height={250}
            series={[
              { key: 'budget_maed', name: 'Budget M AED', color: C.slate },
              { key: 'actual_maed', name: 'Actual M AED', color: C.blue },
              { key: 'committed_maed', name: 'Committed', color: C.amber },
            ]} />
        </Panel>
        <Panel title={ar ? 'التدفّق النقدي — ١٢ شهرًا' : 'Cash Flow — 12 Months'} sub={ar ? 'عرض الخزينة شاملًا تحويلات وزارة المالية' : 'Treasury view incl. Department of Finance transfers'}>
          <TrendChart data={data.cashflow} x="month" height={250}
            series={[
              { key: 'inflow_maed', name: 'Inflow', color: C.green, area: true },
              { key: 'outflow_maed', name: 'Outflow', color: C.red },
              { key: 'dof_transfer_maed', name: isGeneric ? 'Statutory transfers' : 'DoF transfers', color: C.cyan, dash: true },
            ]} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 14, marginBottom: 14 }}>
        <Panel title="Procurement Pipeline" sub="60 active POs by lifecycle stage">
          <Bars data={data.procurementFunnel} x="status" layout="vertical" height={250} hideLegend
            series={[{ key: 'count', name: 'POs', color: C.violet }]} />
        </Panel>
        <Panel title="Top Purchase Orders" sub="By value — supplier portal linked">
          <DataTable maxHeight={250}
            columns={[
              { key: 'po_id', label: 'PO' },
              { key: 'supplier', label: 'Supplier' },
              { key: 'category', label: 'Category' },
              { key: 'value_kaed', label: 'Value kAED', align: 'right', render: (v) => <b style={{ color: 'var(--app-text)' }}>{v.toLocaleString()}</b> },
              { key: 'status', label: 'Status', render: (v) => <StatusChip kind={['Paid', 'Delivered'].includes(v) ? 'success' : v === 'Pending Approval' ? 'warning' : 'info'}>{v.toUpperCase()}</StatusChip> },
              { key: 'days_open', label: 'Days', align: 'right' },
            ]}
            rows={recentPos} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        <Panel title="HRMS — Workforce Mix" sub="Hire-to-retire · outsourced manpower governance">
          <Donut data={headcountDonut} nameKey="name" valueKey="value" height={210} />
        </Panel>

        <Panel title="Departments — Establishment vs Headcount" sub="Workforce planning module">
          <DataTable maxHeight={220}
            columns={[
              { key: 'department', label: 'Department' },
              { key: 'headcount', label: 'HC', align: 'right' },
              { key: 'establishment', label: 'Est.', align: 'right' },
              { key: 'vacancies', label: 'Vac.', align: 'right', render: (v) => <span style={{ color: v > 15 ? 'var(--app-warning)' : 'var(--app-text-muted)', fontWeight: 600 }}>{v}</span> },
              { key: 'attrition_pct', label: 'Attr %', align: 'right', render: (v) => <span style={{ color: v > 7 ? 'var(--app-danger)' : 'var(--app-text-muted)' }}>{v}</span> },
            ]}
            rows={departments} />
        </Panel>

        <Panel title="Recruitment Funnel" sub="Manpower request → onboarding (QTD)">
          {data.recruitment.map((r, i) => (
            <div key={r.stage} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                <span style={{ color: 'var(--app-text)' }}>{r.stage}</span>
                <b style={{ color: 'var(--app-text-muted)' }}>{r.count}</b>
              </div>
              <ProgressBar pct={(r.count / Math.max(...data.recruitment.map((x) => x.count))) * 100} color={`hsl(${215 - i * 8}, 70%, ${58 - i * 3}%)`} />
            </div>
          ))}
        </Panel>

        <Panel title="Master Scheduling — Space Utilization" sub="Room booking across campus">
          <DataTable
            columns={[
              { key: 'space_type', label: 'Space' },
              { key: 'total', label: 'Total', align: 'right' },
              { key: 'booked_today', label: 'Booked', align: 'right' },
              { key: 'utilization_pct', label: 'Util %', align: 'right', render: (v) => <b style={{ color: v > 85 ? 'var(--app-warning)' : 'var(--app-text)' }}>{v}%</b> },
              { key: 'no_show_pct', label: 'No-show', align: 'right', render: (v) => `${v}%` },
            ]}
            rows={data.rooms} />
        </Panel>

        {/* Budget Variance by Cost Centre. Fills the empty cells left in
            this auto-fit grid, using variance_pct from finance_budget.csv -
            real data that the module already loads but never rendered
            anywhere. Relevant in BOTH modes: over/under-spend against plan
            is a core finance metric for any organisation, not a
            ZMU-specific concept. Labels flow through the existing
            `budget` array, so the Generic cost-centre remap applies
            automatically and no new mapping is introduced. */}
        <Panel title="Budget Variance by Cost Centre" sub="Actual vs plan · % over (+) or under (−) budget">
          <Bars
            data={[...budget].sort((a, b) => b.variance_pct - a.variance_pct)}
            x="cost_center" layout="vertical" height={250} hideLegend catWidth={150}
            series={[{
              key: 'variance_pct', name: 'Variance %',
              // Over budget reads as a warning, under budget as healthy -
              // matching how the rest of the app colours RAG status.
              cellColors: (d) => (d.variance_pct > 0 ? C.amber : C.teal),
              color: C.teal,
            }]} />
        </Panel>

        {/* Budget Commitment Status. Fills the third cell of this auto-fit
            grid using committed_maed from finance_budget.csv - a real column
            the module loads but never charted. Stacked so each bar totals
            its cost centre's full budget: spent + committed + remaining.
            Verified against the source that the three reconcile exactly and
            no remaining value is negative. Mode-neutral by nature - budget
            commitment is a standard finance view, and the labels flow
            through the same `budget` array, so the Generic cost-centre
            remap applies automatically. */}
        <Panel title="Budget Commitment Status" sub="Spent · committed · uncommitted balance (M AED)">
          <Bars
            data={[...budget]
              .sort((a, b) => b.budget_maed - a.budget_maed)
              .map((r) => ({
                cost_center: r.cost_center,
                spent: r.actual_maed,
                committed: r.committed_maed,
                // Floored at 0 so an over-committed centre can never render
                // a negative segment; none do in the current data.
                remaining: Math.max(0, +(r.budget_maed - r.actual_maed - r.committed_maed).toFixed(1)),
              }))}
            x="cost_center" layout="vertical" height={250} stacked catWidth={150}
            series={[
              { key: 'spent', name: 'Spent', color: C.blue },
              { key: 'committed', name: 'Committed', color: C.amber },
              { key: 'remaining', name: 'Uncommitted', color: C.slate },
            ]} />
        </Panel>
      </div>

      {/* ── AP/AR aging · vendor spend · approvals ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 14 }}>
        <Panel title="Receivables vs Payables — Aging" sub="AP/AR buckets · kAED · treasury view">
          <Bars data={aging} x="bucket" height={250}
            series={[
              { key: 'receivables_kaed', name: 'Receivables', color: C.blue },
              { key: 'payables_kaed', name: 'Payables', color: C.amber },
            ]} />
        </Panel>
        <Panel title="Top Vendor Spend" sub="Aggregated from the PO ledger · kAED">
          <Bars data={vendorSpend} x="supplier" layout="vertical" height={230} hideLegend
            series={[{ key: 'value_kaed', name: 'Spend', color: C.teal }]} />
        </Panel>
        <Panel title="Approvals Pending" sub="POs awaiting sign-off — most-aged first"
          right={<StatusChip kind={approvals.length ? 'warning' : 'success'}>{approvals.length} WAITING</StatusChip>}>
          <DataTable maxHeight={230}
            columns={[
              { key: 'ref', label: 'PO' },
              { key: 'supplier', label: 'Supplier' },
              { key: 'value_kaed', label: 'kAED', align: 'right', render: (v) => v.toLocaleString() },
              { key: 'days', label: 'Days', align: 'right', render: (v) => <b style={{ color: v > 20 ? 'var(--app-danger)' : v > 10 ? 'var(--app-warning)' : 'var(--app-text-muted)' }}>{v}</b> },
            ]}
            rows={approvals} />
        </Panel>
      </div>

      {/* ── ERP-scoped assistant — lives only on this module ──────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14, marginTop: 14, alignItems: 'start' }}>
        <div>
          <div className="panel-title" style={{ marginBottom: 8 }}>ERP Assistant</div>
          <SiaAgentInline mode="erp" />
        </div>
        <Panel title="Why an ERP-scoped assistant?" sub="Module-specific — not the campus-wide SiA">
          <p style={{ fontSize: 12, color: 'var(--app-text-muted)', lineHeight: 1.7 }}>
            The <b>generic SiA assistant</b> (the floating “Ask SiA” button) is available on every page for
            campus-wide questions. This <b>ERP Assistant</b> is scoped to the Enterprise &amp; Finance module —
            it answers on budget utilisation, procurement pipeline, headcount, attrition, cash flow and the
            Department of Finance interface, drawing on live ERP/HRMS figures.
          </p>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--app-text-faint)', lineHeight: 1.6 }}>
            Demo mode: responses are fixed, keyword-matched answers with live numbers interpolated in — no
            external LLM is called.
          </div>
        </Panel>
      </div>

      <KPIDetailPanel open={!!detail} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail?.subtitle} source={detail?.source} stats={detail?.stats}>
        {detail?.content}
      </KPIDetailPanel>
    </>
  );
}
