import React, { useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function CreateShop() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    shop_name: "",
    contact: "",
    address: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API_URL}/postshop`, formData);
      toast.success("Employee added successfully!", {
        position: "bottom-right",
        autoClose: 1500,
        closeOnClick: true,
        draggable: true,
      });

      setFormData({
        shop_name: "",
        description: "",
        contact: "",
        address: "",
      });
      navigate("/admin/shops");
    } catch (error) {
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
          <h5 className="mb-0">Create New Shop</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Shop Name:</label>
                <input
                  type="text"
                  className="form-control"
                  name="shop_name"
                  placeholder="Enter shop name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Contact No:</label>
                <input
                  type="text"
                  className="form-control"
                  name="contact"
                  placeholder="Enter contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Address:</label>
                <textarea
                  className="form-control"
                  name="address"
                  placeholder="Enter Address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                ></textarea>
              </div>

              <div className="col-12">
                <label className="form-label">Description (Optional):</label>
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
                Submit Shop
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
