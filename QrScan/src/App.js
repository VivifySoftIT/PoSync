import React from "react";
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Scan from './Screens/Scan';
 
 

// Scroll to top on route change
function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}

function App() {
  useScrollToTop();
  return (
    <div className="main-content">
      <Routes>
        <Route path="/" element={<Navigate to="/Scan" />} />
        <Route path="/Scan" element={<Scan />} />
   
  
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}