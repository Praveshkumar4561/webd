import React, { useEffect, useState } from "react";
import axios from "axios";
import useCurrency from "../../context/useCurrency";
import { NavLink, Link, useParams } from "react-router-dom";

export default function RepeatTransactionsList() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { currency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 7;

  useEffect(() => {
    let mounted = true;
    const allTransactions = async () => {
      try {
        const response = await axios.get(`${API_URL}/allrepeat`);
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.data || response.data?.transactions || [];
        if (mounted) setTransactions(data);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
      }
    };

    allTransactions();
    return () => {
      mounted = false;
    };
  }, [API_URL]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(0);
    }
  }, [transactions, currentPage, totalPages]);

  const goPrev = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = Array.isArray(transactions)
    ? transactions.slice(startIndex, endIndex)
    : [];

  const resolveRowId = (row) => {
    if (!row) return null;
    return row.id ?? row.incomeId ?? row.ID ?? null;
  };

  const deleteData = async (row) => {
    if (!row) return;

    const id = Number(resolveRowId(row));
    const employeeName = (row.employee_name ?? row.employeeName ?? "").trim();
    const previous = transactions;

    let filtered;
    if (employeeName) {
      filtered = previous.filter(
        (t) => String(t.employee_name) !== String(employeeName)
      );
    } else {
      filtered = previous.filter(
        (t) => t !== row && Number(resolveRowId(t)) !== id
      );
    }
    setTransactions(filtered);

    try {
      let res;
      if (id && !Number.isNaN(id)) {
        res = await axios.delete(`${API_URL}/incomedelete/${id}`);
      } else if (employeeName) {
        const url = `${API_URL}/incomedelete-by-employee?employee_name=${encodeURIComponent(
          employeeName
        )}`;
        res = await axios.delete(url);
      } else {
        throw new Error("No id or employee_name available to delete");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setTransactions(previous);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="transaction-page">
        <div className="payroll-inner">
          <header className="top-bar py-2 px-3 pt-2"></header>

          <nav
            className="icon-row d-flex flex-row flex-nowrap pt-4"
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
            <div className="transactions-box border rounded-1 px-0 py-0">
              <div className="table-responsive">
                <div className="px-2 py-3 d-flex align-items-center justify-content-end">
                  <div>
                    <Link
                      className="btn btn-success py-1 create-button px-2"
                      to="/admin/income/create"
                    >
                      Create
                    </Link>
                  </div>
                </div>

                <table className="table table-striped table-responsive align-middle mb-0">
                  <thead className="table-success text-center">
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Name</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Action</th>
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
                            {data.amount}
                          </td>
                          <td className="success-transaction">
                            <button
                              className="btn btn-danger px-2 py-1 create-button"
                              onClick={() => deleteData(data)}
                            >
                              Delete
                            </button>
                          </td>
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

              {transactions.length > itemsPerPage && (
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2 me-2 ms-2">
                  <div className="small text-light">
                    Showing {transactions.length === 0 ? 0 : startIndex + 1}–
                    {Math.min(endIndex, transactions.length)} of{" "}
                    {transactions.length}
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
      </div>
    </div>
  );
}
