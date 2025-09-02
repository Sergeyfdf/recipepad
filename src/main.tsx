import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import TelegramAuthPage from "./TelegramAuthPage";
import LoginPage from "./Login";
import App from "./App";

function RequireAuth({ children }: { children: React.ReactNode }) {
  return localStorage.getItem("token") ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<TelegramAuthPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app/*" element={<RequireAuth><App /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);