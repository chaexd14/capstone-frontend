"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  Shield,
  Award,
  Search,
  Check,
} from "lucide-react";

interface SlideItem {
  headline: string;
  subtitle: string;
  renderVisual: () => React.ReactNode;
}

const SLIDES: SlideItem[] = [
  {
    headline: "AI-Powered Talent Matching",
    subtitle:
      "Streamline resume screening with explainable 5-component rubric scoring, demographic blind screening, and sentence-grounded evidence verification.",
    renderVisual: () => (
      <div className="w-full h-full flex flex-col justify-between p-5 select-none">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2196F3]/10 text-[#2196F3] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#2196F3]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Candidate Evaluation</p>
              <p className="text-[11px] text-slate-500">Explainable 5-Rubric Analysis</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Rank #1 Shortlist
          </span>
        </div>

        {/* Match Score Display */}
        <div className="my-2 py-3 px-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overall Match Score</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-extrabold text-[#2196F3] tracking-tight">94.8%</span>
              <span className="text-xs font-semibold text-emerald-700">Strong Fit</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-[#2196F3] border-t-emerald-400 flex items-center justify-center font-bold text-xs text-slate-700 bg-white shadow-xs">
            AI
          </div>
        </div>

        {/* Rubric Breakdown Progress Bars */}
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
              <span>Required Skills (Python, FastAPI, Postgres)</span>
              <span className="text-[#2196F3] font-bold">96%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#2196F3] rounded-full transition-all duration-500" style={{ width: "96%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
              <span>Sentence-Grounded Experience Tenure</span>
              <span className="text-[#2196F3] font-bold">92%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#2196F3] rounded-full transition-all duration-500" style={{ width: "92%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
              <span>Anti-Bluff Narrative Evidence Proof</span>
              <span className="text-emerald-700 font-bold">98% (Verified)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: "98%" }} />
            </div>
          </div>
        </div>

        {/* Footer Badge */}
        <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
            Zero Demographics Considered
          </span>
          <span className="font-mono text-[10px] text-slate-500 font-medium">ID: TM-9821</span>
        </div>
      </div>
    ),
  },
  {
    headline: "Sentence-Grounded Verification",
    subtitle:
      "Differentiate genuine hands-on technical competence from keyword-stuffed resume claims with sentence citations.",
    renderVisual: () => (
      <div className="w-full h-full flex flex-col justify-between p-5 select-none">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Sentence Evidence Extraction</p>
              <p className="text-[11px] text-slate-500">Evidence vs Bullet-List Claim</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#2196F3] border border-blue-200">
            100% Grounded
          </span>
        </div>

        <div className="my-2 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-left">
          <p className="text-[10px] font-bold text-[#2196F3] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Search className="w-3 h-3" /> Grounded Resume Citation
          </p>
          <p className="text-xs text-slate-700 italic leading-relaxed">
            &quot;Architected distributed ETL streaming pipeline processing{" "}
            <span className="font-semibold text-[#1976D2] bg-blue-100/70 px-1.5 py-0.5 rounded">
              5M+ daily records
            </span>{" "}
            using{" "}
            <span className="font-semibold text-[#1976D2] bg-blue-100/70 px-1.5 py-0.5 rounded">
              Apache Kafka
            </span>
            , Docker, and PostgreSQL.&quot;
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] text-emerald-700 font-bold uppercase">Narrative Proof</p>
            <p className="font-extrabold text-emerald-800 text-sm mt-0.5">High Confidence</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-500 font-bold uppercase">Bluff Risk</p>
            <p className="font-extrabold text-slate-700 text-sm mt-0.5">0.0% (Verified)</p>
          </div>
        </div>

        <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="text-slate-600 font-medium">Verifiable Employment History</span>
          <span className="font-mono text-[10px] text-[#2196F3] font-semibold">Citation Confirmed</span>
        </div>
      </div>
    ),
  },
  {
    headline: "Demographic Bias Reduction",
    subtitle:
      "Mask candidate PII, prestige markers, and non-merit demographics so every hire is judged purely on proven qualification.",
    renderVisual: () => (
      <div className="w-full h-full flex flex-col justify-between p-5 select-none">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1988f5] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#1988f5]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Demographic Anonymization</p>
              <p className="text-[11px] text-slate-500">EEOC 4/5ths Rule Invariant</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#1988f5] border border-blue-200">
            Blind Review Active
          </span>
        </div>

        <div className="space-y-2 my-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Candidate Identity</span>
            <span className="font-mono text-slate-800 font-bold bg-slate-200/70 px-2 py-0.5 rounded">#C-8492 [REDACTED]</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Educational Institution</span>
            <span className="text-slate-600 font-mono text-[11px] bg-slate-200/70 px-2 py-0.5 rounded">[Prestige Masked]</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Demographic Markers</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> Anonymized
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#1988f5]" />
            <span className="text-xs font-bold text-slate-800">Merit-First Index</span>
          </div>
          <span className="text-sm font-extrabold text-[#1988f5]">96 / 100</span>
        </div>

        <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Counterfactual Audited</span>
          <span className="text-emerald-700 font-semibold">100% Invariant</span>
        </div>
      </div>
    ),
  },
];

function ShowcasePanelBase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-cycle carousel slides every 6 seconds, pausing on hover or focus
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const currentSlide = SLIDES[activeSlide];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="hidden lg:flex flex-col justify-between items-center bg-[#1988f5] p-10 xl:p-14 text-white relative overflow-hidden select-none"
    >
      {/* Subtle architectural grid lines inside the blue field (matches landing page hero) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:48px_48px]"
      />

      {/* Center Container: Large White Card + Indicators + Text */}
      <div className="w-full max-w-[430px] flex flex-col items-center my-auto z-10">
        {/* Large White Rounded Card */}
        <div className="w-full aspect-square bg-white text-slate-900 rounded-3xl shadow-2xl border border-white/20 p-2 relative flex flex-col items-center justify-center transition-all duration-300">
          {currentSlide.renderVisual()}
        </div>

        {/* Carousel Pagination (Accessible 44px vertical touch targets) */}
        <div className="flex items-center justify-center gap-1.5 mt-6 mb-5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={activeSlide === idx ? "true" : undefined}
              className="py-3 px-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full flex items-center justify-center"
            >
              <span
                className={`h-2.5 rounded-full transition-all duration-300 block ${
                  activeSlide === idx
                    ? "w-12 bg-white shadow-xs"
                    : "w-6 bg-white/40 hover:bg-white/70"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Marketing / Feature Headline */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight leading-tight">
          {currentSlide.headline}
        </h2>

        {/* Subtitle / Description (>4.5:1 text contrast) */}
        <p className="text-blue-100 font-medium text-sm sm:text-base text-center mt-2.5 max-w-sm mx-auto leading-relaxed">
          {currentSlide.subtitle}
        </p>
      </div>
    </div>
  );
}

export const ShowcasePanel = React.memo(ShowcasePanelBase);
