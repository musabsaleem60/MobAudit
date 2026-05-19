import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import Login from "./pages/Login";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('mobaudit_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('mobaudit_token');
      if (!token) {
        setIsValidating(false);
        return;
      }
      
      try {
        const response = await fetch(`http://${window.location.hostname}:5001/api/auth/verify`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          localStorage.removeItem('mobaudit_token');
          localStorage.removeItem('mobaudit_user');
        }
      } catch (err) {
        localStorage.removeItem('mobaudit_token');
        localStorage.removeItem('mobaudit_user');
      } finally {
        setIsValidating(false);
      }
    };
    verifyToken();
  }, []);

  if (isValidating) {
    return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white font-bold tracking-widest uppercase text-sm">Verifying Session...</div>;
  }

  return (
    <Router>
      <div className="bg-brand-dark min-h-screen text-white font-sans">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/report" element={<Report />} />
                  </Routes>
                </>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
