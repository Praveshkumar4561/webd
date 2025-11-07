import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
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

function getRangeForFilter(
  filter,
  now = new Date(),
  customFromArg = null,
  customToArg = null
) {
  if (filter === "custom" && customFromArg && customToArg) {
    const s = startOfDay(new Date(customFromArg));
    const e = endOfDay(new Date(customToArg));
    if (!isNaN(s) && !isNaN(e)) return { start: s, end: e };
    return { start: new Date(0), end: endOfDay(now) };
  }
  switch (filter) {
    case "daily":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "weekly":
      return rangeForLast7Days(now);
    case "monthly":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "yearly":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "all":
    default:
      return { start: new Date(0), end: endOfDay(now) };
  }
}

export default function Payroll() {
  const API_URL = import.meta.env.VITE_API_URL;

  const spendingRef = useRef(null);
  const monthPillRef = useRef(null);
  const { currency } = useCurrency();
  const [month, setMonth] = useState(false);

  const monthName = () => {
    setMonth(!month);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        spendingRef.current?.contains(event.target) ||
        monthPillRef.current?.contains(event.target)
      ) {
        return;
      }
      setMonth(false);
    }

    if (month) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [month]);

  const [months, setMonths] = useState("");

  const updateMonth = () => {
    const now = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    setMonths(monthNames[now.getMonth()]);
  };

  useEffect(() => {
    updateMonth();
    const interval = setInterval(updateMonth, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const [rawData, setRawData] = useState({ income: [], expense: [] });
  const [itemsWithUser, setItemsWithUser] = useState([]);
  const [combinedData, setCombinedData] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("daily");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState("Overall Expenses");

  function flattenToArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) {
      return v.reduce((acc, cur) => {
        if (Array.isArray(cur)) return acc.concat(cur);
        if (cur && typeof cur === "object" && !Array.isArray(cur))
          return acc.concat(cur);
        return acc.concat(cur);
      }, []);
    }
    if (typeof v === "object") {
      const vals = Object.values(v);
      const arraysPresent = vals.some((x) => Array.isArray(x));
      if (arraysPresent) {
        return vals.reduce((acc, cur) => {
          if (!cur) return acc;
          if (Array.isArray(cur)) return acc.concat(cur);
          if (typeof cur === "object") return acc.concat(cur);
          return acc.concat(cur);
        }, []);
      }
      return [v];
    }
    return [];
  }

  function normalizeArrayResponse(resOrPayload) {
    if (!resOrPayload) return [];
    const maybeAxios = resOrPayload;
    const payload =
      (maybeAxios && maybeAxios.data && maybeAxios.data.data) ??
      (maybeAxios && maybeAxios.data) ??
      maybeAxios;
    return flattenToArray(payload);
  }

  function parseDateFromItem(item) {
    if (!item || typeof item === "string" || typeof item === "number")
      return null;
    const dateVal =
      item?.created_at ??
      item?.createdAt ??
      item?.updated_at ??
      item?.updatedAt ??
      item?.date ??
      item?.dt ??
      item?.timestamp;
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d) ? null : d;
  }

  function getNumericAmount(item) {
    if (!item || typeof item === "string" || typeof item === "number") return 0;
    const raw =
      item.amount ??
      item.price ??
      item.total ??
      item.value ??
      item.paid ??
      item.cost ??
      item?.price_inr ??
      0;
    const cleaned =
      typeof raw === "string" ? raw.replace(/,/g, "").trim() : raw;
    const num = Number(cleaned || 0);
    return Number.isNaN(num) ? 0 : num;
  }

  function mapSelectToKey(sel) {
    switch (sel) {
      case "Shop Expenses":
        return "shop";
      case "Employee Expenses":
        return "employee";
      case "Personal Expenses":
        return "personal";
      case "Overall Expenses":
      default:
        return "overall";
    }
  }

  function matchesExpenseFilter(item, sel) {
    const key = mapSelectToKey(sel);
    if (!item) return false;
    if (key === "overall") return true;

    const t = (item.type || "").toString().toLowerCase();
    if (t) return t === key;

    if (key === "employee" && item.employee_name) return true;
    if (key === "shop" && item.shop_name) return true;
    if (key === "personal" && !item.shop_name && !item.employee_name)
      return true;

    return false;
  }

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const resp = await axios.get(`${API_URL}/alldata`, {
          signal: controller.signal,
        });
        if (!mounted) return;
        const dataPayload = resp?.data?.data ?? resp?.data ?? {};

        const income = dataPayload?.income ?? dataPayload?.incomes ?? [];
        const expenseObj =
          dataPayload?.data ?? dataPayload?.expense ?? dataPayload ?? {};

        const normalizedIncome = normalizeArrayResponse(income);
        const normalizedExpense = normalizeArrayResponse(expenseObj);

        const mergedAsIncome = [...normalizedIncome, ...normalizedExpense];

        const seen = new Map();
        function monthKeyFrom(item) {
          const dateVal =
            item?.created_at ??
            item?.createdAt ??
            item?.date ??
            item?.dt ??
            item?.timestamp;
          const d = dateVal ? new Date(dateVal) : null;
          if (!d || isNaN(d)) return null;
          return `${d.getFullYear()}-${d.getMonth() + 1}`;
        }
        function seriesKeyFrom(item) {
          if (item?.original_id) return String(item.original_id);
          if (item?.auto_generated === "no" || item?.auto_generated === false) {
            return `orig:${item.id ?? Math.random()}`;
          }
          const cat = item?.category_name ?? "";
          const emp = item?.employee_name ?? "";
          const note = item?.note ?? "";
          const amt = (item?.amount ?? "").toString();
          return `${cat}|${emp}|${note}|${amt}`;
        }

        for (const it of mergedAsIncome) {
          const mKey = monthKeyFrom(it);
          if (!mKey) continue;
          const sKey = seriesKeyFrom(it);
          const composite = `${mKey}::${sKey}`;
          if (!seen.has(composite)) {
            seen.set(composite, it);
          } else {
          }
        }

        const dedupedIncome = Array.from(seen.values());

        setRawData({ income: dedupedIncome, expense: [] });
      } catch (err) {
        if (axios.isCancel?.(err) || err?.name === "CanceledError") return;
        console.error("alldata fetch error:", err);
        if (mounted) setRawData({ income: [], expense: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API_URL]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    (async () => {
      try {
        const [itemsRes, combinedRes] = await Promise.allSettled([
          axios.get(`${API_URL}/allitemswithuser`, {
            signal: controller.signal,
          }),
          axios.get(`${API_URL}/combinedata`, { signal: controller.signal }),
        ]);

        if (!mounted) return;

        if (itemsRes.status === "fulfilled") {
          const rawItems = normalizeArrayResponse(itemsRes.value);
          const marked = rawItems.map((it) => ({
            ...it,
            _source: "allitems",
            _forceAs: "income",
          }));
          setItemsWithUser(marked);
        } else {
          console.error("allitemswithuser failed:", itemsRes.reason);
          setItemsWithUser([]);
        }

        if (combinedRes.status === "fulfilled") {
          const payload =
            combinedRes.value?.data?.data ??
            combinedRes.value?.data ??
            combinedRes.value;
          const rawCombined = normalizeArrayResponse(payload);
          const markedCombined = rawCombined.map((it) => ({
            ...it,
            _source: "combined",
            _forceAs: "expense",
          }));
          setCombinedData(markedCombined);
        } else {
          console.error("combinedata failed:", combinedRes.reason);
          setCombinedData([]);
        }
      } catch (err) {
        if (axios.isCancel?.(err) || err?.name === "CanceledError") return;
        console.error("fetchCombined unexpected error:", err);
        if (mounted) {
          setItemsWithUser([]);
          setCombinedData([]);
        }
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API_URL]);

  useEffect(() => {
    const incomeArr = normalizeArrayResponse(rawData.income);
    const expenseArr = normalizeArrayResponse(rawData.expense);
    const itemsArr = normalizeArrayResponse(itemsWithUser);
    const combinedArr = normalizeArrayResponse(combinedData);

    const mergedIncomes = [
      ...incomeArr,
      ...itemsArr.filter(
        (it) =>
          it &&
          (it._forceAs === "income" ||
            (it.type && it.type.toLowerCase() === "income"))
      ),
    ];

    const mergedExpenses = [
      ...expenseArr,
      ...combinedArr.filter(
        (it) =>
          it &&
          (it._forceAs === "expense" ||
            (it.type && it.type.toLowerCase() === "expense"))
      ),
    ];

    const now = new Date();
    const { start, end } = getRangeForFilter(
      selectedFilter,
      now,
      customFrom,
      customTo
    );

    const dateMap = Object.create(null);

    function addToMap(item, type) {
      const d = parseDateFromItem(item);
      if (!d) return;
      if (d < start || d > end) return;

      if (type === "expense" && !matchesExpenseFilter(item, expenseFilter))
        return;

      const dateStr = d.toLocaleDateString("en-GB");
      if (!dateMap[dateStr]) dateMap[dateStr] = { income: 0, expense: 0 };
      if (type === "income") dateMap[dateStr].income += getNumericAmount(item);
      else dateMap[dateStr].expense += getNumericAmount(item);
    }

    mergedIncomes.forEach((it) => addToMap(it, "income"));
    mergedExpenses.forEach((it) => addToMap(it, "expense"));

    const summaryArr = Object.keys(dateMap)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((date) => ({
        date,
        income: dateMap[date].income,
        expense: dateMap[date].expense,
        balance: dateMap[date].income - dateMap[date].expense,
      }));

    setSummary(summaryArr);
  }, [
    rawData,
    itemsWithUser,
    combinedData,
    selectedFilter,
    customFrom,
    customTo,
    expenseFilter,
  ]);

  const totals = useMemo(() => {
    const now = new Date();
    const { start, end } = getRangeForFilter(
      selectedFilter,
      now,
      customFrom,
      customTo
    );

    const incomeArr = normalizeArrayResponse(rawData.income);
    const expenseArr = normalizeArrayResponse(rawData.expense);
    const itemsArr = normalizeArrayResponse(itemsWithUser);
    const combinedArr = normalizeArrayResponse(combinedData);

    const mergedIncomes = [
      ...incomeArr,
      ...itemsArr.filter(
        (it) =>
          it &&
          (it._forceAs === "income" ||
            (it.type && it.type.toLowerCase() === "income"))
      ),
    ];

    const mergedExpenses = [
      ...expenseArr,
      ...combinedArr.filter(
        (it) =>
          it &&
          (it._forceAs === "expense" ||
            (it.type && it.type.toLowerCase() === "expense"))
      ),
    ];

    const incomeSum = mergedIncomes.reduce((acc, item) => {
      const d = parseDateFromItem(item);
      if (!d || d < start || d > end) return acc;
      return acc + getNumericAmount(item);
    }, 0);

    const expenseSum = mergedExpenses.reduce((acc, item) => {
      const d = parseDateFromItem(item);
      if (!d || d < start || d > end) return acc;
      if (!matchesExpenseFilter(item, expenseFilter)) return acc;
      return acc + getNumericAmount(item);
    }, 0);

    return {
      income: incomeSum,
      expense: expenseSum,
      balance: incomeSum - expenseSum,
    };
  }, [
    rawData,
    combinedData,
    itemsWithUser,
    selectedFilter,
    customFrom,
    customTo,
    expenseFilter,
  ]);

  const rangeLabel = useMemo(() => {
    try {
      if (selectedFilter === "custom" && customFrom && customTo) {
        const s = new Date(customFrom);
        const e = new Date(customTo);
        if (!isNaN(s) && !isNaN(e)) {
          return `${s.toLocaleDateString("en-GB")} — ${e.toLocaleDateString(
            "en-GB"
          )}`;
        }
      }
      const { start, end } = getRangeForFilter(
        selectedFilter,
        new Date(),
        customFrom,
        customTo
      );
      if (start && end && !isNaN(start) && !isNaN(end)) {
        return `${start.toLocaleDateString("en-GB")} — ${end.toLocaleDateString(
          "en-GB"
        )}`;
      }
    } catch (err) {
      console.error("rangeLabel error:", err);
    }
    return "";
  }, [selectedFilter, customFrom, customTo]);

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      alert("Please pick both From and To dates.");
      return;
    }
    const s = new Date(customFrom);
    const e = new Date(customTo);
    if (isNaN(s) || isNaN(e) || s > e) {
      alert("Invalid date range.");
      return;
    }
    setSelectedFilter("custom");
    setMonth(false);
  }

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
      const absFormatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "code",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(num));

      return num < 0
        ? absFormatted.replace(currencyCode, `${currencyCode} -`)
        : absFormatted;
    } catch {
      const absVal = Math.abs(num).toFixed(2);
      return num < 0
        ? `${currencyCode} -${absVal}`
        : `${currencyCode} ${absVal}`;
    }
  };

  const downloadPdfWithJsPdf = () => {
    try {
      const normalize = (maybe) => {
        if (!maybe) return [];
        const payload = maybe?.data?.data ?? maybe?.data ?? maybe;
        if (!payload) return [];
        if (Array.isArray(payload))
          return payload.flatMap((x) => (Array.isArray(x) ? x : x));
        if (typeof payload === "object") {
          const vals = Object.values(payload || {});
          const arrays = vals.filter((v) => Array.isArray(v));
          if (arrays.length) return arrays.flat();
          return [payload];
        }
        return [];
      };

      const determineSubtype = (item, mainType) => {
        if (!item || typeof item === "string" || typeof item === "number")
          return "";
        const t = (item.type ?? item.txn_type ?? "").toString().toLowerCase();
        if (t) {
          if (t.includes("shop")) return "Shop Expense";
          if (t.includes("employee")) return "Employee Expense";
          if (t.includes("personal")) return "Personal Expense";
          return `${t.charAt(0).toUpperCase()}${t.slice(1)} Expense`;
        }

        if (item.category_name) return `${item.category_name} Expense`;
        if (item.category) return `${item.category} Expense`;
        if (item.reason) return String(item.reason);

        if (item.item || item.itemId || item.name) {
          const name = item.item ?? item.name ?? item.itemId;
          return `Item: ${name}`;
        }

        return "";
      };

      const currencyEntry = resolveCurrencyEntry(currency);
      const currencyCode = currencyEntry?.code || "AED";

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("helvetica");
      const title = "Spending Report";
      const now = new Date();
      const filename = `report_${selectedFilter}_${now
        .toISOString()
        .slice(0, 10)}.pdf`;

      doc.setFontSize(14);
      doc.text(title, 40, 40);
      doc.setFontSize(10);

      const { start, end } = getRangeForFilter(
        selectedFilter,
        new Date(),
        customFrom,
        customTo
      );

      const rangeLabelForHeader =
        selectedFilter === "custom" && customFrom && customTo
          ? `${new Date(customFrom).toLocaleDateString("en-GB")} — ${new Date(
              customTo
            ).toLocaleDateString("en-GB")}`
          : `${start.toLocaleDateString("en-GB")} — ${end.toLocaleDateString(
              "en-GB"
            )}`;

      doc.text(`Range: ${rangeLabelForHeader}`, 40, 60);
      doc.text(`Generated: ${now.toLocaleString()}`, 40, 74);

      const incomesFromRaw = normalize(rawData?.income ?? rawData);
      const expensesFromRaw = normalize(
        rawData?.expense ?? rawData?.data ?? rawData
      );
      const combinedArr = normalize(combinedData);
      const itemsArr = Array.isArray(normalize(itemsWithUser))
        ? normalize(itemsWithUser)
        : [];

      const mergedIncomes = [...incomesFromRaw, ...itemsArr];
      const mergedExpenses = [...expensesFromRaw, ...combinedArr];

      const rows = [];

      const pushRow = (d, type, subtype, numeric) => {
        rows.push({
          dateObj: d,
          dateStr: d.toLocaleDateString("en-GB"),
          type,
          subtype,
          amtNumeric: numeric,
          amtDisplay: fmtCurrencyPDF(numeric, currencyCode),
        });
      };

      mergedIncomes.forEach((it) => {
        const d = parseDateFromItem(it);
        if (!d) return;
        if (d < start || d > end) return;
        const numeric = getNumericAmount(it);
        const subtype = determineSubtype(it, "Income");
        pushRow(d, "Income", subtype, numeric);
      });

      mergedExpenses.forEach((it) => {
        const d = parseDateFromItem(it);
        if (!d) return;
        if (d < start || d > end) return;
        const numeric = getNumericAmount(it);
        const subtype = determineSubtype(it, "Expense");
        pushRow(d, "Expense", subtype, numeric);
      });

      console.debug("PDF rows count:", rows.length, {
        incomes: mergedIncomes.length,
        expenses: mergedExpenses.length,
        includedRowsSample: rows.slice(0, 6),
      });

      rows.sort((a, b) => b.dateObj - a.dateObj);

      const rowsToPrint =
        rows.length === 0
          ? [["-", "-", "-", "-"]]
          : rows.map((r) => [
              r.dateStr,
              r.type,
              r.subtype || "-",
              r.amtDisplay,
            ]);

      autoTable(doc, {
        startY: 95,
        head: [["Date", "Type", "Subtype", `Amount (${currencyCode})`]],
        body: rowsToPrint,
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
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { halign: "center", cellWidth: 80 },
          1: { halign: "center", cellWidth: 60 },
          2: { halign: "center", cellWidth: 180 },
          3: { halign: "center", cellWidth: 100 },
        },

        margin: { left: 40, right: 40 },
      });

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 95;

      const incomeTotal = mergedIncomes.reduce((acc, it) => {
        const d = parseDateFromItem(it);
        if (!d || d < start || d > end) return acc;
        return acc + getNumericAmount(it);
      }, 0);

      const expenseTotal = mergedExpenses.reduce((acc, it) => {
        const d = parseDateFromItem(it);
        if (!d || d < start || d > end) return acc;
        return acc + getNumericAmount(it);
      }, 0);

      const balance = incomeTotal - expenseTotal;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Total Income: ${fmtCurrencyPDF(incomeTotal, currencyCode)}`,
        40,
        finalY + 16
      );
      doc.text(
        `Total Expense: ${fmtCurrencyPDF(expenseTotal, currencyCode)}`,
        40,
        finalY + 34
      );

      if (balance < 0) doc.setTextColor(200, 50, 50);
      else doc.setTextColor(40, 140, 60);

      doc.text(
        `Balance: ${fmtCurrencyPDF(balance, currencyCode)}`,
        40,
        finalY + 52
      );

      doc.setTextColor(0, 0, 0);
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Could not create PDF");
    }
  };

  return (
    <div className="content-wrapper">
      <div className="transaction-page">
        <div className="payroll-inner">
          <header className="top-bar py-2 px-3 pt-3">
            <div ref={monthPillRef} className="month-pill" onClick={monthName}>
              {months}
            </div>
          </header>

          <nav
            className="icon-row d-flex flex-row flex-nowrap"
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

          <main className="chalkboard" aria-live="polite">
            <div className="progress">
              <div className="progress-income" />
              <div className="progress-expense" />
            </div>

            <div>
              <select
                className="form-select rounded-1"
                value={expenseFilter}
                onChange={(e) => setExpenseFilter(e.target.value)}
              >
                <option value="Overall Expenses">Overall Expenses</option>
                <option value="Shop Expenses">Shop Expenses</option>
                <option value="Employee Expenses">Employee Expenses</option>
                <option value="Personal Expenses">Personal Expenses</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <div className="d-flex align-items-center flex-wrap w-100 justify-content-around">
                <strong>Showing: </strong>{" "}
                <span className="fw-medium">{rangeLabel}</span>
                <button
                  className="btn btn-success mt-2 mt-lg-0 mt-md-0 px-2 py-1 btn-download"
                  onClick={downloadPdfWithJsPdf}
                >
                  Download Report
                </button>
              </div>
            </div>

            <div className="summary-board" style={{ marginTop: 11 }}>
              {loading ? (
                <div>Loading...</div>
              ) : summary.length === 0 ? (
                <>
                  <div className="board-row">
                    <div className="label">Income</div>
                    <div className="amount">{currency} 0.00</div>
                  </div>

                  <div className="board-row">
                    <div className="label">Expense</div>
                    <div className="amount">{currency} 0.00</div>
                  </div>

                  <hr className="dashed" />

                  <div className="board-row balance-row">
                    <div className="label big">Balance</div>
                    <div className="amount">{currency} 0.00</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="board-row">
                    <div className="label">Income</div>
                    <div className="amount">
                      {currency}
                      {totals.income.toFixed(2)}
                    </div>
                  </div>

                  <div className="board-row">
                    <div className="label">Expense</div>
                    <div className="amount">
                      {currency}
                      {totals.expense.toFixed(2)}
                    </div>
                  </div>

                  <hr className="dashed" />

                  <div className="board-row balance-row">
                    <div className="label big">Balance</div>
                    <div className="amount">
                      {currency}
                      {totals.balance.toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>

          <div
            className="bottom-actions d-flex flex-nowrap w-100 justify-content-center"
            role="region"
            aria-label="actions"
          >
            <Link
              className="btn outlines btn-outline-light"
              to="/admin/expense/shop"
            >
              + Expense
            </Link>

            <Link className="btn outlines btn-outline-light" to="/admin/income">
              + Income
            </Link>
          </div>
        </div>

        {month && (
          <>
            <div ref={spendingRef} className="spending-card container">
              <h5 className="title fw-bold">Show Spending</h5>
              <form
                className="spending-form"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="spending"
                    id="daily"
                    value="daily"
                    checked={selectedFilter === "daily"}
                    onChange={() => {
                      setSelectedFilter("daily");
                      setMonth(false);
                    }}
                  />
                  <label className="form-check-label" htmlFor="daily">
                    Daily
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="spending"
                    id="weekly"
                    value="weekly"
                    checked={selectedFilter === "weekly"}
                    onChange={() => {
                      setSelectedFilter("weekly");
                      setMonth(false);
                    }}
                  />
                  <label className="form-check-label" htmlFor="weekly">
                    Weekly
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="spending"
                    id="monthly"
                    value="monthly"
                    checked={selectedFilter === "monthly"}
                    onChange={() => {
                      setSelectedFilter("monthly");
                      setMonth(false);
                    }}
                  />
                  <label className="form-check-label" htmlFor="monthly">
                    Monthly
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="spending"
                    id="yearly"
                    value="yearly"
                    checked={selectedFilter === "yearly"}
                    onChange={() => {
                      setSelectedFilter("yearly");
                      setMonth(false);
                    }}
                  />
                  <label className="form-check-label" htmlFor="yearly">
                    Yearly
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="spending"
                    id="custom"
                    value="custom"
                    checked={selectedFilter === "custom"}
                    onChange={() => {
                      setSelectedFilter("custom");
                    }}
                  />
                  <label className="form-check-label" htmlFor="custom">
                    Custom range
                  </label>
                </div>

                {selectedFilter === "custom" && (
                  <div className="custom-range-row" style={{ marginTop: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        alignItems: "start",
                      }}
                    >
                      <label>From</label>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="form-control"
                        aria-label="From date"
                      />
                      <label>To</label>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="form-control"
                        aria-label="To date"
                      />
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn btn-primary apply-btn"
                        onClick={applyCustomRange}
                      >
                        Apply
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary mt-0 ms-2"
                        onClick={() => setMonth(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {selectedFilter !== "custom" && (
                  <div
                    className="d-flex justify-content-end"
                    style={{ marginTop: 12 }}
                  >
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => setMonth(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
