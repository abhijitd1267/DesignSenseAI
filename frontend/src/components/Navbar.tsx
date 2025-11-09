import { Link, NavLink } from "react-router-dom";
import { FiSmartphone } from "react-icons/fi";

const navigation = [
  { label: "Home", path: "/" },
  { label: "Buyer Insights", path: "/buyer-insights" },
  { label: "Supplier Insights", path: "/supplier-insights" },
  { label: "Model Advisor", path: "/model-advisor" },
  { label: "Review Explorer", path: "/review-explorer" },
  { label: "About", path: "/about" },
];

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-md shadow-glass">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
        <Link
          to="/"
          className="group mr-auto flex items-center gap-3 text-[#007BFF]"
          data-testid="logo"
        >
          <div className="relative h-8 w-8">
            <FiSmartphone
              size={30}
              className="absolute inset-0 text-[#007BFF] transition-opacity duration-300 group-hover:opacity-0"
              aria-hidden
            />
            <FiSmartphone
              size={30}
              className="absolute inset-0 text-emerald-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          </div>
          <span
            className="text-[24px] font-bold transition duration-300
              group-hover:text-[#007BFF] group-hover:drop-shadow-[0_0_10px_rgba(0,123,255,0.65)]"
            style={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.5px" }}
          >
            DesignSense
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative pb-1 transition-colors duration-300 hover:text-[#007BFF] hover:drop-shadow-[0_0_8px_rgba(0,123,255,0.45)] after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity ${
                  isActive
                    ? "text-primary after:opacity-100"
                    : "hover:text-primary hover:after:opacity-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
