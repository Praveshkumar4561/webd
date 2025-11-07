import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function Login() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    try {
      const response = await axios.post(`${API_URL}/adminlogin`, {
        username: adminUsername,
        password: adminPassword,
      });

      if (response.status === 200) {
        const admin = response.data?.admin ?? null;
        const token = response.data?.token ?? null;

        localStorage.setItem("isAuthenticated", "true");

        if (token) localStorage.setItem("adminToken", token);

        if (admin) localStorage.setItem("adminUser", JSON.stringify(admin));

        navigate("/admin/home");
        return;
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Server error. Please try again";
      setAdminError(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setErrors("");

    try {
      const response = await axios.post(`${API_URL}/userlogin`, formData);

      if (response.status === 200) {
        const { user, token } = response.data;

        localStorage.setItem("userId", user.id);
        localStorage.setItem("token", token);

        navigate("/user");
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setErrors(err.response.data.message || "Login failed");
      } else {
        setErrors("Server error. Please try again.");
      }
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center align-items-stretch">
        <div className="col-12 col-md-6 mb-4 d-flex">
          <div className="card shadow-sm flex-fill">
            <div className="card-body d-flex flex-column">
              <h3 className="card-title mb-4 text-center">Admin Login</h3>
              <form
                onSubmit={handleAdminLogin}
                className="flex-grow-1 d-flex flex-column justify-content-between"
              >
                <div>
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      placeholder="Username or email"
                      className="form-control input-text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3 position-relative">
                    <label className="form-label">Password</label>
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      placeholder="Password"
                      className="form-control input-text"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                    <FontAwesomeIcon
                      icon={showAdminPassword ? faEyeSlash : faEye}
                      className="password-toggle-icon"
                      onClick={() => setShowAdminPassword((v) => !v)}
                    />
                  </div>
                </div>

                {adminError && <p className="text-danger">{adminError}</p>}

                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-0 mb-3"
                  disabled={adminLoading}
                >
                  {adminLoading ? "Logging in..." : "Admin Login"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 mb-4 d-flex">
          <div className="card shadow-sm flex-fill">
            <div className="card-body d-flex flex-column">
              <h3 className="card-title mb-4 text-center">User Login</h3>
              <form
                className="flex-grow-1 d-flex flex-column justify-content-between"
                onSubmit={handleUserLogin}
              >
                <div>
                  <div className="mb-3">
                    <label className="form-label">Username or Email</label>
                    <input
                      type="text"
                      name="identifier"
                      placeholder="Username or email"
                      className="form-control input-text"
                      value={formData.identifier}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          identifier: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-3 position-relative">
                    <label className="form-label">Password</label>
                    <input
                      type={showUserPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      className="form-control input-text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                    />
                    <FontAwesomeIcon
                      icon={showUserPassword ? faEyeSlash : faEye}
                      className="password-toggle-icon"
                      onClick={() => setShowUserPassword((v) => !v)}
                    />
                  </div>
                </div>

                {errors && <p className="text-danger">{errors}</p>}

                <button className="btn btn-success w-100 mt-2 mb-3">
                  User Login
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
