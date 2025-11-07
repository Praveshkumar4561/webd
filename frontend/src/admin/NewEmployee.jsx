import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useCurrency from "../context/useCurrency";

export default function NewEmployee() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const { currency } = useCurrency();

  const [formData, setFormData] = useState({
    employee_name: "",
    dob: "",
    doj: "",
    department: "",
    shop_name: "",
    contact: "",
    email: "",
    employee_salary: "",
    advance: 0,
    reason: "",
  });

  const [storedAdvances, setStoredAdvances] = useState([]);
  const [advanceInput, setAdvanceInput] = useState("");

  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

  const handleAdd = (e) => {
    e?.preventDefault?.();
    const amt = parseFloat(advanceInput);
    if (Number.isNaN(amt) || amt <= 0) return;
    setStoredAdvances((prev) => {
      const updated = [...prev, amt];
      const total = updated.reduce((s, v) => s + v, 0);
      setFormData((prevForm) => ({ ...prevForm, advance: total }));
      return updated;
    });

    setAdvanceInput("");
  };

  const clearAllAdvances = () => {
    setStoredAdvances([]);
    setFormData((prevForm) => ({ ...prevForm, advance: 0 }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const [advance, setAdvance] = useState({ reason: "" });
  const [reasonsList, setReasonsList] = useState([]);

  const handleChanges = (e) => {
    const { name, value } = e.target;
    setAdvance((p) => ({ ...p, [name]: value }));
  };

  const addReason = () => {
    const text = (advance.reason || "").trim();
    if (!text) return;
    setReasonsList((prev) => [...prev, text]);
    setAdvance({ reason: "" });
  };

  const clearReasons = () => {
    setReasonsList([]);
    setAdvance({ reason: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const totalAdvance = storedAdvances.reduce((s, n) => s + n, 0);

    const payload = {
      ...formData,
      advance: totalAdvance,
      advance_history: storedAdvances.map((amt) => Number(amt)),
      reason:
        Array.isArray(reasonsList) && reasonsList.length > 0
          ? reasonsList.join(", ")
          : "",
      advance_reason: Array.isArray(reasonsList) ? reasonsList : [],
    };

    try {
      await axios.post(`${API_URL}/addemployee`, payload);

      setFormData({
        employee_name: "",
        dob: "",
        doj: "",
        department: "",
        shop_name: "",
        contact: "",
        email: "",
        employee_salary: "",
        advance: 0,
        reason: "",
      });
      setStoredAdvances([]);
      setAdvanceInput("");

      setReasonsList([]);
      setAdvance({ reason: "" });

      toast.success("Employee added successfully!", {
        position: "bottom-right",
        autoClose: 1500,
        closeOnClick: true,
        draggable: true,
      });

      navigate("/admin/home");
    } catch (error) {
      console.error("Add employee error:", error);
      toast.error("Failed to add employee", {
        position: "bottom-right",
        autoClose: 1500,
        closeOnClick: true,
        draggable: true,
      });
    }
  };

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/allshop`);
        setShops(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error("Failed to fetch shops:", err);
        setShops([]);
      }
    };

    fetchShops();
  }, [API_URL]);

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div className="card shadow-sm employee-details">
        <div className="card-header text-center">
          <h5 className="mb-0">Add Employee Details</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Employee Name:</label>
                <input
                  type="text"
                  className="form-control"
                  name="employee_name"
                  placeholder="Enter full name"
                  value={formData.employee_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Date of Birth:</label>
                <input
                  type="date"
                  className="form-control"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
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

              <div className="col-12">
                <label className="form-label">Shop</label>

                <select
                  className="form-select"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Shop</option>
                  {Array.isArray(shops) && shops.length > 0 ? (
                    shops.map((shop) => (
                      <option key={shop.id} value={shop.shop_name}>
                        {shop.shop_name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No shops available</option>
                  )}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Department:</label>
                <select
                  className="form-select"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="IT">IT</option>
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Contact Number:</label>
                <input
                  type="tel"
                  className="form-control"
                  name="contact"
                  placeholder="Enter phone number"
                  value={formData.contact}
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
                <label className="form-label">Employee Salary:</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter salary"
                  name="employee_salary"
                  value={formData.employee_salary}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Advance Amount (if any):</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Advance amount"
                  value={advanceInput}
                  onChange={(e) => setAdvanceInput(e.target.value)}
                  min="0"
                  step="0.01"
                />

                <div className="d-flex justify-content-between w-100 mt-2 align-items-center">
                  <div
                    className="d-flex align-items-center flex-row gap-2"
                    style={{ minWidth: 200, textAlign: "center" }}
                  >
                    <div className="fw-bold">Advance:</div>
                    <div className="fw-bold">
                      {Array.isArray(storedAdvances) &&
                      storedAdvances.length > 0 ? (
                        <>
                          {storedAdvances.map((a) => fmt(a)).join(" + ")}
                          {" = "}
                          <span className="text-danger fw-bold">
                            {currency}
                            {storedAdvances
                              .reduce((s, n) => s + (Number(n) || 0), 0)
                              .toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-danger fw-bold">
                          {currency}0.00
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-success btn-action px-2 py-1"
                      onClick={handleAdd}
                    >
                      Add
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-action px-2 py-1"
                      onClick={clearAllAdvances}
                      disabled={storedAdvances.length === 0}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">
                  Reason for Advance (Optional):
                </label>

                <textarea
                  className="form-control"
                  name="reason"
                  placeholder="Explain reason for the advance, if any"
                  value={advance.reason}
                  onChange={handleChanges}
                  rows="3"
                  style={{ height: "50px" }}
                ></textarea>

                <div className="d-flex justify-content-between w-100 mt-2 align-items-center">
                  <div
                    className="d-flex align-items-center flex-row gap-2"
                    style={{ minWidth: 200, textAlign: "center" }}
                  >
                    <div className="fw-bold">Reason:</div>

                    <div className="fw-bold">
                      {Array.isArray(reasonsList) && reasonsList.length > 0 ? (
                        <>{reasonsList.join(", ")}</>
                      ) : (
                        <span className="text-danger fw-bold">—</span>
                      )}
                    </div>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-success btn-action px-2 py-1"
                      onClick={addReason}
                    >
                      Add
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-action px-2 py-1"
                      onClick={clearReasons}
                      disabled={reasonsList.length === 0}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button type="submit" className="btn btn-primary w-100">
                Submit Employee Details
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
