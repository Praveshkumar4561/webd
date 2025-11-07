import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

export default function UserEdit() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const { id } = useParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    gender: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match!");
      return;
    }

    try {
      const updatedData = {
        ...formData,
        password: newPassword || formData.password,
      };

      await axios.put(`${API_URL}/editusers/${id}`, updatedData);

      toast.success("Employee updated successfully!", {
        position: "bottom-right",
        autoClose: 1500,
        closeOnClick: true,
        draggable: true,
      });

      navigate("/admin/users");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update employee", {
        position: "bottom-right",
        autoClose: 1500,
        closeOnClick: true,
        draggable: true,
      });
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/someusers/${id}`);
        if (response.data) {
          setFormData({
            fullname: response.data.fullname || "",
            email: response.data.email || "",
            phone: response.data.phone || "",
            username: response.data.username || "",
            password: response.data.password || "",
            gender: response.data.gender || "",
            description: response.data.description || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        toast.error("Failed to load user data", {
          position: "bottom-right",
          autoClose: 1500,
          closeOnClick: true,
          draggable: true,
        });
      }
    };

    if (id) fetchUser();
  }, [API_URL, id]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/someusers/${id}`);
        if (response.data) {
          setFormData({
            fullname: response.data.fullname || "",
            email: response.data.email || "",
            phone: response.data.phone || "",
            username: response.data.username || "",
            password: response.data.password || "",
            gender: response.data.gender || "",
            description: response.data.description || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        toast.error("Failed to load user data", {
          position: "bottom-right",
          autoClose: 1500,
          closeOnClick: true,
          draggable: true,
        });
      }
    };

    if (id) fetchUser();
  }, [API_URL, id]);

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    // Check immediately if confirm password doesn't match
    if (confirmPassword && value !== confirmPassword) {
      setPasswordError("Passwords do not match!");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (newPassword && value !== newPassword) {
      setPasswordError("Passwords do not match!");
    } else {
      setPasswordError("");
    }
  };

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div className="card shadow-sm employee-details">
        <div className="card-header text-center">
          <h5 className="mb-0">Edit User: {formData.fullname}</h5>
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
                <label className="form-label">Current Password:</label>
                <input
                  type="tel"
                  className="form-control"
                  name="password"
                  placeholder="Current password"
                  value={formData.password}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Create New Password:</label>
                <input
                  type="password"
                  className={`form-control ${
                    passwordError ? "is-invalid" : ""
                  }`}
                  placeholder="Create New Password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Confirm New Password:</label>
                <input
                  type="password"
                  className={`form-control ${
                    passwordError ? "is-invalid" : ""
                  }`}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                />
                {passwordError && (
                  <small className="text-danger">{passwordError}</small>
                )}
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
                Update User
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
