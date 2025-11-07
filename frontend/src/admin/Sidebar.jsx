import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../App.css";
import Logo from "../assets/Logo2.png";

const navLinks = [
  { path: "/admin/home", label: "Dashboard", exact: true },
  { path: "/admin/newemployee", label: "New Employee" },
  { path: "/admin/employeeexpenses", label: "Employee Expenses" },
  { path: "/admin/employeetransfer", label: "Employee Transfer" },
  { path: "/admin/employeeadvance", label: "Advance" },
  { path: "/admin/employeeperformance", label: "Performance" },
  { path: "/admin/works", label: "View Work" },
  { path: "/admin/shops", label: "Shops" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/managework", label: "Work Submission" },
  { path: "/admin/expense", label: "Expense" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("adminToken");
    navigate("/login", { replace: true });
  };

  return (
    <>
      <nav className="navbar navbar-light bg-light d-md-none mobile-navbar-toggle">
        <div className="container-fluid">
          <button
            className="btn btn-outline-success hamburger-btn"
            onClick={toggleSidebar}
          >
            ☰
          </button>
          <Link to="/admin/home">
            <img
              src={Logo}
              alt="Admin logo"
              className="logo-image mb-0"
              loading="eager"
              style={{ width: "108px", height: "50px" }}
            />
          </Link>
        </div>
      </nav>

      {isOpen && <div className="mobile-overlay" onClick={closeSidebar}></div>}

      <div className={`mobile-sidebar d-md-none ${isOpen ? "open" : ""}`}>
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Link to="/admin/home">
              <img
                src={Logo}
                alt="Admin logo"
                className="logo-image mb-0"
                loading="eager"
                style={{ width: "106px", height: "50px" }}
              />
            </Link>
            <button className="btn-close" onClick={closeSidebar}></button>
          </div>
          <div className="list-group list-group-flush">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  "list-group-item list-group-item-action " +
                  (isActive ? "active" : "")
                }
                onClick={closeSidebar}
              >
                {link.label}
              </NavLink>
            ))}
            <button
              className="btn btn-danger mt-3 text-start py-2"
              onClick={() => {
                closeSidebar();
                handleLogout();
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <aside
        className="d-none d-md-block admin-sidebar"
        aria-label="Admin sidebar"
      >
        <div className="p-3">
          <Link to="/admin/home">
            <img
              src={Logo}
              alt="Admin logo"
              className="logo-image mb-2 mt-0"
              loading="eager"
              style={{ width: "206px", height: "70px" }}
            />
          </Link>
          <div className="list-group list-group-flush">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  "list-group-item list-group-item-action " +
                  (isActive ? "active" : "")
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button
              className="btn btn-danger mt-3 text-start py-2"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="content-wrapper"></div>
    </>
  );
}
