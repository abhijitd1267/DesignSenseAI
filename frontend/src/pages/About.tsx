import { FiSmartphone } from "react-icons/fi";

function About() {
  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-3xl border border-white/60 bg-white/70 p-10 shadow-glass">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-20">
          <div>
            <h1
              className="text-3xl font-semibold text-[#007BFF]"
              style={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.5px" }}
            >
              About DesignSense AI
            </h1>
            <p className="mt-4 max-w-3xl text-sm text-slate-500">
              DesignSense AI helps smartphone teams orchestrate faster product decisions by translating the raw voice of the customer into prioritized design recommendations. Every dashboard in this workspace stays faithful to its original dataset—Twitter pulses, verified marketplace reviews, and Reddit deep dives—so you can compare narratives before blending them. The new Model Advisor orchestrates those signals into budget-aware recommendations so strategy, design, and sourcing can act in lockstep.
            </p>
          </div>
          <div className="hidden h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#007BFF]/10 to-emerald-400/10 shadow-lg transition-transform duration-300 md:-ml-6 md:flex md:shrink-0 md:self-start md:hover:-translate-y-2 md:hover:translate-x-2">
            <FiSmartphone size={64} className="text-[#007BFF]" aria-hidden />
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glass">
          <h2
            className="text-xl font-semibold text-[#007BFF]"
            style={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.5px" }}
          >
            What you can do
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-500">
            <li>• Investigate buyer delight and friction by dataset or across the full ecosystem.</li>
            <li>• Brief suppliers with component-level complaint intelligence and regional pivots.</li>
            <li>• Drill into verbatim feedback for any brand, model, or feature trend in seconds.</li>
          </ul>
        </article>
        <article className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glass">
          <h2
            className="text-xl font-semibold text-[#007BFF]"
            style={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.5px" }}
          >
            Methodology
          </h2>
          <p className="mt-4 text-sm text-slate-500">
            Each dataset passes through lightweight TextBlob sentiment analysis, feature keyword extraction, and normalization steps while preserving metadata like brand, model, and source context. Insights refresh whenever the backend reload endpoint recalculates metrics.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Ratings, delight scores, and recommendations follow transparent formulas so product, design, and supplier teams can audit how each insight is produced.
          </p>
        </article>
        <article className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glass md:col-span-2">
          <h2
            className="text-xl font-semibold text-[#007BFF]"
            style={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.5px" }}
          >
            Model Advisor
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-500">
            <p>
              Model Advisor blends performance, design, battery, display, and camera sentiment benchmarks across canonicalized brands to surface balanced handset shortlists. Toggle filters to calibrate budgets, focus on feature must-haves, and isolate the markets that matter most.
            </p>
            <p>
              Under the hood, our Flask analytics service aggregates review metrics, aligns currencies, and highlights top differentiators while exposing the rationale in cards, charts, and feature comparison grids. The goal: empower cross-functional teams with explainable, data-backed smartphone recommendations in one glance.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

export default About;
