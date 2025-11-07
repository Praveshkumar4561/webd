import React, { useEffect, useState } from "react";
import "../App.css";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import useCurrency from "../context/useCurrency";

export default function CategoryView() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [view, setView] = useState("expense");
  const { id } = useParams();
  const { currency } = useCurrency();

  const defaultForm = {
    category_name: "",
    amount: "",
    note: "",
    imageUrl: null,
  };

  const [formData, setFormData] = useState(defaultForm);

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
          const uploadsBase = API_URL
            ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
            : "/uploads";
          const imageFilename =
            item.image ?? item.images?.[0] ?? item.imageFilename ?? null;
          const imageUrl = imageFilename
            ? `${uploadsBase}/${imageFilename}`
            : null;

          setFormData({
            category_name: item.category_name ?? item.name ?? "",
            amount: item.amount ?? item.total ?? item.value ?? "",
            note: item.note ?? "",
            imageUrl,
          });
        } else {
          setFormData(defaultForm);
        }
      } catch (error) {
        console.error("error fetching category:", error);
        setFormData(defaultForm);
      }
    };
    somedata();
  }, [API_URL, id]);

  const formatAmount = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    const num = Number(String(val).replace(/,/g, "").trim());
    return Number.isNaN(num) ? val : num.toFixed(2);
  };

  return (
    <div className="content-wrapper">
      <div className="transaction-container p-0 border payroll-inner border-0">
        <div className="d-flex justify-content-between w-100 py-3 text-dark box-transaction">
          <button
            type="button"
            aria-label="close view"
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
        </div>

        <div className="px-2 py-0 box-span d-flex justify-content-between align-items-center">
          <span className="details-t">
            View Category: {formData.category_name}
          </span>
          <span className="border border-dark question-mark mt-1 mb-1">❔</span>
        </div>

        <div className="form-panel w-100 lh-lg">
          <div className="form-row mb-0 mt-1 d-flex flex-row py-2">
            <label className="fw-medium me-2">Category Name:</label>
            <span className="fw-bold">{formData.category_name || "—"}</span>
          </div>

          <div className="form-row mb-2 pb-1 mt-1">
            <label className="fw-medium me-2">Amount:</label>
            <span className="fw-bold">
              {currency}
              {formatAmount(formData.amount)}
            </span>
          </div>

          <div className="form-row mb-1 mt-1">
            <label className="fw-medium me-2">Note:</label>
            <span className="fw-bold">
              {formData.note
                ? formData.note.split(" ").slice(0, 17).join(" ") +
                  (formData.note.split(" ").length > 15 ? "..." : "")
                : "—"}
            </span>
          </div>

          <div className="form-row pb-3 mt-3">
            <label className="fw-medium me-2">Image:</label>
            <span>
              {formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt={formData.category_name || "category image"}
                  style={{
                    width: "200px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    display: "block",
                  }}
                />
              ) : (
                <span className="text-muted">No image available</span>
              )}
            </span>
          </div>

          <div className="d-flex justify-content-center pb-4 mt-2">
            <Link className="btn btn-success round-1" to="/admin/categories">
              Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
