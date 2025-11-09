import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import BuyerInsights from "./pages/BuyerInsights";
import SupplierInsights from "./pages/SupplierInsights";
import ReviewExplorer from "./pages/ReviewExplorer";
import About from "./pages/About";
import ModelAdvisor from "./pages/ModelAdvisor";
function App() {
    return (_jsx(Routes, { children: _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/buyer-insights", element: _jsx(BuyerInsights, {}) }), _jsx(Route, { path: "/supplier-insights", element: _jsx(SupplierInsights, {}) }), _jsx(Route, { path: "/review-explorer", element: _jsx(ReviewExplorer, {}) }), _jsx(Route, { path: "/model-advisor", element: _jsx(ModelAdvisor, {}) }), _jsx(Route, { path: "/about", element: _jsx(About, {}) })] }) }));
}
export default App;
