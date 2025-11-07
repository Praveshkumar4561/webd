import React, { useEffect, useState, useMemo } from "react";
import "../App.css";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

export default function AllCategory() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [category, setCategory] = useState([]);
  const [page, setPage] = useState(0);
  const pageSize = 3;
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/allcategorydata`);
        if (response.data && response.data.data) {
          setCategory(response.data.data);
        } else if (Array.isArray(response.data)) {
          setCategory(response.data);
        } else {
          setCategory([]);
        }
        setPage(0);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchAllCategories();
  }, [API_URL]);

  const total = category.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pagedCategories = useMemo(() => {
    const start = page * pageSize;
    return category.slice(start, start + pageSize);
  }, [category, page]);

  useEffect(() => {
    const newTotalPages = Math.max(1, Math.ceil(category.length / pageSize));
    if (page > 0 && page >= newTotalPages) {
      setPage(newTotalPages - 1);
    }
  }, [category.length, page, pageSize]);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));

  const handleNext = () => {
    const lastPage = Math.max(0, Math.ceil(category.length / pageSize) - 1);
    setPage((p) => Math.min(lastPage, p + 1));
  };

  const navigate = useNavigate();

  const handleEdit = (id) => {
    navigate(`/admin/category/edit/${id}`);
  };

  const handleDelete = async (id) => {
    const prevCategories = category;
    setDeletingId(id);

    setCategory((prev) => {
      const next = prev.filter((c) => c.id !== id && c.category_id !== id);
      const start = page * pageSize;
      const pageItems = next.slice(start, start + pageSize);
      if (page > 0 && pageItems.length === 0) {
        setPage((p) => Math.max(0, p - 1));
      }
      return next;
    });

    try {
      await axios.delete(`${API_URL}/categorydelete/${id}`);
    } catch (err) {
      console.error("Delete error:", err);
      setCategory(prevCategories);
    } finally {
      setDeletingId(null);
    }
  };

  const uploadsBase = API_URL
    ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
    : "/uploads";

  return (
    <div className="content-wrapper">
      <div className="transaction-page">
        <div className="payroll-inner">
          <header className="top-bar py-2 px-3 pt-2">
            <div className="d-flex justify-content-end w-100">
              <button className="plus-button">
                <NavLink
                  to="/admin/category/create"
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
              <div className="table-responsive" style={{ padding: 12 }}>
                <table
                  className="table table-bordered table-hover"
                  role="table"
                  aria-label="Categories table"
                >
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Category Name</th>
                      <th scope="col">Image</th>
                      <th scope="col" style={{ width: 210 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCategories.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-3">
                          No categories yet.
                        </td>
                      </tr>
                    ) : (
                      pagedCategories.map((item, idx) => {
                        let imageFilename = null;

                        if (
                          item.images &&
                          Array.isArray(item.images) &&
                          item.images.length
                        ) {
                          imageFilename = item.images[0];
                        } else if (item.image) {
                          imageFilename = item.image;
                        } else if (
                          item.images &&
                          typeof item.images === "string"
                        ) {
                          try {
                            const parsed = JSON.parse(item.images);
                            if (Array.isArray(parsed) && parsed.length) {
                              imageFilename = parsed[0];
                            } else if (typeof parsed === "string") {
                              imageFilename = parsed;
                            }
                          } catch (e) {
                            imageFilename = item.images;
                          }
                        }

                        const imgSrc = imageFilename
                          ? `${uploadsBase}/${imageFilename}`
                          : null;

                        return (
                          <tr key={item.id ?? item.category_id}>
                            <td>
                              <NavLink
                                to={`/admin/category/edit/${item.id}`}
                                className="text-decoration-none text-dark"
                              >
                                {(() => {
                                  const text =
                                    item.category_name ?? item.name ?? "—";
                                  const words = text.trim().split(" ");
                                  return words.length > 1
                                    ? `${words[0]}...`
                                    : words[0];
                                })()}
                              </NavLink>
                            </td>

                            <td style={{ width: 160, maxWidth: 160 }}>
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={item.category_name ?? "category image"}
                                  style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    width: "100px",
                                    height: "40px",
                                    objectFit: "contain",
                                    borderRadius: 4,
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    height: 80,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#f6f6f6",
                                    color: "#999",
                                    borderRadius: 4,
                                  }}
                                >
                                  No image
                                </div>
                              )}
                            </td>

                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary create-crud"
                                  onClick={() =>
                                    handleEdit(item.id ?? item.category_id)
                                  }
                                  aria-label={`Edit ${
                                    item.category_name ?? item.name
                                  }`}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger create-crud"
                                  onClick={() =>
                                    handleDelete(item.id ?? item.category_id)
                                  }
                                  aria-label={`Delete ${
                                    item.category_name ?? item.name
                                  }`}
                                  disabled={deletingId !== null}
                                >
                                  {deletingId === (item.id ?? item.category_id)
                                    ? "Deleting…"
                                    : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {total > pageSize && (
                  <div className="d-flex justify-content-center align-items-center mt-2">
                    <div>
                      <button
                        className="btn btn-sm btn-success me-2"
                        onClick={handlePrev}
                        disabled={page === 0}
                      >
                        Prev
                      </button>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={handleNext}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
