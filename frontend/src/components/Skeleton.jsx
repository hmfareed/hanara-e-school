/**
 * Skeleton.jsx — Reusable shimmer skeleton loading primitives
 * Pure CSS, no external dependency. Uses Tailwind CSS animate-pulse.
 *
 * Usage:
 *   <Skeleton.Line />                      — single text line
 *   <Skeleton.Line width="w-2/3" />        — shorter line
 *   <Skeleton.Box h="h-32" />              — rectangular block
 *   <Skeleton.Circle size="w-10 h-10" />   — avatar / icon circle
 *   <Skeleton.Card>...</Skeleton.Card>     — white card wrapper with pulse
 *   <Skeleton.StatCard />                  — pre-built stat card skeleton
 *   <Skeleton.TableRow cols={5} />         — pre-built table row skeleton
 */

import React from 'react';

const pulse = 'animate-pulse';
const base = 'bg-slate-200 rounded-lg';

/* ── Primitive pieces ─────────────────────────────────────── */

const Line = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <div className={`${base} ${pulse} ${width} ${height} ${className}`} />
);

const Box = ({ h = 'h-24', w = 'w-full', rounded = 'rounded-2xl', className = '' }) => (
  <div className={`${base} ${pulse} ${h} ${w} ${rounded} ${className}`} />
);

const Circle = ({ size = 'w-10 h-10', className = '' }) => (
  <div className={`${base} ${pulse} rounded-full ${size} shrink-0 ${className}`} />
);

/* ── Card wrapper — white bg with subtle border ───────────── */
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 p-5 ${pulse} ${className}`}>
    {children}
  </div>
);

/* ── Pre-built compound skeletons ─────────────────────────── */

/** Mimics a stat card: icon + label + big number + sub-label */
const StatCard = () => (
  <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
    <Circle size="w-12 h-12" />
    <div className="flex-1 space-y-2">
      <Line width="w-24" height="h-3" />
      <Line width="w-16" height="h-7" />
      <Line width="w-20" height="h-3" />
    </div>
  </div>
);

/** Mimics a table data row: N columns of varying widths */
const TableRow = ({ cols = 5 }) => {
  const widths = ['w-28', 'w-36', 'w-24', 'w-32', 'w-20', 'w-16', 'w-28'];
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
      <Circle size="w-8 h-8" />
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Line key={i} width={widths[i % widths.length]} height="h-3.5" />
      ))}
    </div>
  );
};

/** Mimics a list card item: avatar + two lines of text + badge */
const ListItem = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl">
    <Circle size="w-9 h-9" />
    <div className="flex-1 space-y-1.5">
      <Line width="w-36" height="h-3.5" />
      <Line width="w-24" height="h-3" />
    </div>
    <Line width="w-12" height="h-5" className="rounded-full" />
  </div>
);

/** Full-page hero banner skeleton */
const HeroBanner = ({ className = '' }) => (
  <div className={`bg-slate-200 rounded-3xl p-8 ${pulse} ${className}`}>
    <div className="space-y-3">
      <Line width="w-48" height="h-3" />
      <Line width="w-64" height="h-8" />
      <Line width="w-96 max-w-full" height="h-4" />
    </div>
  </div>
);

/** Section header: title line + optional sub-line */
const SectionHeader = ({ sub = true }) => (
  <div className="space-y-2">
    <Line width="w-48" height="h-6" />
    {sub && <Line width="w-72" height="h-4" />}
  </div>
);

/* ── Named export object ──────────────────────────────────── */
const Skeleton = {
  Line,
  Box,
  Circle,
  Card,
  StatCard,
  TableRow,
  ListItem,
  HeroBanner,
  SectionHeader,
};

export default Skeleton;
