import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import BuyerInsights from "./pages/BuyerInsights";
import SupplierInsights from "./pages/SupplierInsights";
import ReviewExplorer from "./pages/ReviewExplorer";
import About from "./pages/About";
import ModelAdvisor from "./pages/ModelAdvisor";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/buyer-insights" element={<BuyerInsights />} />
        <Route path="/supplier-insights" element={<SupplierInsights />} />
        <Route path="/review-explorer" element={<ReviewExplorer />} />
        <Route path="/model-advisor" element={<ModelAdvisor />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;
