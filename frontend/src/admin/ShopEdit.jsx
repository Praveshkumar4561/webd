import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

export default function ShopEdit() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    shop_name: "",
    description: "",
    contact: "",
    address: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(`${API_URL}/editshop/${id}`, formData);
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

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const response = await axios.get(`${API_URL}/someshops/${id}`);
        if (response.data) {
          setFormData({
            shop_name: response.data.shop_name || "",
            description: response.data.description || "",
            contact: response.data.contact || "",
            address: response.data.address || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch shop data:", error);
        toast.error("Failed to load shop data", {
          position: "bottom-right",
          autoClose: 1500,
          closeOnClick: true,
          draggable: true,
        });
      }
    };

    if (id) fetchShop();
  }, [API_URL, id]);

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div className="card shadow-sm employee-details">
        <div className="card-header text-center">
          <h5 className="mb-0">Edit Shop: {formData.shop_name}</h5>
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
                  rows="1"
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
                Update Shop
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
