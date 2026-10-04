import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Criterion, CriterionScore } from '@shared/types';
import { t, type Lang } from '@shared/types';

type Props = {
  breakdown: CriterionScore[];
  criteria: Criterion[];
  lang: Lang;
  targetLabel: string;
};

type Row = {
  id: string;
  axis: string;
  // null = no measurement. Recharts then leaves a gap in the polygon instead of
  // drawing a zero, which would read as "we measured it and it is 0% similar".
  site: number | null;
  target: number | null;
  missing: boolean;
};

export function RadarChart({ breakdown, criteria, lang, targetLabel }: Props) {
  const byId = new Map(criteria.map((criterion) => [criterion.id, criterion]));

  const rows: Row[] = breakdown.map((entry) => {
    const criterion = byId.get(entry.criterionId);
    return {
      id: entry.criterionId,
      axis: criterion ? t(criterion.label, lang).slice(0, 14) : entry.criterionId,
      site: entry.weight > 0 ? Math.round(entry.similarity * 100) : null,
      target: entry.weight > 0 ? 100 : null,
      missing: entry.weight === 0,
    };
  });

  const measurable = rows.filter((row) => !row.missing);
  // Three axes make a meaningless shape. Better to say so than to draw a broken polygon.
  if (measurable.length < 3) {
    return (
      <div className="radar-empty">
        <p>
          Для этой пары измерено меньше трёх критериев — радар не строится. Ниже показано то,
          что есть.
        </p>
      </div>
    );
  }

  return (
    <div className="radar">
      <ResponsiveContainer width="100%" height={260}>
        <RechartsRadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke="#1f2839" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#96a1b8', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#6b7689', fontSize: 9 }} tickCount={5} />
          <Radar
            name={targetLabel}
            dataKey="target"
            stroke="#4da3ff"
            fill="#4da3ff"
            fillOpacity={0.12}
            strokeWidth={1}
          />
          <Radar
            name="Site"
            dataKey="site"
            stroke="#e2703a"
            fill="#e2703a"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: '#121826',
              border: '1px solid #1f2839',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownTable({
  breakdown,
  criteria,
  lang,
}: {
  breakdown: CriterionScore[];
  criteria: Criterion[];
  lang: Lang;
}) {
  const byId = new Map(criteria.map((criterion) => [criterion.id, criterion]));

  return (
    <>
      <table className="breakdown">
        <thead>
          <tr>
            <th>Критерий</th>
            <th style={{ textAlign: 'right' }}>Похоже</th>
            <th style={{ textAlign: 'right' }}>Вес</th>
            <th style={{ textAlign: 'right' }}>Вклад</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((entry) => {
            const criterion = byId.get(entry.criterionId);
            const missing = entry.weight === 0;
            return (
              <tr key={entry.criterionId}>
                <td>
                  {criterion ? t(criterion.label, lang) : entry.criterionId}
                  {criterion?.source ? (
                    <div className="breakdown__note">{criterion.source}</div>
                  ) : null}
                </td>
                <td className="breakdown__num" style={{ textAlign: 'right' }}>
                  {missing ? (
                    <span className="muted">нет данных</span>
                  ) : (
                    <>{Math.round(entry.similarity * 100)}%</>
                  )}
                </td>
                <td className="breakdown__num" style={{ textAlign: 'right' }}>
                  {missing ? '—' : entry.weight.toFixed(2)}
                </td>
                <td className="breakdown__num" style={{ textAlign: 'right' }}>
                  {missing ? '—' : entry.contribution.toFixed(3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}