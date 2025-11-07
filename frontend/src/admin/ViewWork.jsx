import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import useCurrency from "../context/useCurrency";

export default function ViewWork() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShop, setSelectedShop] = useState("");
  const [debouncedShop, setDebouncedShop] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const wrapperRef = useRef(null);
  const { currency } = useCurrency();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedShop(selectedShop), 300);
    return () => clearTimeout(t);
  }, [selectedShop]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, debouncedShop]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleInput = () => setShowInput((s) => !s);

  function formatKolkataDate_Local(dateInput) {
    if (!dateInput) return "-";
    let d;
    if (typeof dateInput === "string") {
      const s = dateInput.trim();
      if (/[zZ]$|[+\-]\d{2}:\d{2}$/.test(s)) d = new Date(s);
      else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s + "T00:00:00");
      else d = new Date(s.replace(" ", "T"));
    } else {
      d = new Date(dateInput);
    }
    if (isNaN(d)) return "-";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }

  const uploadsBase = API_URL
    ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
    : "/uploads";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/allitemswithuser`)
      .then((res) => {
        if (!mounted) return;
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setItems(payload);
      })
      .catch((err) => {
        console.error("Error fetching items:", err);
        if (!mounted) return;
        setError("Failed to load data");
        setItems([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => (mounted = false);
  }, [API_URL]);

  const itemsPerPage = 5;

  // useEffect(() => {
  //   let mounted = true;
  //   axios
  //     .get(`${API_URL}/allshop`)
  //     .then((res) => {
  //       if (!mounted) return;
  //       const shopList = Array.isArray(res.data.data)
  //         ? res.data.data
  //         : Array.isArray(res.data)
  //         ? res.data
  //         : [];
  //       setShops(shopList);
  //     })
  //     .catch((err) => console.error("Failed to fetch shops:", err));
  //   return () => (mounted = false);
  // }, [API_URL]);

  const prepared = items.map((it) => {
    const images =
      it.images && Array.isArray(it.images)
        ? it.images
        : it.image && typeof it.image === "string"
        ? it.image
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const created = it.created_at || it.createdAt || it.created || null;
    return {
      ...it,
      images,
      displayDate: formatKolkataDate_Local(created),
      shopName: it.shop_name || it.shop || "",
    };
  });

  const filtered = prepared.filter((row) => {
    if (debouncedShop) {
      if (!row.shopName) return false;
      if (
        row.shopName.replace(/\s+/g, "").toLowerCase() !==
        debouncedShop.replace(/\s+/g, "").toLowerCase()
      )
        return false;
    }
    if (debouncedSearch) {
      return (row.fullname || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
    }
    return true;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);

  const navButtonStyle = (side) => ({
    background: "rgba(255,255,255,0.7)",
    border: "none",
    borderRadius: "50%",
    width: 40,
    height: 40,
    cursor: "pointer",
    fontWeight: "bold",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 10,
  });

  const closeButtonStyle = {
    position: "absolute",
    top: "0px",
    right: "1px",
    background: "#fff",
    border: "1px solid red",
    borderRadius: "50%",
    width: 30,
    height: 30,
    cursor: "pointer",
    fontWeight: "bold",
    zIndex: 10,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const groupedMap = filtered.reduce((acc, row) => {
    const idKey = (
      row.user_id ??
      row.userId ??
      row.userId ??
      row.id ??
      ""
    ).toString();
    const nameKey = (row.fullname ?? row.employee_name ?? "")
      .trim()
      .toLowerCase();
    const key = idKey || nameKey || Math.random().toString(36).slice(2, 9);

    if (!acc[key]) {
      acc[key] = {
        key,
        name: row.fullname ?? row.employee_name ?? `User ${row.user_id ?? "-"}`,
        total: 0,
        orders: 0,
        images: Array.isArray(row.images) ? [...row.images] : [],
        latestDate: row.displayDate ?? null,
        samples: [row],
      };
    }

    const priceNum =
      Number(String(row.price ?? row.amount ?? 0).replace(/,/g, "")) || 0;
    acc[key].total += priceNum;
    acc[key].orders += 1;

    if (Array.isArray(row.images) && row.images.length) {
      acc[key].images.push(...row.images);
    }

    if (row.displayDate) {
      const prev = acc[key].latestDate;
      if (!prev || new Date(row.displayDate) > new Date(prev)) {
        acc[key].latestDate = row.displayDate;
      }
    }

    acc[key].samples.push(row);
    return acc;
  }, {});

  const grouped = Object.values(groupedMap).map((g) => ({
    ...g,
    images: Array.from(new Set(g.images)),
    total: Number(g.total.toFixed(2)),
  }));

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div
        className="card shadow-sm employee-details"
        style={{ width: "100%", maxWidth: "900px" }}
      >
        <div className="card-header d-flex align-items-center justify-content-between">
          <h1 className="mb-0 all-employee all-works">View Works</h1>
          <div className="d-flex flex-row gap-1">
            <div className="mobile-search-wrapper" ref={wrapperRef}>
              <input
                type="search"
                className={`mobile-search-input ${showInput ? "show" : ""}`}
                placeholder="Search by fullname"
                autoFocus={showInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="glass-icon"
                onClick={toggleInput}
              />
            </div>

            {/* <div>
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
            </div> */}
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center">Loading items...</div>
          ) : error ? (
            <div className="p-4 text-center text-danger">{error}</div>
          ) : grouped.length === 0 ? (
            <div className="p-4 text-center">No records found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "30px" }} className="text-nowrap">
                      ID
                    </th>
                    <th className="text-nowrap">User Name</th>
                    <th className="text-nowrap">Image</th>
                    <th className="text-nowrap">Amount</th>
                    <th className="text-nowrap">Date</th>
                    <th className="text-nowrap">Remark</th>
                  </tr>
                </thead>

                <tbody>
                  {grouped
                    .slice(
                      currentPage * itemsPerPage,
                      currentPage * itemsPerPage + itemsPerPage
                    )
                    .map((entry, idx) => (
                      <tr key={entry.key}>
                        <td>{idx + 1}</td>
                        <td>{entry.name}</td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            {entry.images && entry.images.length > 0 ? (
                              <div
                                style={{
                                  position: "relative",
                                  width: 50,
                                  height: 50,
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  setModalImages(entry.images);
                                  setModalIndex(0);
                                  setModalOpen(true);
                                }}
                              >
                                <img
                                  src={`${uploadsBase}/${entry.images[0]}`}
                                  alt="img-0"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: 4,
                                  }}
                                />
                                {entry.images.length > 1 && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      width: "100%",
                                      height: "100%",
                                      backgroundColor: "rgba(0,0,0,0.5)",
                                      color: "#fff",
                                      display: "flex",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      borderRadius: 4,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    +{entry.images.length - 1}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">No image</span>
                            )}
                          </div>
                        </td>

                        <td>
                          {currency}
                          {entry.total ?? "-"}
                        </td>
                        <td className="date-row">{entry.latestDate ?? "-"}</td>
                        <td>
                          {" "}
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Remark"
                          />{" "}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-footer text-muted small">
          {grouped.length} employee{grouped.length !== 1 ? "s" : ""}
        </div>

        {grouped.length > itemsPerPage && (
          <div className="d-flex justify-content-center gap-2 mt-3 mb-3">
            <button
              className="btn btn-success btn-span"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <button
              className="btn btn-success btn-span"
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(p + 1, Math.ceil(grouped.length / itemsPerPage) - 1)
                )
              }
              disabled={
                currentPage === Math.ceil(grouped.length / itemsPerPage) - 1
              }
            >
              Next
            </button>
          </div>
        )}

        {modalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
              overflow: "hidden",
            }}
            onClick={() => setModalOpen(false)}
          >
            <div
              style={{
                position: "relative",
                width: "80vw",
                maxHeight: "80vh",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  transition: "transform 0.3s ease",
                  transform: `translateX(-${modalIndex * 100}%)`,
                }}
              >
                {Array.isArray(modalImages) &&
                  modalImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={`${uploadsBase}/${img}`}
                      alt={`modal-${idx}`}
                      style={{
                        width: "100%",
                        maxHeight: "80vh",
                        objectFit: "contain",
                        flexShrink: 0,
                        borderRadius: 8,
                      }}
                    />
                  ))}
              </div>

              {modalIndex > 0 && (
                <button
                  style={navButtonStyle("left")}
                  onClick={() => setModalIndex((i) => i - 1)}
                >
                  &#8592;
                </button>
              )}
              {modalIndex < modalImages.length - 1 && (
                <button
                  style={navButtonStyle("right")}
                  onClick={() => setModalIndex((i) => i + 1)}
                >
                  &#8594;
                </button>
              )}

              <button
                style={closeButtonStyle}
                onClick={() => setModalOpen(false)}
              >
                X
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
