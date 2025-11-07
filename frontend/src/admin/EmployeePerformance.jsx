import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import useCurrency from "../context/useCurrency";

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

export default function EmployeePerformance() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [items, setItems] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;
  const [period, setPeriod] = useState("daily");
  const [rangeDisplay, setRangeDisplay] = useState("");
  const { currency } = useCurrency();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchItems = async () => {
      try {
        const res = await axios.get(`${API_URL}/allitemswithuser`);
        const rawData = Array.isArray(res.data.data) ? res.data.data : [];
        if (!mounted) return;
        setItems(rawData);
      } catch (err) {
        console.error("Error fetching items:", err);
        if (!mounted) return;
        setError("Failed to load data");
        setItems([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchItems();
    return () => {
      mounted = false;
    };
  }, [API_URL]);

  useEffect(() => {
    const now = new Date();
    const { start, end } = getRangeForFilter(period, now);
    setRangeDisplay(`${fmtDate(start)} — ${fmtDate(end)}`);

    const userMap = {};

    items.forEach((item) => {
      const userId = item.userId ?? item.user_id ?? item.user ?? "unknown";
      const fullname =
        item.fullname ?? item.fullName ?? item.name ?? `User ${userId}`;

      if (!userMap[userId]) {
        userMap[userId] = {
          userId,
          fullname,
          rangeWork: 0,
          totalWork: 0,
          totalPriceInRange: 0,
        };
      }

      userMap[userId].totalWork += 1;

      const createdAt = item.created_at ? new Date(item.created_at) : null;
      if (!createdAt || isNaN(createdAt.getTime())) {
        return;
      }

      if (
        createdAt.getTime() >= start.getTime() &&
        createdAt.getTime() <= end.getTime()
      ) {
        userMap[userId].rangeWork += 1;
        userMap[userId].totalPriceInRange += Number(item.price) || 0;
      }
    });

    const list = Object.values(userMap);
    list.sort((a, b) => b.rangeWork - a.rangeWork);
    setFilteredEmployees(list);
    setCurrentPage(0);
  }, [items, period]);

  const paginatedEmployees = filteredEmployees.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  const tableWrapStyle = {
    overflowX: "auto",
    padding: 8,
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "auto",
    fontSize: 16,
  };

  const thTdStyle = {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    padding: "8px 10px",
    verticalAlign: "middle",
  };

  const headerCell = {
    ...thTdStyle,
    fontWeight: 600,
    textAlign: "center",
  };

  const currencyCtx = useCurrency?.() || null;

  const resolveCurrencyEntry = (maybeCurrency) => {
    const C = [
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
      if (!filteredEmployees || filteredEmployees.length === 0) {
        alert("No data to export.");
        return;
      }

      const currencyEntry = resolveCurrencyEntry(currency);
      const currencyCode = currencyEntry?.code || "AED";

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const title = "Employee Performance Report";
      const now = new Date();
      const filename = `employee_report_${now.toISOString().slice(0, 10)}.pdf`;

      doc.setFontSize(14);
      doc.text(title, 40, 40);
      doc.setFontSize(10);
      doc.text(`Range: ${rangeDisplay}`, 40, 60);
      doc.text(`Generated: ${now.toLocaleString()}`, 40, 74);

      let totalAmount = 0;
      const rows =
        filteredEmployees.length === 0
          ? [["-", "-", "-", "-"]]
          : filteredEmployees.map((emp) => {
              const workInRange = String(emp.rangeWork ?? 0);
              const allWorkSum = String(emp.totalWork ?? 0);

              let numeric = Number(emp.totalPriceInRange ?? 0);
              if (Number.isNaN(numeric)) {
                const sanitized = String(emp.totalPriceInRange ?? "0").replace(
                  /,/g,
                  ""
                );
                numeric = Number(sanitized) || 0;
              }
              totalAmount += numeric;

              const amountDisplay = fmtCurrencyPDF(numeric, currencyCode);

              return [
                emp.fullname || "-",
                workInRange,
                allWorkSum,
                amountDisplay,
              ];
            });

      autoTable(doc, {
        startY: 95,
        head: [
          [
            "Employee Name",
            "Work in Range",
            "All Work Sum",
            `Amount (${currencyCode})`,
          ],
        ],
        body: rows,
        theme: "grid",
        tableWidth: "auto",
        styles: {
          fontSize: 10,
          textColor: [0, 0, 0],
          cellPadding: 6,
          halign: "center",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "right" },
        },
        margin: { left: 40, right: 40 },
      });

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 95;

      doc.setFontSize(11);
      doc.text(`Total Employees: ${filteredEmployees.length}`, 40, finalY + 16);
      doc.text(
        `Total Amount (${currencyCode}): ${fmtCurrencyPDF(
          totalAmount,
          currencyCode
        )}`,
        40,
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
            Compare Employee Performance
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

          <div className="mt-2">
            <button className="btn btn-success" onClick={handleDownloadReport}>
              Download Report
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center">Loading users...</div>
          ) : error ? (
            <div className="p-4 text-center text-danger">{error}</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-4 text-center">No users found.</div>
          ) : (
            <>
              <div style={tableWrapStyle}>
                <table
                  className="table table-striped table-bordered mb-1"
                  style={tableStyle}
                >
                  <thead className="table-light">
                    <tr>
                      <th style={headerCell}>Employee Name</th>
                      <th style={headerCell}>Work in Range</th>
                      <th style={headerCell}>All Work Sum</th>
                      <th style={headerCell}>Amount in Range</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(paginatedEmployees) &&
                      paginatedEmployees.map((emp, idx) => (
                        <tr key={emp.userId ?? idx}>
                          <td style={thTdStyle} className="text-center">
                            {emp.fullname}
                          </td>
                          <td style={thTdStyle} className="text-center">
                            {emp.rangeWork}
                          </td>
                          <td style={thTdStyle} className="text-center">
                            {emp.totalWork}
                          </td>
                          <td style={thTdStyle} className="text-center">
                            {currency}
                            {emp.totalPriceInRange?.toFixed(2) ?? "0.00"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {filteredEmployees.length > itemsPerPage && (
                <div className="d-flex justify-content-center gap-2 mt-3 mb-3">
                  <button
                    className="btn btn-success btn-sm pagination-button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                    disabled={currentPage === 0}
                  >
                    Prev
                  </button>

                  <button
                    className="btn btn-success btn-sm pagination-button"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(
                          p + 1,
                          Math.ceil(filteredEmployees.length / itemsPerPage) - 1
                        )
                      )
                    }
                    disabled={
                      currentPage ===
                      Math.ceil(filteredEmployees.length / itemsPerPage) - 1
                    }
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
