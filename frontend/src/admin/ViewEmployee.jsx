import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CURRENCY_OPTIONS } from "../context/currencies";
import useCurrency from "../context/useCurrency";

function ViewEmployee() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const currencyCtx = useCurrency();

  const resolveCurrencyEntry = (maybeCurrency) => {
    const cand = maybeCurrency ?? currencyCtx ?? null;

    const defaultEntry = (CURRENCY_OPTIONS || []).find(
      (c) => c.code === "AED"
    ) || {
      code: "AED",
      locale: "en-AE",
      symbol: "د.إ",
    };

    if (!cand) return defaultEntry;

    const normalizedCandidates = [
      cand,
      cand?.currency,
      cand?.currentOption,
      cand?.selected,
      cand?.selectedCurrency,
    ];

    for (const val of normalizedCandidates) {
      if (!val) continue;
      if (typeof val === "string") {
        const byCode = (CURRENCY_OPTIONS || []).find(
          (c) => String(c.code).toUpperCase() === String(val).toUpperCase()
        );
        if (byCode) return byCode;
        const byId = (CURRENCY_OPTIONS || []).find((c) => c.id === val);
        if (byId) return byId;
        const bySymbol = (CURRENCY_OPTIONS || []).find((c) => c.symbol === val);
        if (bySymbol) return bySymbol;
      }

      if (typeof val === "object") {
        if (val.code) {
          const byCode = (CURRENCY_OPTIONS || []).find(
            (c) =>
              String(c.code).toUpperCase() === String(val.code).toUpperCase()
          );
          if (byCode) return byCode;
        }
        if (val.locale) {
          const byLocale = (CURRENCY_OPTIONS || []).find(
            (c) => c.locale === val.locale
          );
          if (byLocale) return byLocale;
        }
        if (val.symbol) {
          const bySymbol = (CURRENCY_OPTIONS || []).find(
            (c) => c.symbol === val.symbol
          );
          if (bySymbol) return bySymbol;
        }
        const looksLikeEntry = (CURRENCY_OPTIONS || []).find(
          (c) => c === val || (c.code && val.code && c.code === val.code)
        );
        if (looksLikeEntry) return looksLikeEntry;
      }
    }

    return defaultEntry;
  };

  const fmtCurrencyUI = (
    value,
    currencyCode = "AED",
    locale = "en-AE",
    fallbackSymbol
  ) => {
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return "-";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "symbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch (err) {
      if (fallbackSymbol) return `${fallbackSymbol}${num.toFixed(2)}`;
      return `${num.toFixed(2)} ${currencyCode}`;
    }
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
    } catch (err) {
      return `${num.toFixed(2)} ${currencyCode}`;
    }
  };

  useEffect(() => {
    const alldata = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/someemployee/${id}`);
        const data = Array.isArray(response.data)
          ? response.data[0] || null
          : response.data || null;
        setUser(data);
      } catch (error) {
        console.error("Error fetching employee:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) alldata();
  }, [API_URL, id]);

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const handleDownloadPDF = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const s = user;
    if (!s) {
      alert("No employee data to export.");
      return;
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const leftMargin = 20;
      const rightMargin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const availWidth = pageWidth - leftMargin - rightMargin;
      const titleY = 40;
      const now = new Date();

      const currencyEntry = resolveCurrencyEntry(currencyCtx);
      const currencyCode = currencyEntry?.code || "AED";
      const currencyLocale = currencyEntry?.locale || "en-AE";

      doc.setFontSize(14);
      doc.text("Employee Details", pageWidth / 2, titleY, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, leftMargin, titleY + 18);

      const salaryVal = s.employee_salary ?? s.salary ?? s.salary_amount ?? 0;
      const advanceVal = s.advance ?? s.advance_amount ?? s.advanceAmount ?? 0;

      const detailsRows = [
        ["Employee Name", s.employee_name ?? "-"],
        ["Employee ID", s.id ?? "-"],
        [
          "Date of Birth",
          s.dob ? new Date(s.dob).toLocaleDateString("en-GB") : "-",
        ],
        [
          "Date of Joining",
          s.doj ? new Date(s.doj).toLocaleDateString("en-GB") : "-",
        ],
        ["Shop", s.shop_name ?? "-"],
        ["Department", s.department ?? "-"],
        ["Contact Number", s.contact ?? "-"],
        ["Email", s.email ?? "-"],
        ["Employee Salary", fmtCurrencyPDF(salaryVal, currencyCode)],
        ["Advance Amount", fmtCurrencyPDF(advanceVal, currencyCode)],
        ["Reason for Advance", s.reason ?? "-"],
      ];

      const detailsCol1 = Math.min(180, Math.floor(availWidth * 0.38));
      const detailsCol2 = availWidth - detailsCol1;

      autoTable(doc, {
        startY: titleY + 70,
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
          halign: "center",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: detailsCol1, halign: "center" },
          1: { cellWidth: detailsCol2, halign: "center" },
        },
      });

      const salary = Number(salaryVal || 0);
      const advance = Number(advanceVal || 0);
      const finalSalary = salary - advance;

      const amountColWidth = Math.min(180, Math.floor(availWidth * 0.3));
      const salaryCol1 = availWidth - amountColWidth;

      const salaryRows = [
        ["Gross Salary", fmtCurrencyPDF(salary, currencyCode)],
        ["Advance Taken", fmtCurrencyPDF(advance, currencyCode)],
        ["Net Payable", fmtCurrencyPDF(finalSalary, currencyCode)],
      ];

      const salaryStartY = doc.lastAutoTable
        ? doc.lastAutoTable.finalY + 20
        : titleY + 200;

      autoTable(doc, {
        startY: salaryStartY,
        head: [["Particulars", `Amount (${currencyCode})`]],
        body: salaryRows,
        theme: "grid",
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: "auto",
        styles: {
          fontSize: 10,
          cellPadding: 6,
          overflow: "ellipsize",
          halign: "center",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: salaryCol1, halign: "center" },
          1: { cellWidth: amountColWidth, halign: "center" },
        },
      });

      const footerY = doc.lastAutoTable
        ? doc.lastAutoTable.finalY + 40
        : salaryStartY + 120;
      doc.setFontSize(10);
      doc.text("Employer Signature: ____________________", leftMargin, footerY);
      doc.text(
        "Employee Signature: ____________________",
        pageWidth / 2,
        footerY
      );
      doc.setFontSize(9);
      doc.text(
        "This is a computer generated salary slip and does not require a physical signature.",
        leftMargin,
        footerY + 24
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

  const displayUser = user || {};
  const currencyEntryForUI = resolveCurrencyEntry(currencyCtx);
  const uiCurrencyCode = currencyEntryForUI.code || "AED";
  const uiCurrencyLocale = currencyEntryForUI.locale || "en-AE";
  const uiFallbackSymbol = currencyEntryForUI.symbol || uiCurrencyCode;

  const rows = [
    { label: "Employee Name", value: displayUser.employee_name || "-" },
    { label: "Date of Birth", value: formatDate(displayUser.dob) },
    { label: "Date of Joining", value: formatDate(displayUser.doj) },
    { label: "Shop", value: displayUser.shop_name || "-" },
    { label: "Department", value: displayUser.department || "-" },
    { label: "Contact Number", value: displayUser.contact || "-" },
    { label: "Email", value: displayUser.email || "-" },
    {
      label: "Employee Salary",
      value: displayUser.employee_salary
        ? fmtCurrencyUI(
            displayUser.employee_salary,
            uiCurrencyCode,
            uiCurrencyLocale,
            uiFallbackSymbol
          )
        : "-",
    },
    {
      label: "Advance Amount",
      value:
        displayUser.advance !== undefined && displayUser.advance !== null
          ? fmtCurrencyUI(
              displayUser.advance ?? 0,
              uiCurrencyCode,
              uiCurrencyLocale,
              uiFallbackSymbol
            )
          : fmtCurrencyUI(
              0,
              uiCurrencyCode,
              uiCurrencyLocale,
              uiFallbackSymbol
            ),
    },
  ];

  if (loading) {
    return (
      <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
        <div
          className="spinner-border text-primary"
          role="status"
          aria-hidden="true"
        />
        <span className="ms-2">Loading employee...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
        <div className="alert alert-warning">Employee not found.</div>
      </div>
    );
  }

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center">
      <div
        className="card shadow-sm employee-details"
        style={{ minWidth: 320 }}
      >
        <div className="card-header text-center">
          <h5 className="mb-0">View Employee Details</h5>
        </div>

        <div className="card-body">
          <form>
            <div className="row g-0">
              {Array.isArray(rows) &&
                rows.map((r) => (
                  <div className="col-12" key={r.label}>
                    <div className="d-flex justify-content-between align-items-center py-2 px-2 border-bottom">
                      <span className="text-dark">{r.label}</span>
                      <span className="fw-semibold w-50 text-end text-break">
                        {r.value}
                      </span>
                    </div>
                  </div>
                ))}

              <div className="col-12 d-flex flex-row gap-3 justify-content-center mt-3">
                <Link
                  to="/admin/home"
                  className="btn btn-success text-decoration-none"
                  aria-label="Go back to admin home"
                  prefetch="intent"
                >
                  Back
                </Link>

                <button
                  type="button"
                  className="btn btn-success"
                  aria-label="Download PDF"
                  onClick={handleDownloadPDF}
                >
                  Download PDF
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ViewEmployee;
