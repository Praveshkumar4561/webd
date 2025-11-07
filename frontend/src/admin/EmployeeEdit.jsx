import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import useCurrency from "../context/useCurrency";

export default function EmployeeEdit() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const { id } = useParams();
  const { currency } = useCurrency();
  const [shops, setShops] = useState([]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const pending = parseFloat(advanceInput);
    const pendingValid = !Number.isNaN(pending) && pending > 0 ? pending : 0;

    const totalAdvance =
      storedAdvances.reduce((s, n) => s + n, 0) + pendingValid;

    const payload = {
      ...formData,
      advance: totalAdvance,
    };

    if (Array.isArray(reasonsList) && reasonsList.length > 0) {
      payload.reason = reasonsList.join(", ");
    } else {
      payload.reason = "";
    }

    if (
      (Array.isArray(storedAdvances) && storedAdvances.length > 0) ||
      pendingValid
    ) {
      payload.advance_history = [
        ...(Array.isArray(storedAdvances)
          ? storedAdvances.map((amt) => Number(amt))
          : []),
        ...(pendingValid ? [pendingValid] : []),
      ];
    } else {
      payload.advance_history = [];
    }

    try {
      const res = await axios.put(`${API_URL}/editemployee/${id}`, payload);

      setFormData((prev) => ({
        ...prev,
        advance: totalAdvance,
        reason: payload.reason,
      }));

      setStoredAdvances([]);
      setReasonsList([]);
      setAdvance({ reason: "" });
      setAdvanceInput("");

      toast.success("Employee edited successfully!", {
        position: "bottom-right",
        autoClose: 1500,
      });

      navigate("/admin/home");
    } catch (error) {
      console.error("Edit error:", error);
      toast.error("Failed to edit employee", {
        position: "bottom-right",
        autoClose: 1500,
      });
    }
  };

  // useEffect(() => {
  //   const parseAdvanceHistory = (arr) => {
  //     const normalized = arr
  //       .map((v) => {
  //         if (typeof v === "number") return v;
  //         if (typeof v === "string") {
  //           const p = parseFloat(v);
  //           return Number.isNaN(p) ? null : p;
  //         }
  //         if (v && typeof v === "object") {
  //           const p = parseFloat(v.amount ?? v.value ?? null);
  //           return Number.isNaN(p) ? null : p;
  //         }
  //         return null;
  //       })
  //       .filter((n) => n !== null && n > 0);
  //     return normalized;
  //   };

  //   const parseAdvanceReason = (raw) => {
  //     try {
  //       if (Array.isArray(raw)) {
  //         return raw
  //           .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
  //           .filter(Boolean);
  //       }
  //       if (typeof raw === "string") {
  //         const s = raw.trim();
  //         if (s.length === 0) return [];
  //         try {
  //           const parsed = JSON.parse(s);
  //           if (Array.isArray(parsed)) {
  //             return parsed
  //               .map((r) =>
  //                 typeof r === "string" ? r.trim() : String(r || "")
  //               )
  //               .filter(Boolean);
  //           }
  //           if (typeof parsed === "string") {
  //             return parsed
  //               .split(",")
  //               .map((r) => r.trim())
  //               .filter(Boolean);
  //           }
  //         } catch (e) {
  //           return s
  //             .split(",")
  //             .map((r) => r.trim())
  //             .filter(Boolean);
  //         }
  //       }
  //       return [];
  //     } catch (err) {
  //       return [];
  //     }
  //   };

  //   const fetchEmployee = async () => {
  //     try {
  //       const response = await axios.get(`${API_URL}/someemployee/${id}`);
  //       if (!response.data) return;
  //       const resp = response.data;

  //       setFormData({
  //         employee_name: resp.employee_name || "",
  //         dob: resp.dob || "",
  //         doj: resp.doj || "",
  //         department: resp.department || "",
  //         shop_name: resp.shop_name || "",
  //         contact: resp.contact || "",
  //         email: resp.email || "",
  //         employee_salary: resp.employee_salary || "",
  //         advance: resp.advance || 0,
  //         reason: resp.reason || "",
  //       });

  //       if (
  //         Array.isArray(resp.advance_history) &&
  //         resp.advance_history.length > 0
  //       ) {
  //         const normalized = parseAdvanceHistory(resp.advance_history);
  //         setStoredAdvances(normalized);
  //         const sum = normalized.reduce((s, n) => s + n, 0);
  //         setFormData((prev) => ({ ...prev, advance: sum }));
  //       } else if (resp.advance && !Array.isArray(resp.advance)) {
  //         const total = parseFloat(resp.advance) || 0;
  //         setStoredAdvances(total > 0 ? [total] : []);
  //         setFormData((prev) => ({ ...prev, advance: total }));
  //       } else {
  //         setStoredAdvances([]);
  //         setFormData((prev) => ({ ...prev, advance: 0 }));
  //       }

  //       const parsedReasons = parseAdvanceReason(
  //         resp.advance_reason ?? resp.reason ?? ""
  //       );
  //       setReasonsList(parsedReasons);
  //       setAdvance({ reason: "" });
  //     } catch (err) {
  //       console.error("Failed to fetch employee data:", err);
  //     }
  //   };

  //   fetchEmployee();
  // }, [API_URL, id]);

  useEffect(() => {
    const resetTimerRef = { current: null };

    const parseAdvanceHistory = (arr) => {
      if (!Array.isArray(arr)) return [];
      const normalized = arr
        .map((v) => {
          if (typeof v === "number") return v;
          if (typeof v === "string") {
            const p = parseFloat(v);
            return Number.isNaN(p) ? null : p;
          }
          if (v && typeof v === "object") {
            const raw =
              v.amount ??
              v.value ??
              Object.values(v).find(
                (x) => typeof x === "number" || !Number.isNaN(parseFloat(x))
              );
            const p = parseFloat(raw ?? null);
            return Number.isNaN(p) ? null : p;
          }
          return null;
        })
        .filter((n) => n !== null && Number.isFinite(n) && n > 0);
      return normalized;
    };

    const parseAdvanceReason = (raw) => {
      try {
        if (Array.isArray(raw)) {
          return raw
            .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
            .filter(Boolean);
        }

        if (typeof raw === "string") {
          const s = raw.trim();
          if (s.length === 0) return [];

          try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) {
              return parsed
                .map((r) =>
                  typeof r === "string" ? r.trim() : String(r || "")
                )
                .filter(Boolean);
            }
            if (typeof parsed === "string") {
              return parsed
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean);
            }
          } catch (e) {
            return s
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean);
          }
        }

        return [];
      } catch (err) {
        return [];
      }
    };

    const getMonthFromDateLike = (dateLike) => {
      if (!dateLike) return null;
      const d = new Date(dateLike);
      if (isNaN(d.getTime())) return null;
      return d.getMonth();
    };

    const msUntilNextMonth = () => {
      const now = new Date();
      const next = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
        0,
        0,
        0,
        0
      );
      return next.getTime() - now.getTime();
    };

    const clearResetTimer = () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };

    const scheduleResetAtNextMonth = () => {
      clearResetTimer();
      resetTimerRef.current = setTimeout(() => {
        setStoredAdvances([]);
        setReasonsList([]);
        setFormData((prev) => ({ ...prev, advance: 0, reason: "" }));
      }, msUntilNextMonth());
    };

    const fetchEmployee = async () => {
      try {
        const response = await axios.get(`${API_URL}/someemployee/${id}`);
        const resp = response.data;
        if (!resp) return;

        const baseForm = {
          employee_name: resp.employee_name || "",
          dob: resp.dob || "",
          doj: resp.doj || "",
          department: resp.department || "",
          shop_name: resp.shop_name || "",
          contact: resp.contact || "",
          email: resp.email || "",
          employee_salary: resp.employee_salary ?? "",
        };

        const lastModifiedMonth =
          getMonthFromDateLike(resp.updated_at) ??
          getMonthFromDateLike(resp.created_at);
        const currentMonth = new Date().getMonth();

        let normalizedAdvances = [];
        let advanceTotal = 0;

        if (
          Array.isArray(resp.advance_history) &&
          resp.advance_history.length > 0
        ) {
          normalizedAdvances = parseAdvanceHistory(resp.advance_history);
          advanceTotal = normalizedAdvances.reduce((s, n) => s + n, 0);
        } else if (resp.advance && !Array.isArray(resp.advance)) {
          const p = parseFloat(resp.advance);
          if (!Number.isNaN(p) && p > 0) {
            normalizedAdvances = [p];
            advanceTotal = p;
          }
        }

        const parsedReasons = parseAdvanceReason(
          resp.advance_reason ?? resp.reason ?? ""
        );

        if (lastModifiedMonth === null) {
          setStoredAdvances(normalizedAdvances);
          setReasonsList(parsedReasons);
          setFormData((prev) => ({
            ...prev,
            ...baseForm,
            advance: advanceTotal,
            reason: parsedReasons.join(", ") || resp.reason || "",
          }));
          scheduleResetAtNextMonth();
        } else if (lastModifiedMonth !== currentMonth) {
          setStoredAdvances([]);
          setReasonsList([]);
          setFormData((prev) => ({
            ...prev,
            ...baseForm,
            advance: 0,
            reason: "",
          }));
          scheduleResetAtNextMonth();
        } else {
          setStoredAdvances(normalizedAdvances);
          setReasonsList(parsedReasons);
          setFormData((prev) => ({
            ...prev,
            ...baseForm,
            advance: advanceTotal,
            reason: parsedReasons.join(", ") || resp.reason || "",
          }));
          scheduleResetAtNextMonth();
        }
      } catch (err) {
        console.error("Failed to fetch employee data:", err);
      }
    };

    if (id) {
      fetchEmployee();
    }

    return () => {
      clearResetTimer();
    };
  }, [API_URL, id]);

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

  const [excel, setExcel] = useState([]);

  const exportExcel = async (e) => {
    e?.preventDefault && e.preventDefault();

    if (!id) {
      console.error("Missing employee id");
      toast.error("Missing employee ID!", { position: "bottom-right" });
      return;
    }

    const buildUrl = (base, path) =>
      base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");

    const tryUrls = [
      buildUrl(API_URL, `api/export-excel/${id}`),
      buildUrl(API_URL, `export-excel/${id}`),
    ];

    let response = null;
    let usedUrl = null;

    for (const url of tryUrls) {
      try {
        console.log("Trying export URL:", url);
        const res = await axios.get(url, { responseType: "arraybuffer" });
        response = res;
        usedUrl = url;
        console.log("Export success from:", url, "status:", res.status);
        break;
      } catch (err) {
        console.warn(
          "Export attempt failed for:",
          url,
          err?.response?.status || err?.message || err
        );
      }
    }

    if (!response) {
      console.error(
        "All export attempts failed. Check server route & network."
      );
      toast.error("No due.", { position: "bottom-right" });
      return;
    }

    try {
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (!blob || blob.size === 0) {
        console.error(
          "Downloaded blob is empty. Server may have returned an error payload."
        );
        toast.error("No due.", { position: "bottom-right" });
        return;
      }

      const cd =
        response.headers &&
        (response.headers["content-disposition"] ||
          response.headers["Content-Disposition"]);
      let filename = `employee_${id}_lastmonth.xlsx`;
      if (cd) {
        const match =
          /filename\*=UTF-8''([^;]+)|filename=\"?([^;\"]+)\"?/i.exec(cd);
        if (match) filename = decodeURIComponent(match[1] || match[2]);
      }

      const href = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);

      setExcel(response.data);
      console.log("Downloaded file:", filename, "from:", usedUrl);
    } catch (err) {
      console.error("Error saving downloaded file:", err);
      toast.error("No due.", { position: "bottom-right" });
    }
  };

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div className="card shadow-sm employee-details">
        <div className="card-header text-center">
          <h5 className="mb-0">Edit Employee: {formData.employee_name}</h5>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  onBlur={() => {
                    const amt = parseFloat(advanceInput);
                    if (!Number.isNaN(amt) && amt > 0) {
                      handleAdd();
                    }
                  }}
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
                      {storedAdvances.length > 0 ? (
                        <>
                          {storedAdvances.map((a) => fmt(a)).join(" + ")}
                          {" = "}
                          <span className="text-danger fw-bold">
                            {currency}
                            {storedAdvances
                              .reduce((s, n) => s + n, 0)
                              .toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-danger fw-bold">
                          {currency} 0.00
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

                    <button
                      className="btn btn-outline-primary create-crud px-2 py-1"
                      onClick={exportExcel}
                    >
                      Download
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
                Update Employee Details
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
