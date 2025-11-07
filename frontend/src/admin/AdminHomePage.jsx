import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import useCurrency from "../context/useCurrency";

export default function AdminHomePage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const [selectedShop, setSelectedShop] = useState("");
  const { currency, setCurrency, options } = useCurrency();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shops, setShops] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get(`${API_URL}/allemployee`)
      .then((res) => {
        if (!mounted) return;

        const employeeList = Array.isArray(res.data.employees)
          ? res.data.employees
          : [];

        setEmployees(employeeList);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        if (!mounted) return;
        setError("Failed to load data");
        setEmployees([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [API_URL]);

  useEffect(() => {
    const allshops = async () => {
      try {
        const response = await axios.get(`${API_URL}/allshop`);
        const shopList = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setShops(shopList);
      } catch (err) {
        console.error("Failed to fetch shops:", err);
      }
    };
    allshops();
  }, [API_URL]);

  const handleEdit = (id) => navigate(`/admin/employee/edit/${id}`);

  const handleView = (id) => navigate(`/admin/employee/view/${id}`);

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await axios.delete(`${API_URL}/employeedelete/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    if (!selectedShop) return employees;
    const sel = selectedShop.toString().trim().toLowerCase();
    return employees.filter((emp) => {
      const empShop = (emp.shop_name ?? "").toString().trim().toLowerCase();
      return empShop === sel;
    });
  }, [employees, selectedShop]);

  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedShop]);

  const pagedEmployees = Array.isArray(filteredEmployees)
    ? filteredEmployees.slice(startIndex, startIndex + itemsPerPage)
    : [];

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div
        className="card shadow-sm employee-details"
        style={{ width: "100%", maxWidth: "900px" }}
      >
        <div className="card-header d-flex align-items-center justify-content-between">
          <h1 className="mb-0 all-employee">All Employees</h1>
          <div className="d-flex flex-row flex-wrap flex-column flex-lg-nowrap flex-lg-row flex-md-row gap-2">
            <select
              id="currency-select"
              className="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {Array.isArray(options) &&
                options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </select>

            <button
              type="button"
              className="btn btn-sm btn-primary create-button"
              style={{ whiteSpace: "nowrap" }}
              onClick={() => navigate("/admin/newemployee")}
            >
              + Add Employee
            </button>

            <div>
              <select
                className="form-select"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
              >
                <option value="">All Shops</option>
                {Array.isArray(shops) &&
                  shops.map((shop) => (
                    <option key={shop.id} value={shop.shop_name}>
                      {shop.shop_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center">Loading employees...</div>
          ) : error ? (
            <div className="p-4 text-center text-danger">{error}</div>
          ) : totalEmployees === 0 ? (
            <div className="p-4 text-center">No employees found.</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "80px" }} className="text-nowrap">
                        ID
                      </th>
                      <th className="text-nowrap">Employee Name</th>
                      <th className="text-nowrap">Salary</th>
                      <th className="text-nowrap">Shop Name</th>
                      <th
                        style={{ width: "150px" }}
                        className="text-center text-nowrap"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(pagedEmployees) &&
                      pagedEmployees.map((emp, idx) => (
                        <tr key={emp.id ?? startIndex + idx}>
                          <td>{startIndex + idx + 1}</td>
                          <td>
                            <Link
                              to={`/admin/employee/view/${emp.id}`}
                              className="text-decoration-none text-dark"
                            >
                              {emp.employee_name}
                            </Link>
                          </td>
                          <td>
                            {currency}
                            {emp.employee_salary}
                          </td>
                          <td>{emp.shop_name}</td>

                          <td className="text-center d-flex flex-wrap flex-lg-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success me-2 mt-2 mt-lg-0 mt-md-0 btn-action"
                              onClick={() => handleView(emp.id)}
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary me-2 mt-2 mt-lg-0 mt-md-0 btn-action"
                              onClick={() => handleEdit(emp.id)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger mt-2 mt-lg-0 mt-md-0 btn-action"
                              onClick={() => handleDelete(emp.id)}
                              disabled={deletingId === emp.id}
                            >
                              {deletingId === emp.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {totalEmployees > itemsPerPage && (
                <div className="d-flex justify-content-center mb-3 align-items-center mt-3">
                  <nav aria-label="Employee table pagination">
                    <ul className="pagination mb-0">
                      <li
                        className={`page-item ${
                          currentPage === 1 ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="btn btn-success ms-2 pagination-button"
                          onClick={goPrev}
                          aria-label="Previous"
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>

                      <li
                        className={`page-item ${
                          currentPage === totalPages ? "disabled" : ""
                        }`}
                      >
                        <button
                          className=" btn btn-success ms-2 pagination-button"
                          onClick={goNext}
                          aria-label="Next"
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card-footer text-muted small">
          {totalEmployees} employee{totalEmployees !== 1 ? "s" : ""}
          {selectedShop && (
            <span className="ms-1">(filtered by: {selectedShop})</span>
          )}
        </div>
      </div>
    </div>
  );
}
