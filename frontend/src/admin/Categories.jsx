import React, { useEffect, useMemo, useState } from "react";
import "../App.css";
import { Link, NavLink } from "react-router-dom";
import axios from "axios";
import useCurrency from "../context/useCurrency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Categories() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [view, setView] = useState("expense");
  const [category, setCategory] = useState([]);
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const { currency } = useCurrency();
  const currencyCtx = useCurrency?.() || null;

  useEffect(() => {
    const allcategory = async () => {
      try {
        const response = await axios.get(`${API_URL}/allcategorydata`);
        let payload = response?.data;
        if (payload && payload.data && Array.isArray(payload.data))
          payload = payload.data;

        if (Array.isArray(payload)) {
          const normalized = payload.map((p) => ({
            ...p,
            id: p.id ?? p._id ?? p.category_id ?? p.id,
            amount:
              p.amount ??
              p.total ??
              p.total_amount ??
              p.value ??
              p.spent ??
              p.balance ??
              null,
            currency: p.currency ?? undefined,
            locale: p.locale ?? undefined,
          }));
          setCategory(normalized);
        } else {
          setCategory([]);
        }
        setPage(0);
      } catch (error) {
        console.error("error fetching categories", error);
        setCategory([]);
      }
    };
    allcategory();
  }, [API_URL]);

  const total = category.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, page]);

  const pagedCategories = useMemo(() => {
    const start = page * pageSize;
    return category.slice(start, start + pageSize);
  }, [category, page]);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAllOnPage, setSelectAllOnPage] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selectAllOnPage) {
        (pagedCategories || []).forEach((it) => {
          const key = it.id ?? it._id ?? it.category_id;
          if (next.has(key)) next.delete(key);
        });
        setSelectAllOnPage(false);
      } else {
        (pagedCategories || []).forEach((it) => {
          const key = it.id ?? it._id ?? it.category_id;
          if (key !== undefined && key !== null) next.add(key);
        });
        setSelectAllOnPage(true);
      }
      return next;
    });
  };

  const loadImageAsDataUrl = (url, maxWidth = 60, maxHeight = 40) =>
    new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const ratio = Math.min(
            maxWidth / img.width,
            maxHeight / img.height,
            1
          );
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/png");
          resolve({ dataUrl, width: w, height: h });
        } catch (err) {
          console.warn("Image toDataURL failed for", url, err);
          resolve(null);
        }
      };
      img.onerror = (err) => {
        console.warn("Image load failed for", url, err);
        resolve(null);
      };
      img.src = url;
      if (img.complete && img.naturalWidth) {
        setTimeout(() => {
          if (img.naturalWidth) img.onload();
        }, 0);
      }
    });

  function resolveCurrencyEntry(maybeCurrency) {
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
  }

  const fmtCurrencyPDF = (value, currencyEntryOrCode = "AED", opts = {}) => {
    const { useCode = false } = opts;
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return "-";

    let resolvedEntry;
    try {
      resolvedEntry = resolveCurrencyEntry(currencyEntryOrCode);
    } catch (e) {
      resolvedEntry = { symbol: "د.إ", code: "AED" };
    }

    const symbol = resolvedEntry?.symbol ?? "";
    const code = resolvedEntry?.code ?? "";

    const symbolLooksGood =
      typeof symbol === "string" &&
      symbol.length > 0 &&
      symbol.length <= 3 &&
      !symbol.includes("[object");

    let prefix;
    if (useCode) prefix = code;
    else prefix = symbolLooksGood ? symbol : code;

    const sep = prefix && prefix.length > 1 ? " " : "";

    return `${prefix}${sep}${Number(num).toFixed(2)}`;
  };

  const handleDownloadCategoriesPDF = async () => {
    try {
      const exportList =
        selectedIds && selectedIds.size > 0
          ? (pagedCategories || []).filter((item) => {
              const key = item.id ?? item._id ?? item.category_id;
              return selectedIds.has(key);
            })
          : (pagedCategories || []).slice();

      if (!exportList || exportList.length === 0) {
        alert(
          "No categories to export (select some or browse a page with categories)."
        );
        return;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const now = new Date();
      const title = "Categories Report";
      const filename = `categories_${now.toISOString().slice(0, 10)}.pdf`;

      doc.setFontSize(14);
      doc.text(title, 40, 40);
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, 40, 58);

      const uploadsBase = API_URL
        ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
        : "/uploads";

      const imagePromises = exportList.map(async (item) => {
        const imageFilename = item.image ?? item.images?.[0] ?? null;
        const imageUrl = imageFilename
          ? `${uploadsBase}/${imageFilename}`
          : null;
        const imgObj = await loadImageAsDataUrl(imageUrl);
        return imgObj;
      });

      const images = await Promise.all(imagePromises);

      const rows = exportList.map((item, i) => {
        const key = item.id ?? item._id ?? item.category_id ?? i;
        const category_name =
          item.category_name ?? item.name ?? item.label ?? "—";

        const rawAmount =
          item.amount ??
          item.total ??
          item.total_amount ??
          item.value ??
          item.spent ??
          item.balance ??
          null;
        const cleaned =
          rawAmount === null || rawAmount === undefined || rawAmount === ""
            ? null
            : String(rawAmount).replace(/,/g, "").trim();
        const num = cleaned !== null ? Number(cleaned) : NaN;

        const itemCurrencyCandidate =
          item.currency ??
          item.currency_code ??
          item.currencyCode ??
          item.currencyEntry ??
          item.currentOption ??
          item.selected ??
          (item.locale ? { locale: item.locale } : null) ??
          null;

        const currencyToUse = itemCurrencyCandidate ?? currencyCtx ?? "AED";

        const amountCell = !Number.isNaN(num)
          ? fmtCurrencyPDF(num, currencyToUse, { useCode: true })
          : rawAmount === null
          ? "—"
          : String(rawAmount);

        const note = item.note ?? item.notes ?? item.description ?? "—";

        const hasImage = Boolean(images[i] && images[i].dataUrl);
        const imageCell = hasImage ? "IMG" : "-";

        return [imageCell, category_name, amountCell, note];
      });

      autoTable(doc, {
        startY: 80,
        head: [["Image", "Category", "Amount", "Note"]],
        body: rows,
        theme: "grid",
        tableWidth: "auto",
        margin: { left: 40, right: 40 },
        styles: {
          fontSize: 10,
          cellPadding: 6,
          halign: "center",
          valign: "middle",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 60, halign: "center" },
          1: { cellWidth: 240, halign: "center" },
          2: { cellWidth: 100, halign: "center" },
          3: { cellWidth: 140, halign: "center" },
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const rowIndex = data.row.index;
            const imgObj = images[rowIndex];
            if (imgObj && imgObj.dataUrl) {
              try {
                const cell = data.cell;
                const padding = 4;
                const maxW = cell.width - padding * 2;
                const maxH = cell.height - padding * 2;

                const w = Math.min(imgObj.width, maxW);
                const h = Math.min(imgObj.height, maxH);

                const x = cell.x + (cell.width - w) / 2;
                const y = cell.y + (cell.height - h) / 2;

                doc.addImage(imgObj.dataUrl, "PNG", x, y, w, h);
              } catch (err) {}
            }
          }
        },
      });

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : 80;
      doc.setFontSize(10);
      doc.text(`Exported categories: ${exportList.length}`, 40, finalY);

      doc.save(filename);
    } catch (err) {
      console.error("Could not create categories PDF with images:", err);
      alert("Could not create PDF. See console for details.");
    }
  };

  return (
    <div className="content-wrapper">
      <div className="transaction-page">
        <div className="payroll-inner">
          <header className="top-bar py-2 px-3 pt-2">
            <div className="d-flex justify-content-end w-100">
              <button className="plus-button">
                <NavLink
                  to="/admin/allcategories"
                  className="text-decoration-none text-dark"
                >
                  +
                </NavLink>
              </button>
            </div>
          </header>

          <nav
            className="icon-row d-flex flex-row flex-nowrap mt-0"
            role="navigation"
            aria-label="main navigation"
          >
            <NavLink to="/admin/expense" className="tile">
              <div className="tile-icon">💸</div>
              <div className="tile-label">Spending</div>
            </NavLink>

            <NavLink to="/admin/transaction" className="tile">
              <div className="tile-icon">📄</div>
              <div className="tile-label">Transactions</div>
            </NavLink>

            <NavLink to="/admin/categories" className="tile">
              <div className="tile-icon">📂</div>
              <div className="tile-label">Categories</div>
            </NavLink>
          </nav>

          <main
            className="chalkboard-transaction h-auto d-flex flex-column"
            aria-live="polite"
          >
            <div className="mb-2 d-flex justify-content-center flex-nowrap">
              <button
                type="button"
                className={`px-2 py-1 bg-success button1 ${
                  view === "expense" ? "button-active" : ""
                }`}
                onClick={() => setView("expense")}
                aria-pressed={view === "expense"}
              >
                Expense
              </button>

              <Link
                to="/admin/income"
                className="px-2 py-1 button2 text-decoration-none income-btn"
              >
                Income
              </Link>
            </div>

            {view === "expense" && (
              <div className="d-flex flex-column mt-2">
                <div
                  className="d-flex justify-content-end me-1 mb-0
                 align-items-center"
                >
                  <Link
                    className="btn btn-success py-1 create-button"
                    to="/admin/category/create"
                    aria-label="category-create"
                  >
                    Create
                  </Link>
                </div>

                {Array.isArray(pagedCategories) &&
                  pagedCategories.length === 0 && (
                    <div className="px-4 py-4 text-center text-light">
                      No categories available.
                    </div>
                  )}

                {Array.isArray(pagedCategories) &&
                  pagedCategories.length > 0 && (
                    <div className="px-2 py-2 d-flex align-items-center ms-0">
                      <input
                        type="checkbox"
                        id="selectAllOnPage"
                        checked={selectAllOnPage}
                        onChange={toggleSelectAllOnPage}
                        className="me-2"
                        aria-label="Select all categories on this page"
                      />
                      <label htmlFor="selectAllOnPage" className="me-3 mb-0">
                        Select all category
                      </label>
                    </div>
                  )}

                {Array.isArray(pagedCategories) &&
                  pagedCategories.map((item, index) => {
                    const key =
                      item.id ?? item._id ?? item.category_id ?? index;
                    const label =
                      item.category_name ?? item.name ?? item.label ?? "—";

                    const rawAmount =
                      item.amount ??
                      item.total ??
                      item.total_amount ??
                      item.value ??
                      item.spent ??
                      item.balance ??
                      null;

                    const formatAmount = (val) => {
                      if (val === null || val === undefined || val === "")
                        return "—";
                      const cleaned = String(val).replace(/,/g, "").trim();
                      const num = Number(cleaned);
                      return !Number.isNaN(num) ? num.toFixed(2) : val;
                    };

                    const amount = formatAmount(rawAmount);

                    const uploadsBase = API_URL
                      ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
                      : "/uploads";
                    const imageFilename =
                      item.image ?? item.images?.[0] ?? null;
                    const imageUrl = imageFilename
                      ? `${uploadsBase}/${imageFilename}`
                      : null;
                    const emoji = item.icon ?? item.emoji ?? "👕";

                    return (
                      <div key={key}>
                        <div className="d-flex flex-row flex-nowrap text-start gap-2 px-4 py-2 color-profile pointer-class align-items-center">
                          <span className="category-icon-wrapper" aria-hidden>
                            <div className="d-flex">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(key)}
                                onChange={() => toggleSelect(key)}
                                className=""
                                aria-label={`Select category ${label}`}
                              />
                            </div>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={label}
                                loading="lazy"
                                className="category-icon ms-2"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.display = "none";
                                  const fallback = e.currentTarget.nextSibling;
                                  if (fallback)
                                    fallback.style.display = "inline";
                                }}
                              />
                            ) : null}

                            <span
                              className="category-emoji"
                              style={{ display: imageUrl ? "none" : "inline" }}
                            >
                              {emoji}
                            </span>
                          </span>

                          <Link
                            className="text-dark ms-1 text-start text-decoration-none d-flex w-100 align-items-center"
                            to={`/admin/category/view/${
                              item.id ?? item._id ?? item.category_id
                            }`}
                          >
                            <span className="flex-grow-1 text-start ms-3">
                              {label}
                            </span>
                            <span className="category-amount ms-2 text-nowrap">
                              {currency}
                              {amount}
                            </span>
                          </Link>
                        </div>

                        <hr className="mt-0 mb-0" />
                      </div>
                    );
                  })}

                <div className="d-flex justify-content-center mt-2">
                  <button
                    className="btn btn-success rounded-1"
                    onClick={handleDownloadCategoriesPDF}
                  >
                    Download PDF
                  </button>
                </div>

                {total > pageSize && (
                  <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
                    <button
                      className="btn btn-sm btn-success pagination-button"
                      onClick={handlePrev}
                      disabled={page === 0}
                    >
                      Prev
                    </button>

                    <button
                      className="btn btn-sm btn-success pagination-button"
                      onClick={handleNext}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
