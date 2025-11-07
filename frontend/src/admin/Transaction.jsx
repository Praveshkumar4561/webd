import React, { useEffect, useRef, useState } from "react";
import "../App.css";
import { NavLink } from "react-router-dom";
import axios from "axios";
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
    case "monthly":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "yearly":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "all":
    default:
      return { start: new Date(0), end: endOfDay(now) };
  }
}

export default function Transaction() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [month, setMonth] = useState(false);
  const spendingRef = useRef(null);
  const { currency } = useCurrency();

  const monthName = () => {
    setMonth((m) => !m);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (spendingRef.current && spendingRef.current.contains(event.target)) {
        return;
      }
      if (event.target.closest && event.target.closest(".month-pill")) {
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

  const [transaction, setTransaction] = useState([]);

  useEffect(() => {
    const allTransactions = async () => {
      try {
        const response = await axios.get(`${API_URL}/alltransactions`);
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.data || response.data?.transactions || [];

        setTransaction(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };

    allTransactions();
  }, [API_URL]);

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 7;

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(transaction.length / itemsPerPage)
    );
    if (currentPage > totalPages - 1) {
      setCurrentPage(0);
    }
  }, [transaction, currentPage]);

  const goPrev = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

  const [selectedFilter, setSelectedFilter] = useState("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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
    setCurrentPage(0);
  }

  const activeRange = React.useMemo(() => {
    return getRangeForFilter(
      selectedFilter,
      new Date(),
      customFrom || null,
      customTo || null
    );
  }, [selectedFilter, customFrom, customTo]);

  function parseTransactionDate(tx) {
    const raw =
      tx.created_at ?? tx.createdAt ?? tx.date ?? tx.timestamp ?? null;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d) ? null : d;
  }

  const filteredTransactions = React.useMemo(() => {
    const { start, end } = activeRange || {
      start: new Date(0),
      end: endOfDay(new Date()),
    };

    if (!Array.isArray(transaction) || transaction.length === 0) return [];

    return transaction.filter((tx) => {
      const d = parseTransactionDate(tx);
      if (!d) return false;
      return d >= start && d <= end;
    });
  }, [transaction, activeRange]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredTransactions.length / itemsPerPage)
    );
    if (currentPage > totalPages - 1) {
      setCurrentPage(0);
    }
  }, [filteredTransactions.length, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = Array.isArray(filteredTransactions)
    ? filteredTransactions.slice(startIndex, endIndex)
    : [];

  const rangeLabel = React.useMemo(() => {
    const { start, end } = activeRange || {
      start: new Date(0),
      end: endOfDay(new Date()),
    };

    const fmt = (d) => {
      if (!d) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    return `${fmt(start)} — ${fmt(end)}`;
  }, [activeRange]);

  return (
    <div className="content-wrapper">
      <div className="transaction-page">
        <div className="payroll-inner">
          <header className="top-bar py-2 px-3 pt-2">
            <div className="month-pill mt-3 mb-2" onClick={monthName}>
              {months}
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
            className="chalkboard-transaction d-flex flex-column align-items-center position-relative"
            aria-live="polite"
          >
            <div className="transactions-box border rounded-0 px-0 py-0">
              <div className="table-responsive">
                <div className="px-2 py-3 d-flex align-items-center justify-content-center">
                  <strong className="pe-1">Showing: </strong>{" "}
                  <span className="fw-medium">{rangeLabel}</span>
                </div>
                <table className="table table-striped table-responsive align-middle mb-0">
                  <thead className="table-success text-center">
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Name</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Salary Month</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    {Array.isArray(paginated) && paginated.length > 0 ? (
                      paginated.map((data, index) => (
                        <tr key={data.id ?? startIndex + index}>
                          <td>{startIndex + index + 1}</td>
                          <td>{data.employee_name ?? "-"}</td>
                          <td>
                            {currency}
                            {(() => {
                              const salary = Number(data.salary) || 0;
                              const advance = Number(data.advance) || 0;
                              return (salary - advance).toLocaleString("en-IN");
                            })()}
                          </td>
                          <td>
                            {data.salary_month
                              ? new Date(data.salary_month).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "-"}
                          </td>
                          <td className="success-transaction">Success</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {transaction.length > itemsPerPage && (
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2 me-2 ms-2">
                  <div className="small text-light">
                    Showing {transaction.length === 0 ? 0 : startIndex + 1}–
                    {Math.min(endIndex, transaction.length)} of{" "}
                    {transaction.length}
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn btn-sm btn-success me-2"
                      onClick={goPrev}
                      disabled={currentPage === 0}
                    >
                      Prev
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={goNext}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
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
    </div>
  );
}
