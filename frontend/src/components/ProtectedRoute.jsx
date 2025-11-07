import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const isAuthFlag = localStorage.getItem("isAuthenticated") === "true";
  const token = localStorage.getItem("adminToken");
  const isAuthenticated = isAuthFlag || Boolean(token);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
