import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./admin/Sidebar";

function User() {
  return (
    <div className="d-fl">
      <Sidebar />

      <Outlet />
    </div>
  );
}

export default User;
