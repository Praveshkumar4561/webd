import React, { useState } from "react";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

export default function OtherCate() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [view, setView] = useState("expense");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category_name: "",
    amount: "",
    purpose: "",
    note: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ category_name: "", amount: "", purpose: "", note: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/othercategory`, formData, {
        headers: { "Content-Type": "application/json" },
      });

      toast.success("Category added");
      resetForm();

      navigate("/admin/categories", { state: { openView: "others" } });
    } catch (err) {
      console.error("Submit error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add category";
      toast.error(msg);
    }
  };

  return (
    <div className="content-wrapper">
      <form
        className="transaction-container p-0 border payroll-inner border-0"
        onSubmit={handleSubmit}
      >
        <div className="d-flex justify-content-between w-100 py-3 text-dark box-transaction">
          <button
            type="button"
            aria-label="close expense"
            className="ms-3 fw-bold btn-link"
            onClick={() => setView("payroll")}
          >
            <Link
              to="/admin/categories"
              className="text-dark text-decoration-none"
            >
              ✕
            </Link>
          </button>
          <button type="submit" className="me-3 btn-link">
            Done
          </button>
        </div>

        <div className="px-2 py-0 box-span d-flex justify-content-between align-items-center">
          <span className="details-t">Other Category</span>
          <span className="border border-dark question-mark mt-1 mb-1">❔</span>
        </div>

        <div className="form-panel">
          <div className="form-row mb-0 mt-0">
            <label htmlFor="category_name">Customer</label>
            <input
              id="category_name"
              name="category_name"
              type="text"
              className="form-control"
              placeholder="Customer...."
              value={formData.category_name}
              onChange={handleChange}
              required
            />
          </div>

          <hr className="divider mt-0 mb-1" />

          <div className="form-row mb-1">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              className="form-control"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>

          <hr className="divider mt-0 mb-1" />

          <div className="form-row mb-1 mt-1">
            <label htmlFor="purpose">Purpose</label>
            <input
              id="purpose"
              name="purpose"
              type="text"
              className="form-control"
              placeholder="Purpose"
              value={formData.purpose}
              onChange={handleChange}
              required
            />
          </div>

          <hr className="divider mt-0 mb-1" />
        </div>

        <div className="form-panel">
          <div className="form-row d-flex flex-row pb-5">
            <label htmlFor="note">Remark</label>
            <textarea
              id="note"
              name="note"
              type="text"
              className="form-control rounded-0"
              placeholder="remark..."
              value={formData.note}
              onChange={handleChange}
              style={{ height: "50px" }}
            />
          </div>
        </div>
      </form>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
