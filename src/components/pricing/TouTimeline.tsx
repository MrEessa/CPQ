'use client';

import { useState } from 'react';
import { PricingRate } from '@/lib/types';
import { formatRate } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Splits a window into 1–2 segments, handling midnight-crossing (e.g. 23:00→07:00).
function getSegments(startTime: string, endTime: string): { start: number; end: number }[] {
  const start = timeToMinutes(startTime);
  const end = endTime === '24:00' ? 1440 : timeToMinutes(endTime);
  if (end > start) return [{ start, end }];
  return [{ start, end: 1440 }, { start: 0, end }];
}

// Semantic colour mapping: cheap rates → green, expensive → red, overnight → indigo.
// Uses color-mix() to produce a 30%-opacity tint of each semantic token so fills are
// clearly visible in both light and dark modes (the -subtle tokens are near-white in
// light mode and effectively invisible against --bg-elevated).
function mix(token: string): string {
  return `color-mix(in srgb, ${token} 30%, transparent)`;
}

function getBandFill(label: string, index: number): { fill: string; textColor: string } {
  const l = label.toLowerCase();
  if (l.includes('super off') || l.includes('night')) {
    return { fill: mix('var(--color-primary)'), textColor: 'var(--color-primary-text)' };
  }
  if (l.includes('off-peak') || l.includes('off peak')) {
    return { fill: mix('var(--color-success)'), textColor: 'var(--color-success-text)' };
  }
  if (l.includes('peak') && !l.includes('off') && !l.includes('super')) {
    return { fill: mix('var(--color-danger)'), textColor: 'var(--color-danger-text)' };
  }
  if (l.includes('day') || l.includes('standard')) {
    return { fill: mix('var(--color-warning)'), textColor: 'var(--color-warning-text)' };
  }
  const fallbacks = [
    { fill: mix('var(--color-primary)'), textColor: 'var(--color-primary-text)' },
    { fill: mix('var(--color-success)'),  textColor: 'var(--color-success-text)' },
    { fill: mix('var(--color-danger)'),   textColor: 'var(--color-danger-text)' },
    { fill: mix('var(--color-warning)'),  textColor: 'var(--color-warning-text)' },
  ];
  return fallbacks[index % fallbacks.length];
}

function getBandSwatch(label: string, index: number): string {
  const l = label.toLowerCase();
  if (l.includes('super off') || l.includes('night')) return 'var(--color-primary)';
  if (l.includes('off-peak') || l.includes('off peak')) return 'var(--color-success)';
  if (l.includes('peak') && !l.includes('off') && !l.includes('super')) return 'var(--color-danger)';
  if (l.includes('day') || l.includes('standard')) return 'var(--color-warning)';
  const swatches = ['var(--color-primary)', 'var(--color-success)', 'var(--color-danger)', 'var(--color-warning)'];
  return swatches[index % swatches.length];
}

interface Props {
  rates: PricingRate[];
  compact?: boolean; // reduced height for inline use in quote builder
}

export default function TouTimeline({ rates, compact = false }: Props) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ hour: number; rateName: string; unitRate: number } | null>(null);

  const barHeight = compact ? 28 : 40;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const fraction = relX / rect.width;
    const hour = Math.min(23, Math.max(0, Math.floor(fraction * 24)));

    // Find which rate applies at this hour on a weekday (day index 1)
    let rateName = '';
    let unitRate = 0;
    outer: for (let ri = 0; ri < rates.length; ri++) {
      const rate = rates[ri];
      for (const tw of rate.timeWindows ?? []) {
        if (!tw.daysOfWeek.includes(1)) continue;
        for (const seg of getSegments(tw.startTime, tw.endTime)) {
          if (hour * 60 >= seg.start && hour * 60 < seg.end) {
            rateName = rate.label;
            unitRate = rate.unitRate;
            break outer;
          }
        }
      }
    }
    if (!rateName && rates.length > 0) {
      rateName = rates[0].label;
      unitRate = rates[0].unitRate;
    }

    setHoverX(relX);
    setHoverInfo({ hour, rateName, unitRate });
  }

  return (
    <div>
      {/* Timeline bar */}
      <div
        className="relative overflow-visible rounded-md"
        style={{ height: barHeight, background: 'var(--bg-elevated)', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoverX(null); setHoverInfo(null); }}
      >
        {/* Rate segments */}
        <div className="absolute inset-0 rounded-md overflow-hidden">
          {rates.map((rate, rateIdx) =>
            (rate.timeWindows ?? []).flatMap((tw, twIdx) => {
              if (!tw.daysOfWeek.includes(1)) return [];
              const { fill, textColor } = getBandFill(rate.label, rateIdx);
              return getSegments(tw.startTime, tw.endTime).map((seg, segIdx) => (
                <div
                  key={`${rate.id}-${twIdx}-${segIdx}`}
                  className="absolute top-0 h-full flex items-center justify-center overflow-hidden"
                  style={{
                    background: fill,
                    left: `${(seg.start / 1440) * 100}%`,
                    width: `${((seg.end - seg.start) / 1440) * 100}%`,
                    borderRight: '1px solid var(--bg-base)',
                  }}
                >
                  {!compact && (
                    <span className="truncate px-1 text-xs font-medium" style={{ color: textColor }}>
                      {rate.label}
                    </span>
                  )}
                </div>
              ));
            }),
          )}
        </div>

        {/* Hover tooltip */}
        {hoverX !== null && hoverInfo && (
          <div
            className="pointer-events-none absolute z-20 rounded px-2 py-1 text-xs shadow-md"
            style={{
              top: barHeight + 4,
              left: hoverX,
              transform: hoverX > 200 ? 'translateX(calc(-100% - 4px))' : 'translateX(8px)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
            }}
          >
            {String(hoverInfo.hour).padStart(2, '0')}:00 — {hoverInfo.rateName} ({formatRate(hoverInfo.unitRate)})
          </div>
        )}
      </div>

      {/* Hour labels */}
      <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {['00:00', '06:00', '12:00', '18:00', '24:00'].map((t) => <span key={t}>{t}</span>)}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-3">
          {rates.map((rate, i) => (
            <div key={rate.id} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: getBandSwatch(rate.label, i) }} />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{rate.label}</span>
              <span>— {formatRate(rate.unitRate)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
