import React from 'react';
import { motion } from 'framer-motion';

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-surface border border-line shadow-sm overflow-hidden w-full">
      <div className="w-full flex bg-surface-2 border-b border-line px-4 py-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-3 bg-line/50 rounded-sm" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex px-4 py-4 gap-4 animate-pulse">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="flex-1 h-4 bg-surface-2 rounded-sm" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-surface border border-line p-6 shadow-sm animate-pulse space-y-4">
      <div className="w-1/3 h-6 bg-surface-2 rounded-sm" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`h-4 bg-surface-2 rounded-sm ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-surface border border-line" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-surface border border-line" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-96 bg-surface border border-line" />
        <div className="h-96 bg-surface border border-line" />
      </div>
    </div>
  );
}

export function SkeletonResult() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 animate-pulse">
      <div className="h-20 bg-surface border border-line" />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-[500px] bg-surface border border-line" />
        <div className="h-[500px] bg-surface border border-line" />
      </div>
    </div>
  );
}
