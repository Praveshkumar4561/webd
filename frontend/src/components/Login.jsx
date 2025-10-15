import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/adminlogin`, {
        username,
        password,
      });

      if (response.status === 200) {
        setTimeout(() => {
          navigate("/admin/home");
        }, 1500);
      }
    } catch (err) {
      console.error(err);

      const msg =
        err.response?.data?.message || "Server error. Please try again";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors("");

    try {
      const response = await axios.post(`${API_URL}/userlogin`, formData);
      if (response.status === 200) {
        navigate("/user");
      }
    } catch (err) {
      console.error(err);
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
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <p className="text-danger">{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-0 mb-3"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Admin Login"}
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
                onSubmit={handleSubmit}
              >
                <div>
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      name="username"
                      className="form-control input-text"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      name="password"
                      className="form-control input-text"
                      value={formData.password}
                      onChange={handleChange}
                      required
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
