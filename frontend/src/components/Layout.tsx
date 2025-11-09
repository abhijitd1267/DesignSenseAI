import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
