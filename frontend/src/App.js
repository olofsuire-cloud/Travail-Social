import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import CourseDetail from "@/pages/CourseDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import Dashboard from "@/pages/Dashboard";

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (user === null) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Chargement…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Shell() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cours/:code" element={<Protected><CourseDetail /></Protected>} />
        <Route path="/tableau-de-bord" element={<Protected><Dashboard /></Protected>} />
        <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App min-h-screen bg-background">
            <Shell />
            <Toaster position="top-right" richColors />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
