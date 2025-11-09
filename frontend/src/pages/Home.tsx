import { Link } from "react-router-dom";
import { FiCompass, FiNavigation, FiSmartphone } from "react-icons/fi";

const datasetCards = [
  {
    title: "Twitter Pulse",
    description: "Live product feature requests and breaking launch chatter from social buzz.",
    route: "/review-explorer?dataset=twitter",
  },
  {
    title: "E-commerce Reviews",
    description: "Detailed buyer feedback across top marketplaces with verified purchases.",
    route: "/review-explorer?dataset=ecommerce",
  },
  {
    title: "Reddit Deep Dives",
    description: "Long-form discussions packed with nuanced pros, cons, and brand sentiment.",
    route: "/review-explorer?dataset=reddit",
  },
];

function Home() {
  return (
    <div className="flex flex-col gap-12">
      <section className="rounded-3xl border border-white/60 bg-white/70 p-10 shadow-glass">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Design Research Cockpit</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
          Decode smartphone experience through the voice of your buyers and suppliers
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          DesignSense AI stitches together social chatter, marketplace reviews, and community debates to help product teams design meaningful smartphone experiences faster.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/buyer-insights"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90"
          >
            Explore buyer insights
          </Link>
          <Link
            to="/supplier-insights"
            className="rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/5"
          >
            Review supplier guidance
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/5 via-white to-accent/10 p-10 shadow-glass">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[auto,1fr]">
          <div className="flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner shadow-primary/20">
              <FiCompass size={40} />
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Model Advisor</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Budget-conscious product scouting</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              The Model Advisor benchmarks e-commerce verified reviews to surface high-performing models within each company. Slice by budget, compare price-to-rating trends, and inspect feature satisfaction scores (battery, camera, display, performance) before you commit to a roadmap bet.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm">
                <FiSmartphone className="text-primary" /> Canonical brand + model coverage
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm">
                <FiNavigation className="text-primary" /> Budget-aligned top 3 picks
              </span>
            </div>
            <div>
              <Link
                to="/model-advisor"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90"
              >
                Launch Model Advisor
                <span aria-hidden className="text-base">→</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {datasetCards.map((card) => (
          <Link
            key={card.title}
            to={card.route}
            className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-glass transition hover:-translate-y-1"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">Dataset</p>
            <h3 className="mt-4 text-xl font-semibold text-slate-800">{card.title}</h3>
            <p className="mt-3 text-sm text-slate-500">{card.description}</p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-primary">
              Open explorer →
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-glass">
          <h2 className="text-2xl font-semibold text-slate-800">Why separate datasets matter</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Social media captures rapid-fire reactions, marketplaces surface verified purchase experiences, and community forums dig into deep technical trade-offs. Viewing them independently keeps signal intact, letting you compare trends before blending insights into your roadmap.
          </p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-glass">
          <h2 className="text-2xl font-semibold text-slate-800">What teams unlock</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
            <li>• Spot friction points in setup, battery, camera, and UI flows.</li>
            <li>• Track supplier coordination issues around components and logistics.</li>
            <li>• Prioritize updates using sentiment-weighted opportunity sizing.</li>
            <li>• Ground design decisions in the exact words of your customers.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default Home;
