'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SEVERITY_COLOR, type Severity } from '@aquasense/shared';
import { CHART, ChartFrame, chartTooltipStyle } from './ChartFrame';

function formatClock(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAxis(ts: number, spanMs: number) {
  const d = new Date(ts);
  if (spanMs > 36 * 3600_000) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return formatClock(ts);
}

export function TrendAreaChart({
  data,
  color = CHART.flow,
  unit,
  soft,
  warnHigh,
  critHigh,
  warnLow,
  critLow,
  height = 180,
  emptyLabel = 'No history yet',
}: {
  data: Array<{ t: number; value: number }>;
  color?: string;
  unit?: string;
  soft?: boolean;
  warnHigh?: number;
  critHigh?: number;
  warnLow?: number;
  critLow?: number;
  height?: number;
  emptyLabel?: string;
}) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-[12px] text-slate-500"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  const span = data[data.length - 1].t - data[0].t;
  const grid = soft ? CHART.gridLight : CHART.grid;
  const tick = soft ? CHART.muted : CHART.text;
  const gradientId = `trend-${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="3 6" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v) => formatAxis(Number(v), span)}
          tick={{ fill: tick, fontSize: 10 }}
          axisLine={{ stroke: grid }}
          tickLine={false}
          minTickGap={36}
        />
        <YAxis
          width={44}
          tick={{ fill: tick, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => String(v)}
        />
        <Tooltip
          contentStyle={chartTooltipStyle(soft)}
          labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
          formatter={(value) => [
            `${typeof value === 'number' ? value.toFixed(2) : value}${unit ? ` ${unit}` : ''}`,
            'Value',
          ]}
        />
        {warnHigh !== undefined && (
          <ReferenceLine y={warnHigh} stroke={CHART.warning} strokeDasharray="4 4" strokeOpacity={0.7} />
        )}
        {critHigh !== undefined && (
          <ReferenceLine y={critHigh} stroke={CHART.critical} strokeDasharray="4 4" strokeOpacity={0.8} />
        )}
        {warnLow !== undefined && (
          <ReferenceLine y={warnLow} stroke={CHART.warning} strokeDasharray="4 4" strokeOpacity={0.7} />
        )}
        {critLow !== undefined && (
          <ReferenceLine y={critLow} stroke={CHART.critical} strokeDasharray="4 4" strokeOpacity={0.8} />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SeverityDonut({
  counts,
  soft,
  height = 200,
}: {
  counts: Partial<Record<Severity, number>>;
  soft?: boolean;
  height?: number;
}) {
  const data = (['nominal', 'warning', 'critical', 'offline'] as Severity[])
    .map((key) => ({
      name: key,
      value: counts[key] ?? 0,
      color: SEVERITY_COLOR[key],
    }))
    .filter((d) => d.value > 0);

  const total = data.reduce((n, d) => n + d.value, 0);

  if (!total) {
    return (
      <div className="flex items-center justify-center text-[12px] text-slate-500" style={{ height }}>
        No sites yet
      </div>
    );
  }

  return (
    <ChartFrame title="Fleet mix" subtitle={`${total} plants`} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={chartTooltipStyle(soft)}
            formatter={(value, name) => [value, String(name).toUpperCase()]}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function SiteAlertBars({
  sites,
  soft,
  height = 220,
  onSelect,
}: {
  sites: Array<{ id: string; shortName: string; warning: number; critical: number }>;
  soft?: boolean;
  height?: number;
  onSelect?: (id: string) => void;
}) {
  const data = [...sites]
    .map((s) => ({
      id: s.id,
      name: s.shortName,
      warning: s.warning || 0,
      critical: s.critical || 0,
      total: (s.warning || 0) + (s.critical || 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  if (!data.some((d) => d.total > 0)) {
    return (
      <ChartFrame title="Flagged points" subtitle="Per plant" height={height}>
        <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
          All clear across the catchment
        </div>
      </ChartFrame>
    );
  }

  const grid = soft ? CHART.gridLight : CHART.grid;
  const tick = soft ? CHART.muted : CHART.text;

  return (
    <ChartFrame title="Flagged points" subtitle="Top plants by alert tags" height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
          onClick={(state) => {
            const payload = state as { activePayload?: Array<{ payload?: { id?: string } }> };
            const id = payload.activePayload?.[0]?.payload?.id;
            if (id && onSelect) onSelect(id);
          }}
        >
          <CartesianGrid stroke={grid} strokeDasharray="3 6" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: tick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fill: tick, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={chartTooltipStyle(soft)} />
          <Bar dataKey="warning" stackId="a" fill={CHART.warning} name="Warning" cursor="pointer" />
          <Bar dataKey="critical" stackId="a" fill={CHART.critical} name="Critical" cursor="pointer" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DriverBars({
  drivers,
  soft,
  height = 220,
}: {
  drivers: Array<{ label: string; contribution: number }>;
  soft?: boolean;
  height?: number;
}) {
  const data = drivers.map((d) => ({
    name: d.label,
    value: d.contribution,
  }));

  const grid = soft ? CHART.gridLight : CHART.grid;
  const tick = soft ? CHART.muted : CHART.text;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 6" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 'dataMax']}
          tick={{ fill: tick, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fill: tick, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={chartTooltipStyle(soft)}
          formatter={(value) => [`${value}%`, 'Contribution']}
        />
        <Bar dataKey="value" fill={CHART.flow} radius={[0, 6, 6, 0]} barSize={14} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? CHART.flow : i === 1 ? CHART.warning : CHART.flowDim} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComplianceUtilBars({
  items,
  height = 240,
}: {
  items: Array<{ label: string; utilisation: number; state: 'nominal' | 'warning' | 'critical' }>;
  height?: number;
}) {
  const data = items.map((item) => ({
    name: item.label,
    value: Math.round(item.utilisation * 100),
    fill: SEVERITY_COLOR[item.state],
  }));

  return (
    <ChartFrame title="Consent headroom" subtitle="% of permitted limit in use" height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 160]}
            tick={{ fill: CHART.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: CHART.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle()}
            formatter={(value) => [`${value}%`, 'Utilisation']}
          />
          <ReferenceLine x={100} stroke={CHART.critical} strokeDasharray="4 4" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
