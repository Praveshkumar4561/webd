import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import useCurrency from "../context/useCurrency";
import { CURRENCY_OPTIONS } from "../context/currencies";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfYear(d) {
  const x = new Date(d);
  x.setMonth(0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfYear(d) {
  const x = new Date(d);
  x.setMonth(11, 31);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeForLast7Days(now) {
  const end = endOfDay(now);
  const start = startOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  );
  return { start, end };
}

function getRangeForFilter(filter, now = new Date()) {
  switch (filter) {
    case "daily":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "weekly":
      return rangeForLast7Days(now);
    case "monthly":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "yearly":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

function fmtDate(d) {
  const x = new Date(d);
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yyyy = x.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatAmount(n) {
  const num = Number(n) || 0;
  if (Number.isInteger(num)) return String(num);
  return String(Number(num).toFixed(2)).replace(/\.00$/, "");
}

export default function EmployeeAdvance() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [period, setPeriod] = useState("daily");
  const [rangeDisplay, setRangeDisplay] = useState("");
  const [employee, setEmployee] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const masterCheckboxRef = useRef(null);
  const itemsPerPage = 6;
  const { currency } = useCurrency();

  const toggleSelectAllVisible = () => {
    const visibleIds = paginatedEmployees.map((e) => e.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      const next = new Set(selectedIds);
      visibleIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      visibleIds.forEach((id) => next.add(id));
      setSelectedIds(next);
    }
  };

  const toggleRowSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filteredEmployees, currentPage]);

  useEffect(() => {
    const alldata = async () => {
      try {
        const response = await axios.get(`${API_URL}/allemployee`);
        setEmployee(
          Array.isArray(response.data.employees) ? response.data.employees : []
        );
      } catch (error) {
        console.error("error fetching employees", error);
        setEmployee([]);
      }
    };
    alldata();
  }, [API_URL]);

  useEffect(() => {
    const now = new Date();
    const { start, end } = getRangeForFilter(period, now);
    setRangeDisplay(`${fmtDate(start)} — ${fmtDate(end)}`);

    const parseDateFlexible = (val) => {
      if (val == null) return null;
      if (val instanceof Date && !isNaN(val.getTime())) return val;
      if (typeof val === "number" && !Number.isNaN(val)) {
        if (val < 1e12) return new Date(val * 1000);
        return new Date(val);
      }
      const s = String(val).trim();
      if (/^\d+$/.test(s)) {
        const num = Number(s);
        if (num < 1e12) return new Date(num * 1000);
        return new Date(num);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const parseAmountFlexible = (val) => {
      if (val == null) return 0;
      if (typeof val === "number" && !Number.isNaN(val)) return val;
      const s = String(val).trim();

      let cleaned = s.replace(/\u202F|\u00A0/g, "");
      if (cleaned.indexOf(",") !== -1 && cleaned.indexOf(".") !== -1) {
        cleaned = cleaned.replace(/,/g, "");
      } else if (cleaned.indexOf(",") !== -1 && cleaned.match(/,\d{1,2}$/)) {
        const lastCommaIndex = cleaned.lastIndexOf(",");
        cleaned =
          cleaned.slice(0, lastCommaIndex) +
          "." +
          cleaned.slice(lastCommaIndex + 1);
        cleaned = cleaned.replace(/[, ]/g, "");
      } else {
        cleaned = cleaned.replace(/[, ]/g, "");
      }
      cleaned = cleaned.replace(/[^0-9.\-]/g, "");
      const num = Number(cleaned);
      return Number.isNaN(num) ? 0 : num;
    };

    const list = (employee || []).map((emp) => {
      const updatedDate =
        parseDateFlexible(
          emp.updated_at ?? emp.updatedAt ?? emp.modified_at ?? emp.modifiedAt
        ) || null;

      let totalAdvance = 0;
      let advanceInRange = 0;
      const amountsInRange = [];
      const allAdvanceAmounts = [];

      try {
        const advHistory = JSON.parse(emp.advance_history || "[]");
        for (const entry of advHistory) {
          const rawAmt =
            entry.amount ??
            entry.advance ??
            entry.value ??
            entry.value_amount ??
            entry.total ??
            0;
          const amt = parseAmountFlexible(rawAmt);
          totalAdvance += amt;
          allAdvanceAmounts.push(amt);

          const entryDateRaw =
            entry.created_at ??
            entry.createdAt ??
            entry.date ??
            entry.timestamp ??
            entry.time ??
            null;
          const entryDate = parseDateFlexible(entryDateRaw);

          if (entryDate) {
            if (
              entryDate.getTime() >= start.getTime() &&
              entryDate.getTime() <= end.getTime()
            ) {
              advanceInRange += amt;
              amountsInRange.push(amt);
            }
          }
        }
      } catch (err) {}

      const isUpdatedInRange =
        updatedDate &&
        updatedDate.getTime() >= start.getTime() &&
        updatedDate.getTime() <= end.getTime();

      if (
        isUpdatedInRange &&
        amountsInRange.length === 0 &&
        allAdvanceAmounts.length > 0
      ) {
        allAdvanceAmounts.forEach((a) => {
          amountsInRange.push(a);
        });
        advanceInRange = allAdvanceAmounts.reduce((s, a) => s + a, 0);
      }

      const totalForEmp = amountsInRange.reduce((s, a) => s + a, 0);
      const expr =
        amountsInRange.length > 0
          ? amountsInRange.map((a) => formatAmount(a)).join("+") +
            "=" +
            formatAmount(totalForEmp)
          : formatAmount(0);

      return {
        ...emp,
        totalAdvance,
        advanceInRange: totalForEmp,
        advanceInRangeExpr: expr,
        _updatedDate: updatedDate,
      };
    });

    const filtered = list.filter((e) => {
      const d = e._updatedDate;
      if (!d) return false;
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    });

    filtered.sort((a, b) => b.advanceInRange - a.advanceInRange);

    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [employee, period]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredEmployees.length / itemsPerPage)
    );
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [filteredEmployees, currentPage]);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / itemsPerPage)
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    if (!masterCheckboxRef.current) return;
    const visibleIds = paginatedEmployees.map((e) => e.id);
    const selectedVisibleCount = visibleIds.filter((id) =>
      selectedIds.has(id)
    ).length;
    const totalVisible = visibleIds.length;
    masterCheckboxRef.current.checked =
      totalVisible > 0 && selectedVisibleCount === totalVisible;
    masterCheckboxRef.current.indeterminate =
      selectedVisibleCount > 0 && selectedVisibleCount < totalVisible;
  }, [selectedIds, paginatedEmployees]);

  const currencyCtx = useCurrency?.() || null;

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

  const handleDownloadReport = () => {
    try {
      const exportList =
        selectedIds && selectedIds.size > 0
          ? filteredEmployees.filter((emp) => selectedIds.has(emp.id))
          : filteredEmployees.slice();

      if (!exportList || exportList.length === 0) {
        alert("No employees selected to export.");
        return;
      }

      const currencyEntry = resolveCurrencyEntry(currency);
      const currencyCode = currencyEntry?.code || "AED";

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const title = "Employee Advance Report";
      const now = new Date();
      const filename = `employee_advance_${now.toISOString().slice(0, 10)}.pdf`;

      const left = 40;
      const right = 40;

      doc.setFontSize(14);
      doc.text(title, left, 40);
      doc.setFontSize(10);
      doc.text(`Range: ${rangeDisplay}`, left, 60);
      doc.text(`Generated: ${now.toLocaleString()}`, left, 76);

      let grandTotal = 0;
      const rows = exportList.map((emp) => {
        const numericRaw = emp.advanceInRange ?? 0;
        let numeric = Number(numericRaw);
        if (Number.isNaN(numeric)) {
          const sanitized = String(numericRaw).replace(/,/g, "");
          numeric = Number(sanitized);
          if (Number.isNaN(numeric)) numeric = 0;
        }

        grandTotal += numeric;

        const advanceDisplay =
          emp.advanceInRangeExpr && String(emp.advanceInRangeExpr).trim() !== ""
            ? emp.advanceInRangeExpr
            : fmtCurrencyPDF(numeric, currencyCode);

        const salaryNumeric = Number(emp.employee_salary ?? 0);
        const salaryDisplay = Number.isNaN(salaryNumeric)
          ? "-"
          : fmtCurrencyPDF(salaryNumeric, currencyCode);

        return [
          emp.employee_name ?? "-",
          emp.category ?? "-",
          advanceDisplay,
          salaryDisplay,
        ];
      });

      autoTable(doc, {
        startY: 95,
        head: [
          [
            "Employee Name",
            "Category",
            `Advance (in range) (${currencyCode})`,
            `Salary (${currencyCode})`,
          ],
        ],
        body: rows.length ? rows : [["-", "-", "-", "-"]],
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 6,
          halign: "center",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        margin: { left, right },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "left" },
          2: { halign: "right" },
          3: { halign: "right" },
        },
      });

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 95;

      doc.setFontSize(11);
      doc.text(`Total Employees: ${exportList.length}`, left, finalY + 16);
      doc.text(
        `Total Advance (in range): ${fmtCurrencyPDF(grandTotal, currencyCode)}`,
        left,
        finalY + 34
      );

      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not create PDF report");
    }
  };

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div
        className="card shadow-sm employee-details"
        style={{ width: "100%", maxWidth: "980px" }}
      >
        <div className="card-header d-flex align-items-center justify-content-between flex-nowrap">
          <h1 className="mb-1 mt-1 all-employee all-compare">
            Filter Employee Advance Amount
          </h1>

          <div
            className="responsive-dropdown"
            style={{ minWidth: 230, marginTop: 6 }}
          >
            <select
              className="form-select period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Select period"
              style={{ width: "100%", maxWidth: 260 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="d-flex justify-content-evenly flex-wrap px-3 align-items-center">
          <div style={{ textAlign: "center", fontWeight: 700, marginTop: 8 }}>
            Showing: {rangeDisplay}
          </div>

          <div className="mt-2 mb-2">
            <button className="btn btn-success" onClick={handleDownloadReport}>
              Download Report
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          <div>
            <table className="table table-striped table-bordered mb-1">
              <thead className="table-light text-center">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      ref={masterCheckboxRef}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible employees"
                    />
                  </th>

                  <th>Employee Name</th>
                  <th>Total Advance (in range)</th>
                  <th>Total Salary</th>
                </tr>
              </thead>

              <tbody>
                {Array.isArray(paginatedEmployees) &&
                  paginatedEmployees.map((emp, idx) => (
                    <tr key={emp.id ?? idx}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp.id)}
                          onChange={() => toggleRowSelection(emp.id)}
                          aria-label={`Select ${emp.employee_name}`}
                        />
                      </td>

                      <td className="text-center">{emp.employee_name}</td>

                      <td className="text-center">
                        {currency}
                        {formatAmount(emp.advanceInRange ?? 0)}
                      </td>

                      <td className="text-center">
                        {currency}
                        {emp.employee_salary}
                      </td>
                    </tr>
                  ))}
                {paginatedEmployees.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-3">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length > itemsPerPage && (
            <div className="d-flex justify-content-center gap-2 align-items-center px-3 pb-3">
              <button
                className="btn btn-sm btn-outline-success mt-3"
                onClick={handlePrev}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              <button
                className="btn btn-sm btn-outline-success mt-3"
                onClick={handleNext}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
