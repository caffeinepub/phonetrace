import { BrowserRouter, Route, Routes } from "react-router-dom";
import ConsentPage from "./pages/ConsentPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import PrivacyPage from "./pages/PrivacyPage";
import RequestPage from "./pages/RequestPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/request" element={<RequestPage />} />
        <Route path="/track/:id" element={<ConsentPage />} />
        <Route path="/dashboard/:id" element={<DashboardPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
