import React, { useRef, useState } from "react";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";

export default function NewCategory() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [view, setView] = useState("expense");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category_name: "",
    note: "",
    file: null,
  });

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, file: file || null }));
  };

  const resetForm = () => {
    setFormData({ category_name: "", note: "", file: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    try {
      const data = new FormData();
      data.append("category_name", formData.category_name || "");
      data.append("amount", formData.amount || "");
      data.append("note", formData.note || "");
      if (formData.file) data.append("file", formData.file);

      const res = await axios.post(`${API_URL}/categorypost`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 201 || res.data?.success) {
        toast.success("Category added successfully", {
          position: "bottom-right",
        });
        resetForm();
        setView("payroll");
      } else {
        toast.error(res.data?.error || "Failed to add category", {
          position: "bottom-right",
        });
      }
      setTimeout(() => {
        navigate("/admin/allcategories");
      }, 1000);
    } catch (err) {
      console.error("Category post error:", err);
      toast.error("Server error while adding category", {
        position: "bottom-right",
      });
    }
  };

  return (
    <div className="content-wrapper">
      <form
        className="transaction-container p-0 border payroll-inner border-0"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
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
          <span className="details-t">New Category Create</span>
          <span className="border border-dark question-mark mt-1 mb-1">❔</span>
        </div>

        <div className="form-panel">
          <div className="form-row mb-1 mt-1">
            <label htmlFor="date-exp">Categoryname</label>
            <input
              id="category_name"
              name="category_name"
              type="text"
              className="form-control"
              placeholder="Category name"
              value={formData.category_name}
              onChange={handleChange}
              required
            />
          </div>

          <hr className="divider mt-0 mb-1" />

          <div className="form-row mb-1 mt-1">
            <label htmlFor="date-exp">Amount</label>
            <input
              id="category_name"
              name="amount"
              type="number"
              className="form-control"
              placeholder="Enter category amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>

          <hr className="divider mt-0 mb-1" />

          <div className="form-row mb-1">
            <label htmlFor="category-exp">Image</label>
            <input
              id="file"
              name="file"
              ref={fileInputRef}
              type="file"
              className="form-control"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </div>

          <hr className="divider mt-0 mb-1" />
        </div>

        <div className="form-panel">
          <div className="form-row d-flex flex-row pb-5">
            <label htmlFor="note-exp">Note</label>
            <textarea
              id="note"
              name="note"
              type="text"
              className="form-control rounded-0"
              placeholder="No Note Entered"
              value={formData.note}
              onChange={handleChange}
              style={{ height: "50px" }}
              required
            />
          </div>
        </div>
      </form>
      <ToastContainer />
    </div>
  );
}
