import React, { useEffect, useRef, useState } from "react";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function CategoryEdit() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [view, setView] = useState("expense");
  const navigate = useNavigate();
  const { id } = useParams();

  const defaultForm = { category_name: "", note: "", file: null };

  const [formData, setFormData] = useState(defaultForm);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, file: file || null }));
  };

  const handleSubmit = async () => {
    try {
      const data = new FormData();
      data.append("category_name", formData.category_name || "");
      data.append("note", formData.note || "");
      if (formData.file) data.append("file", formData.file);
      data.append("amount", formData.amount || "");

      const res = await axios.put(`${API_URL}/categoryedit/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 201 || res.data?.success) {
        toast.success("Category updated successfully", {
          position: "bottom-right",
        });
        setView("payroll");
      } else {
        toast.error(res.data?.error || "Failed to update category", {
          position: "bottom-right",
        });
      }

      setTimeout(() => {
        navigate("/admin/categories");
      }, 500);
    } catch (err) {
      console.error("Category post error:", err);
      toast.error("Server error while updating category", {
        position: "bottom-right",
      });
    }
  };

  useEffect(() => {
    const somedata = async () => {
      if (!API_URL || !id) return;
      try {
        const response = await axios.get(`${API_URL}/somecategory/${id}`);

        let payload = response?.data;
        if (payload && typeof payload === "object" && "data" in payload) {
          payload = payload.data;
        }

        let item = null;
        if (Array.isArray(payload)) {
          item = payload[0] ?? null;
        } else if (payload && typeof payload === "object") {
          item = payload;
        }

        if (item) {
          setFormData((prev) => ({
            category_name:
              item.category_name ?? item.name ?? prev.category_name ?? "",
            amount: item.amount ?? prev.amount ?? "",
            note: item.note ?? prev.note ?? "",
            file: null,
          }));
        } else {
          setFormData(defaultForm);
        }
      } catch (error) {
        console.error("error fetching category:", error);
        setFormData(defaultForm);
      } finally {
      }
    };
    somedata();
  }, [API_URL, id]);

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
          <span className="details-t">
            Edit Category: {formData.category_name}
          </span>
          <span className="border border-dark question-mark mt-1 mb-1">❔</span>
        </div>

        <div className="form-panel">
          <div className="form-row mb-1 mt-1">
            <label htmlFor="category_name">Category name</label>
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
            <label htmlFor="file">Image</label>
            <input
              id="file"
              name="file"
              ref={fileInputRef}
              type="file"
              className="form-control"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <hr className="divider mt-0 mb-1" />
        </div>

        <div className="form-panel">
          <div className="form-row d-flex flex-row pb-5">
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              name="note"
              type="text"
              className="form-control rounded-0"
              placeholder="No Note Entered"
              value={formData.note}
              onChange={handleChange}
              style={{ height: "50px" }}
            />
          </div>
        </div>
      </form>
      <ToastContainer />
    </div>
  );
}
