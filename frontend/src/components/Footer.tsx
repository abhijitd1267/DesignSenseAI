function Footer() {
  return (
    <footer className="border-t border-white/40 bg-white/70 py-10 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 text-sm text-slate-500">
        <div className="flex flex-col items-start gap-4 pl-2 md:flex-row md:items-center md:gap-8 md:pl-16">
          <img
            src="/design_sense_footer.png"
            alt="DesignSense AI branding"
            className="w-32 rounded-3xl border border-white/50 shadow-glass"
            loading="lazy"
          />
          <div className="max-w-lg text-slate-600">
            <h2
              className="text-lg font-semibold text-[#007BFF]"
              style={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.5px" }}
            >
              DesignSense AI
            </h2>
            <p className="mt-1 text-base text-slate-500">
              Turning smartphone reviews into design intelligence 🚀📱💡
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-base text-slate-400">
          <span>Designed</span>
          
          <span>by <strong>Team Ideators</strong>, DES646 (2025-26), IIT Kanpur</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
