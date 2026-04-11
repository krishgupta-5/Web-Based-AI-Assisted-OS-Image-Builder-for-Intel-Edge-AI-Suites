"use client";

import React from "react";

type Props = {
  onSelect: (prompt: string) => void;
};

const TEMPLATES = [
  {
    id: 1,
    title: "Retail AI",
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
      </svg>
    ),
    desc: "YOLOv8 on Jetson Nano",
    prompt: "Retail AI system for real-time footfall tracking using camera on Jetson Nano",
  },
  {
    id: 2,
    title: "Smart City",
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 21h18M5 21V5a2 2 0 012-2h4a2 2 0 012 2v16m0 0h4a2 2 0 002-2V9a2 2 0 00-2-2h-4m-4 14V11m-4 0h4m-4 4h4" />
      </svg>
    ),
    desc: "Traffic cam on RPi 4",
    prompt: "Smart city traffic monitoring system using camera on Raspberry Pi 4",
  },
  {
    id: 3,
    title: "Manufacturing",
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    desc: "Anomaly detection",
    prompt: "Manufacturing defect detection system using edge AI for anomaly detection",
  },
];

export default function TemplateGrid({ onSelect }: Props) {
  return (
    <section className="shrink-0 mb-2">
      <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Quick Start Templates
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.prompt)}
            className="flex flex-col items-start bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-indigo-500 hover:shadow-md hover:ring-1 hover:ring-indigo-500 transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 bg-indigo-50 rounded-lg group-hover:scale-105 transition-transform">{t.icon}</span>
              <span className="font-semibold text-slate-800 text-sm">{t.title}</span>
            </div>
            <span className="text-xs text-slate-500 leading-snug ml-9">{t.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}