import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function AllUsers() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchEmployees = async () => {
      try {
        const res = await axios.get(`${API_URL}/allusers`);
        if (!mounted) return;

        const list = Array.isArray(res.data) ? res.data : [];
        setEmployees(list);
      } catch (err) {
        console.error("Error fetching users:", err);
        if (!mounted) return;
        setError("Failed to load data");
        setEmployees([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchEmployees();

    return () => {
      mounted = false;
    };
  }, [API_URL]);

  const handleEdit = (id) => navigate(`/admin/user/edit/${id}`);

  const handleView = (id) => navigate(`/admin/user/view/${id}`);

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await axios.delete(`${API_URL}/userdelete/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((employees?.length || 0) / itemsPerPage)
    );
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [employees]);

  const totalEmployees = Array.isArray(employees) ? employees.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pagedEmployees = Array.isArray(employees)
    ? employees.slice(startIndex, startIndex + itemsPerPage)
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
          <h1 className="mb-0 all-employee">All Users</h1>

          <div className="d-flex flex-row gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ whiteSpace: "nowrap" }}
              onClick={() => navigate("/admin/user/create")}
            >
              + Add User
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center">Loading users...</div>
          ) : error ? (
            <div className="p-4 text-center text-danger">{error}</div>
          ) : totalEmployees === 0 ? (
            <div className="p-4 text-center">No users found.</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "80px" }} className="text-nowrap">
                        ID
                      </th>
                      <th className="text-nowrap">Name</th>
                      <th className="text-nowrap">Email</th>
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
                              to={`/admin/user/view/${emp.id}`}
                              className="text-decoration-none text-dark"
                            >
                              {emp.fullname}
                            </Link>
                          </td>

                          <td>{emp.email || "--"}</td>

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
                              className="btn btn-sm btn-outline-danger me-2 mt-2 mt-lg-0 mt-md-0 btn-action"
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
                  <nav aria-label="Users table pagination">
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
                          className="btn btn-success ms-2 pagination-button"
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
          {employees.length} user{employees.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
