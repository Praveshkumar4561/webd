import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import useCurrency from "../context/useCurrency";
import { CURRENCY_OPTIONS } from "../context/currencies";
import Share from "../assets/Share.png";

export default function Expenses() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [isAdvanceApplied, setIsAdvanceApplied] = useState(false);
  const { currency } = useCurrency();
  const currencyCtx = useCurrency();
  const [paid, setPaid] = useState(false);
  const [paidStatus, setPaidStatus] = useState(null);

  const [transfer, setTransfer] = useState({
    employee_id: "",
    employee_name: "",
    employee_salary: "",
    advance: "",
    reason: "",
    salary_month: "",
    employee_doj: "",
  });

  useEffect(() => {
    const getAllEmployees = async () => {
      try {
        const response = await axios.get(`${API_URL}/allemployee`);
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.employees || [];
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    getAllEmployees();
  }, [API_URL]);

  const daysInMonth = (year, monthIndex) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const computeSalaryForMonth = (fullSalary, dojISO, salaryMonthISO) => {
    const salaryNum = Number(fullSalary || 0);

    if (!dojISO) return salaryNum;

    const [yearStr, monthStr] = (salaryMonthISO || "").split("-");
    if (!yearStr || !monthStr) return salaryNum;

    const doj = new Date(dojISO);
    if (isNaN(doj.getTime())) return salaryNum;

    const dojYear = doj.getFullYear();
    const dojMonth = doj.getMonth() + 1;
    const targetYear = Number(yearStr);
    const targetMonth = Number(monthStr);

    if (dojYear !== targetYear || dojMonth !== targetMonth) return salaryNum;

    const totalDays = daysInMonth(targetYear, targetMonth - 1);
    const dojDay = doj.getDate();

    if (dojDay === 1) return salaryNum;

    let daysPaid = totalDays - dojDay;
    if (daysPaid < 0) daysPaid = 0;

    const daily = salaryNum / totalDays;
    let prorated = daily * daysPaid;

    prorated = Math.round((prorated + Number.EPSILON) * 100) / 100;
    return prorated;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "employee_id") {
      if (!value) {
        setIsAdvanceApplied(false);
        setTransfer({
          employee_id: "",
          employee_name: "",
          employee_salary: "",
          advance: "",
          reason: "",
          salary_month: "",
          employee_doj: "",
        });
        return;
      }

      const selected = employees.find(
        (emp) => String(emp.id) === String(value)
      );

      if (selected) {
        const salary =
          selected.salary ??
          selected.employee_salary ??
          selected.employeeSalary ??
          selected.pay?.salary ??
          "";

        const advance =
          selected.advance ??
          selected.adv ??
          selected.employee_advance ??
          selected.employeeAdvance ??
          "";

        const nameFromSelected =
          selected.employee_name ?? selected.name ?? selected.fullName ?? "";

        const applied =
          Number(
            selected.advance_applied ?? selected.salary_calculated ?? 0
          ) === 1;

        const dojFromSelected =
          selected.doj || selected.date_of_joining || selected.join_date || "";

        setIsAdvanceApplied(applied);

        setTransfer((prev) => ({
          ...prev,
          employee_id: value,
          employee_name: nameFromSelected,
          employee_salary:
            salary !== null && salary !== undefined ? String(salary) : "",
          advance: applied
            ? ""
            : advance !== null && advance !== undefined
            ? String(advance)
            : "",
          reason: applied ? "" : selected.reason ?? "",
          employee_doj: dojFromSelected || "",
        }));
      } else {
        setIsAdvanceApplied(false);
        setTransfer((prev) => ({ ...prev, employee_id: value }));
      }
      return;
    }

    if (
      transfer.employee_id &&
      isAdvanceApplied &&
      (name === "advance" || name === "reason")
    ) {
      return;
    }

    setTransfer((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaid = async () => {
    if (!summary) {
      return alert("Calculate salary first before marking as paid.");
    }
    setLoading(true);
    try {
      const employeeId = summary.employee_id ?? null;
      const employeeName = summary.employee_name ?? "";

      const already = await hasTransactionSameMonth(
        employeeId,
        employeeName,
        summary.salary_month
      );

      if (already) {
        setPaid(false);
        setPaidStatus("already");
        return;
      }

      const calculation_id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `calc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const payload = {
        employee_id: summary.employee_id || null,
        employee_name: summary.employee_name,
        employee_salary: summary.salary_for_month ?? summary.employee_salary,
        original_employee_salary: summary.employee_salary,
        advance: isAdvanceApplied ? 0 : summary.advance,
        reason: isAdvanceApplied ? null : summary.reason || null,
        salary_month: summary.salary_month,
        calculation_id,
      };

      await axios.post(`${API_URL}/tracker`, payload);

      setPaid(true);
      setPaidStatus("success");

      setTransfer({
        employee_id: "",
        employee_name: "",
        employee_salary: "",
        advance: "",
        reason: "",
        salary_month: "",
        employee_doj: "",
      });
      setIsAdvanceApplied(false);
    } catch (err) {
      console.error("Paid error:", err.response?.data || err.message || err);
      const msg = err.response?.data?.message || "Failed to mark as paid";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPaid(false);
    setPaidStatus(null);
    setCalculating(true);

    try {
      if (!transfer.employee_id) {
        alert("Please select an employee.");
        setCalculating(false);
        return;
      }
      if (!transfer.employee_salary) {
        alert("Please provide the employee's salary.");
        setCalculating(false);
        return;
      }

      const d = new Date();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const salary_month = `${year}-${month}`;

      const nameToShow =
        transfer.employee_name ||
        (
          employees.find(
            (emp) => String(emp.id) === String(transfer.employee_id)
          ) || {}
        ).employee_name ||
        "";

      const advanceToShow = isAdvanceApplied ? 0 : transfer.advance || 0;

      const salaryForMonth = computeSalaryForMonth(
        transfer.employee_salary,
        transfer.employee_doj,
        salary_month
      );

      const final = Number(salaryForMonth || 0) - Number(advanceToShow || 0);

      setSummary({
        employee_id: transfer.employee_id,
        employee_name: nameToShow,
        employee_salary: transfer.employee_salary,
        salary_for_month: salaryForMonth,
        advance: advanceToShow,
        reason: isAdvanceApplied ? null : transfer.reason || null,
        salary_month,
        final_salary: final,
      });
    } finally {
      setCalculating(false);
    }
  };

  const hasTransactionSameMonth = async (
    employeeId,
    employeeName,
    salaryMonth
  ) => {
    try {
      const res = await axios.get(`${API_URL}/alltransactions`);
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      if (!Array.isArray(list) || list.length === 0) return false;

      const targetMonth = (salaryMonth || "").toString().slice(0, 7);

      return list.some((t) => {
        const created = t.created_at || t.createdAt || t.created || "";
        const createdMonth = created ? created.slice(0, 7) : "";

        const sameMonth = createdMonth === targetMonth;
        if (!sameMonth) return false;

        if (
          t.employee_id !== undefined &&
          employeeId !== undefined &&
          employeeId !== null &&
          String(t.employee_id) === String(employeeId)
        ) {
          return true;
        }

        if (
          t.employee_name &&
          employeeName &&
          String(t.employee_name).trim().toLowerCase() ===
            String(employeeName).trim().toLowerCase()
        ) {
          return true;
        }

        return false;
      });
    } catch (err) {
      console.warn(
        "Failed to fetch transactions for duplicate check:",
        err?.message || err
      );
      return false;
    }
  };

  const resolveCurrencyEntry = (maybeCurrency) => {
    const C = CURRENCY_OPTIONS || [
      { id: "د.إ", code: "AED", symbol: "د.إ", locale: "ar-AE" },
      { id: "$", code: "USD", symbol: "$", locale: "en-US" },
      { id: "₹", code: "INR", symbol: "₹", locale: "en-IN" },
      { id: "Rs", code: "PKR", symbol: "Rs", locale: "en-PK" },
      { id: "රු", code: "LKR", symbol: "රු", locale: "si-LK" },
      { id: "Nu", code: "BTN", symbol: "Nu", locale: "dz-BT" },
      { id: "৳", code: "BDT", symbol: "৳", locale: "bn-BD" },
      { id: "₨", code: "NPR", symbol: "₨", locale: "ne-NP" },
    ];

    const cand = maybeCurrency ?? currencyCtx ?? null;
    const defaultEntry = C.find((c) => c.code === "AED") || C[0];

    if (!cand) return defaultEntry;

    const candidates = [
      cand,
      cand?.currency,
      cand?.currentOption,
      cand?.selected,
    ];
    for (const v of candidates) {
      if (!v) continue;
      if (typeof v === "string") {
        const byCode = C.find(
          (x) => String(x.code).toUpperCase() === String(v).toUpperCase()
        );
        if (byCode) return byCode;
        const byId = C.find((x) => x.id === v);
        if (byId) return byId;
        const bySymbol = C.find((x) => x.symbol === v);
        if (bySymbol) return bySymbol;
      }
      if (typeof v === "object") {
        if (v.code) {
          const byCode = C.find(
            (x) => String(x.code).toUpperCase() === String(v.code).toUpperCase()
          );
          if (byCode) return byCode;
        }
        if (v.locale) {
          const byLocale = C.find((x) => x.locale === v.locale);
          if (byLocale) return byLocale;
        }
        if (v.symbol) {
          const bySymbol = C.find((x) => x.symbol === v.symbol);
          if (bySymbol) return bySymbol;
        }
        const exact = C.find((x) => x.code === v.code);
        if (exact) return exact;
      }
    }

    return defaultEntry;
  };

  const fmtCurrencyPDF = (value, currencyCode = "AED") => {
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return "-";
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "code",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `${num.toFixed(2)} ${currencyCode}`;
    }
  };

  const handleDownloadPDF = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const s = summary;
    if (!s) {
      alert("No salary summary to export. Create one by calculating first.");
      return;
    }

    try {
      const currencyEntry = resolveCurrencyEntry(currencyCtx);
      const currencyCode = currencyEntry?.code || "AED";

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const leftMargin = 20;
      const rightMargin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const availWidth = pageWidth - leftMargin - rightMargin;
      const now = new Date();

      const titleY = 40;
      doc.setFontSize(16);
      doc.text("Salary Slip", pageWidth / 2, titleY, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, leftMargin, titleY + 18);

      const salaryNum = Number(s.employee_salary || 0);
      const salaryForMonthNum = Number(s.salary_for_month ?? salaryNum);
      const advanceNum = Number(s.advance || 0);
      const finalNum = Number(s.final_salary ?? salaryForMonthNum - advanceNum);

      const detailsStartY = titleY + 48;
      const detailsRows = [
        ["Employee Name", s.employee_name ?? "-"],
        ["Salary (Full month)", fmtCurrencyPDF(salaryNum, currencyCode)],
        [
          "Salary for this month",
          fmtCurrencyPDF(salaryForMonthNum, currencyCode),
        ],
        ["Advance Taken", fmtCurrencyPDF(advanceNum, currencyCode)],
        ["Final Salary", fmtCurrencyPDF(finalNum, currencyCode)],
        ["Reason for Advance", s.reason ?? "-"],
      ];

      const detailsCol1 = Math.min(260, Math.floor(availWidth * 0.45));
      const detailsCol2 = availWidth - detailsCol1;

      autoTable(doc, {
        startY: detailsStartY,
        head: [["Field", "Value"]],
        body: detailsRows,
        theme: "grid",
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: "auto",
        styles: {
          fontSize: 10,
          cellPadding: 6,
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: detailsCol1, halign: "left" },
          1: { cellWidth: detailsCol2, halign: "left" },
        },
      });

      const footerY = doc.lastAutoTable
        ? doc.lastAutoTable.finalY + 40
        : detailsStartY + 160;
      doc.setFontSize(10);
      doc.text("Employer Signature: ____________________", leftMargin, footerY);
      const sigX = pageWidth - rightMargin - 220;
      doc.text("Employee Signature: ____________________", sigX, footerY);
      doc.setFontSize(9);
      doc.text(
        "This is a computer generated salary slip and does not require a physical signature.",
        leftMargin,
        footerY + 22
      );

      const safeName = (s.employee_name || "employee").replace(/\s+/g, "_");
      const filename = `${safeName}_salary_slip_${now
        .toISOString()
        .slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF creation error:", err);
      alert("Could not create PDF. See console for details.");
    }
  };

  const isPrefilled = Boolean(transfer.employee_id && !isAdvanceApplied);

  const finalSalary = summary ? Number(summary.final_salary ?? 0) : null;

  const formattedAmount = (amount) =>
    (amount < 0 ? "-" : "") +
    currency +
    Math.abs(amount).toLocaleString("en-IN");

  const handleShare = async () => {
    const s = summary;
    if (!s) {
      alert("No salary summary to share. Please generate it first.");
      return;
    }

    try {
      const currencyEntry = resolveCurrencyEntry(currencyCtx);
      const currencyCode = currencyEntry?.code || "AED";

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const leftMargin = 20;
      const rightMargin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const availWidth = pageWidth - leftMargin - rightMargin;
      const now = new Date();

      const titleY = 40;
      doc.setFontSize(16);
      doc.text("Salary Slip", pageWidth / 2, titleY, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, leftMargin, titleY + 18);

      const salaryNum = Number(s.employee_salary || 0);
      const salaryForMonthNum = Number(s.salary_for_month ?? salaryNum);
      const advanceNum = Number(s.advance || 0);
      const finalNum = Number(s.final_salary ?? salaryForMonthNum - advanceNum);

      const detailsStartY = titleY + 48;
      const detailsRows = [
        ["Employee Name", s.employee_name ?? "-"],
        ["Salary (Full month)", fmtCurrencyPDF(salaryNum, currencyCode)],
        [
          "Salary for this month",
          fmtCurrencyPDF(salaryForMonthNum, currencyCode),
        ],
        ["Advance Taken", fmtCurrencyPDF(advanceNum, currencyCode)],
        ["Final Salary", fmtCurrencyPDF(finalNum, currencyCode)],
        ["Reason for Advance", s.reason ?? "-"],
      ];

      const detailsCol1 = Math.min(260, Math.floor(availWidth * 0.45));
      const detailsCol2 = availWidth - detailsCol1;

      autoTable(doc, {
        startY: detailsStartY,
        head: [["Field", "Value"]],
        body: detailsRows,
        theme: "grid",
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: "auto",
        styles: {
          fontSize: 10,
          cellPadding: 6,
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: detailsCol1, halign: "left" },
          1: { cellWidth: detailsCol2, halign: "left" },
        },
      });

      const footerY = doc.lastAutoTable
        ? doc.lastAutoTable.finalY + 40
        : detailsStartY + 160;
      doc.setFontSize(10);
      doc.text("Employer Signature: ____________________", leftMargin, footerY);
      const sigX = pageWidth - rightMargin - 220;
      doc.text("Employee Signature: ____________________", sigX, footerY);
      doc.setFontSize(9);
      doc.text(
        "This is a computer generated salary slip and does not require a physical signature.",
        leftMargin,
        footerY + 22
      );

      const pdfBlob = doc.output("blob");
      const safeName = (s.employee_name || "employee").replace(/\s+/g, "_");
      const filename = `${safeName}_salary_slip_${now
        .toISOString()
        .slice(0, 10)}.pdf`;

      const file = new File([pdfBlob], filename, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Salary Slip",
          text: "Here is my salary slip.",
          files: [file],
        });
        console.log("Shared successfully!");
      } else {
        alert("File sharing is not supported on this browser.");
      }
    } catch (err) {
      console.error("Error sharing PDF:", err);
      alert("Could not share PDF. See console for details.");
    }
  };

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div
        className="card shadow-sm employee-details"
        style={{ minWidth: 320 }}
      >
        <div className="card-header text-center">
          <h5 className="mb-0">Employee Expenses and Salary Tracker</h5>
        </div>

        <div className="card-body">
          <form onSubmit={handleCalculate}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Employee Name:</label>
                <select
                  id="employee_id"
                  name="employee_id"
                  className="form-select"
                  value={transfer.employee_id || ""}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select an Employee</option>
                  {employees.length === 0 ? (
                    <option disabled>No employees found</option>
                  ) : (
                    employees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.employee_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {isAdvanceApplied && (
                <div className="col-12">
                  <div className="alert alert-warning text-start mt-0 mb-0">
                    Note: Advance already applied for this employee. Advance &
                    reason will not be used again.
                  </div>
                </div>
              )}

              <div className="col-12">
                <label className="form-label">
                  Employee Salary (in Dirham):
                </label>
                <input
                  type="number"
                  className="form-control"
                  name="employee_salary"
                  placeholder="Enter Salary"
                  value={transfer.employee_salary}
                  onChange={handleChange}
                  required
                  readOnly={isPrefilled}
                  aria-readonly={isPrefilled}
                  disabled={isPrefilled}
                />
              </div>

              <div className="col-12">
                <label className="form-label">
                  Advance Taken (if any, in Dirham):
                </label>
                <input
                  type="number"
                  className="form-control"
                  name="advance"
                  placeholder="Advance Salary"
                  value={transfer.advance}
                  onChange={handleChange}
                  required
                  readOnly={isPrefilled || isAdvanceApplied}
                  aria-readonly={isPrefilled || isAdvanceApplied}
                  disabled={isPrefilled || isAdvanceApplied}
                />
              </div>

              <div className="col-12">
                <label className="form-label">
                  Reason for Advance (Optional):
                </label>
                <textarea
                  className="form-control"
                  name="reason"
                  placeholder="Reason for the advance (e.g., travel, materials)"
                  value={transfer.reason}
                  onChange={handleChange}
                  rows="3"
                  readOnly={isPrefilled || isAdvanceApplied}
                  aria-readonly={isPrefilled || isAdvanceApplied}
                  style={{ height: "70px" }}
                  disabled={isPrefilled || isAdvanceApplied}
                ></textarea>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={calculating}
              >
                {calculating ? "Calculating..." : "Calculate Salary"}
              </button>
            </div>
          </form>
        </div>

        {summary && (
          <div className="p-0 m-0 fw-bold text-center bg-dark-subtle mt-3">
            <p className="mt-3 mb-1">Salary Details</p>
            <p className="transfer-shop p-1 mb-0">
              Employee: {summary.employee_name} | Salary (Full month):{" "}
              {currency}
              {summary.employee_salary} | Salary for month: {currency}
              {String(summary.salary_for_month)} | Advance Taken: {currency}
              {summary.advance} | Final Salary:{" "}
              {finalSalary < 0
                ? `-${currency}${Math.abs(finalSalary).toLocaleString("en-IN")}`
                : `${currency}${finalSalary.toLocaleString("en-IN")}`}
            </p>

            {finalSalary < 0 ? (
              <div className="mb-3 mt-0 text-danger">
                <span className="final-salary">
                  "Insufficient Balance: ({formattedAmount(finalSalary)}).
                  Cannot Be Processed."
                </span>
              </div>
            ) : (
              <>
                {paidStatus === "success" && (
                  <div className="mb-3 mt-0 text-success">
                    <span>Paid Successfully: {summary.employee_name}</span>
                  </div>
                )}

                {paidStatus === "already" && (
                  <div className="mb-3 mt-0 text-danger">
                    <span>
                      Salary already processed for {summary.salary_month}.
                      eligible next month.
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="mt-0 d-flex flex-row flex-wrap justify-content-center gap-3">
              <button
                type="button"
                className="btn btn-primary mb-3"
                onClick={handleDownloadPDF}
              >
                Download Salary Slip
              </button>

              <div
                className="share-icon"
                onClick={handleShare}
                style={{ cursor: "pointer" }}
              >
                <img src={Share} alt="share icon" title="Share receipt"></img>
              </div>

              <button
                type="button"
                className="btn btn-success mb-3 paid-button"
                onClick={handlePaid}
                disabled={
                  loading ||
                  finalSalary < 0 ||
                  paidStatus === "already" ||
                  paidStatus === "success"
                }
                aria-disabled={
                  loading ||
                  finalSalary < 0 ||
                  paidStatus === "already" ||
                  paidStatus === "success"
                }
              >
                {loading ? "Processing..." : "Paid"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
