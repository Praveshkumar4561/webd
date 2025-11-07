import React, { useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function NewUser() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const [passwordError, setPasswordError] = useState("");

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    doj: "",
    gender: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "password" || name === "confirmPassword") {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match!");
      return;
    }

    try {
      const payload = { ...formData };
      delete payload.confirmPassword;
      await axios.post(`${API_URL}/createuser`, payload);
      toast.success("Employee added successfully!", {
        position: "bottom-right",
        autoClose: 1500,
        closeOnClick: true,
        draggable: true,
      });

      setFormData({
        fullname: "",
        email: "",
        phone: "",
        username: "",
        password: "",
        confirmPassword: "",
        doj: "",
        gender: "",
        description: "",
      });

      navigate("/admin/users");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add employee", {
        position: "bottom-right",
        autoClose: 1500,
        closeOnClick: true,
        draggable: true,
      });
    }
  };

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div className="card shadow-sm employee-details">
        <div className="card-header text-center">
          <h5 className="mb-0">Create New User</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Full Name:</label>
                <input
                  type="text"
                  className="form-control"
                  name="fullname"
                  placeholder="Enter full name"
                  value={formData.fullname}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Email Address:</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Phone Number:</label>
                <input
                  type="tel"
                  className="form-control"
                  name="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Username:</label>
                <input
                  type="tel"
                  className="form-control"
                  name="username"
                  placeholder="Create username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Password:</label>
                <input
                  type="password"
                  className="form-control"
                  name="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Confirm Password:</label>
                <input
                  type="password"
                  className={`form-control ${
                    passwordError ? "is-invalid" : ""
                  }`}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {passwordError && (
                  <div
                    className="invalid-feedback"
                    style={{ display: "block" }}
                  >
                    {passwordError}
                  </div>
                )}
              </div>

              <div className="col-12">
                <label className="form-label">Date of Joining:</label>
                <input
                  type="date"
                  className="form-control"
                  name="doj"
                  value={formData.doj}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 d-flex">
                <label className="form-label">Gender:</label>{" "}
                <div className="ms-2">
                  <input
                    type="radio"
                    id="genderMale"
                    name="gender"
                    value="male"
                    checked={formData.gender === "male"}
                    onChange={handleChange}
                  />{" "}
                  <label htmlFor="genderMale">Male</label>{" "}
                  <input
                    type="radio"
                    id="genderFemale"
                    name="gender"
                    value="female"
                    checked={formData.gender === "female"}
                    onChange={handleChange}
                  />{" "}
                  <label htmlFor="genderFemale">Female</label>{" "}
                  <input
                    type="radio"
                    id="genderOther"
                    name="gender"
                    value="other"
                    checked={formData.gender === "other"}
                    onChange={handleChange}
                  />{" "}
                  <label htmlFor="genderOther">Other</label>
                </div>
              </div>

              <div className="col-12 mt-1">
                <label className="form-label">Description(Optional):</label>
                <textarea
                  className="form-control"
                  name="description"
                  placeholder="Description..."
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  style={{ height: "70px" }}
                ></textarea>
              </div>
            </div>

            <div className="mt-4">
              <button type="submit" className="btn btn-primary w-100">
                Submit User Details
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
