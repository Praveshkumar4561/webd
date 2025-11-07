import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  PieChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import useCurrency from "../context/useCurrency";

export default function ManageWork() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [items, setItems] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const { currency } = useCurrency();

  const [stats, setStats] = useState({
    totalTasks: 0,
    averageWork: 0,
    topPerformer: "",
    totalAmount: 0,
  });

  const [top3, setTop3] = useState([
    { name: "No data", value: 0 },
    { name: "--", value: 0 },
    { name: "--", value: 0 },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const COLORS1 = ["#82ca9d", "#8884d8", "#ffc658", "#ff7f50", "#00C49F"];
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedOption, setSelectedOption] = useState("all");
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(0);
  const wrapperRef = useRef(null);
  const COLORS = ["#00C49F", "#FF69B4", "#FF4D4F"];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const extractFullname = (item) => {
    if (!item) return "Unknown";
    if (typeof item.fullname === "string" && item.fullname.trim())
      return item.fullname.trim();
    if (typeof item.name === "string" && item.name.trim())
      return item.name.trim();
    if (item.user) {
      if (typeof item.user.fullname === "string" && item.user.fullname.trim())
        return item.user.fullname.trim();
      if (typeof item.user.name === "string" && item.user.name.trim())
        return item.user.name.trim();
    }
    if (item.createdBy) {
      if (
        typeof item.createdBy.fullname === "string" &&
        item.createdBy.fullname.trim()
      )
        return item.createdBy.fullname.trim();
      if (typeof item.createdBy.name === "string" && item.createdBy.name.trim())
        return item.createdBy.name.trim();
    }
    if (typeof item.username === "string" && item.username.trim())
      return item.username.trim();
    if (item.user_id) return String(item.user_id);
    if (item.userId) return String(item.userId);
    return "Unknown";
  };

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/allitemswithuser`);
        if (!mounted) return;

        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        const normalized = raw.map((it) => {
          const fullname = extractFullname(it);
          const priceNum = Number(it.price);
          const price = Number.isFinite(priceNum) ? priceNum : 0;
          return {
            ...it,
            fullname,
            price,
          };
        });

        setItems(normalized);

        const totalTasks = normalized.length;

        const tasksPerUser = {};
        normalized.forEach((item) => {
          const name = item.fullname || "Unknown";
          tasksPerUser[name] = (tasksPerUser[name] || 0) + 1;
        });

        const totalUsers = Object.keys(tasksPerUser).length;
        const averageWork = totalUsers
          ? Math.round(totalTasks / totalUsers)
          : 0;

        let topUser = "";
        let maxTasks = 0;
        for (const u in tasksPerUser) {
          if (tasksPerUser[u] > maxTasks) {
            maxTasks = tasksPerUser[u];
            topUser = u;
          }
        }

        const totalAmount = normalized.reduce(
          (acc, it) => acc + (Number(it.price) || 0),
          0
        );

        setStats({
          totalTasks,
          averageWork,
          topPerformer: topUser,
          totalAmount,
        });

        const leaderboard = Object.keys(tasksPerUser)
          .map((name) => ({ name, value: tasksPerUser[name] }))
          .sort((a, b) => b.value - a.value);

        setUsersData(leaderboard);

        const top = leaderboard.slice(0, 3);
        while (top.length < 3)
          top.push({ name: top.length === 0 ? "No data" : "--", value: 0 });

        setTop3(top);
      } catch (err) {
        console.error("Error fetching items:", err);
        setItems([]);
        setTop3([
          { name: "No data", value: 0 },
          { name: "--", value: 0 },
          { name: "--", value: 0 },
        ]);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [API_URL]);

  const formatKolkataDate_Local = (dateInput) => {
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
  };

  const uploadsBase = API_URL
    ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
    : "/uploads";

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
    };
  });

  const filtered = prepared.filter((row) =>
    (row.fullname || "").toLowerCase().includes(debouncedSearch.toLowerCase())
  );

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

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center">
      <div
        className="card shadow-sm employee-details w-100"
        style={{ maxWidth: "900px" }}
      >
        <div className="row g-3 p-3">
          <div className="col-12">
            <h5>Manage Work Submissions</h5>

            <div className="mt-3 mb-3">
              <input
                type="search"
                className="form-control input-text"
                placeholder="Search by User Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <span className="mt-1 fw-bold">Performance Summary Dashboard</span>
          </div>

          <div className="col-6 col-sm-6 col-md-6 col-lg-3 d-flex">
            <div className="border rounded p-3 text-center task-work w-100 h-100 d-flex flex-column">
              <span className="task-app">Total Task Completed</span>
              <span className="task-app fw-bold mt-auto">
                <span className="amount-span">{stats.totalTasks}</span>
              </span>
            </div>
          </div>

          <div className="col-6 col-sm-6 col-md-6 col-lg-3 d-flex">
            <div className="border rounded p-3 text-center task-work w-100 h-100 d-flex flex-column">
              <span className="task-app">Average Work per Employee</span>
              <span className="task-app fw-bold mt-auto">
                <span className="amount-span">{stats.averageWork}</span>
              </span>
            </div>
          </div>

          <div className="col-6 col-sm-6 col-md-6 col-lg-3 d-flex">
            <div className="border rounded p-3 text-center task-work w-100 h-100 d-flex flex-column">
              <span className="task-app">Top Performer</span>
              <span className="task-app fw-bold mt-auto">
                <span className="amount-span">{stats.topPerformer}</span>
              </span>
            </div>
          </div>

          <div className="col-6 col-sm-6 col-md-6 col-lg-3 d-flex">
            <div className="border rounded p-3 text-center task-work w-100 h-100 d-flex flex-column">
              <span className="task-app">Total Amount Earned</span>
              <span className="task-app fw-bold mt-auto">
                <span className="amount-span">
                  {currency}
                  {stats.totalAmount}
                </span>
              </span>
            </div>
          </div>

          <div className="d-flex flex-column justify-content-center">
            <select
              className="form-select"
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="some">Some Users</option>
            </select>
          </div>

          <>
            <div className="col-12 d-flex justify-content-start mb-3">
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {selectedOption === "all" && (
                  <PieChart width={320} height={320}>
                    <Pie
                      data={usersData}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={40}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {Array.isArray(usersData) &&
                        usersData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} orders`} />
                    <Legend />
                  </PieChart>
                )}
              </div>
            </div>

            {selectedOption === "some" && (
              <div
                style={{
                  width: "100%",
                  maxWidth: 860,
                  margin: "0 auto",
                  padding: 20,
                  borderRadius: 12,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                }}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={usersData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => `${value} orders`} />
                    <Legend />
                    <Bar
                      dataKey="value"
                      barSize={50}
                      radius={[10, 10, 0, 0]}
                      onMouseOver={(_, index) => setActiveIndex(index)}
                    >
                      {Array.isArray(usersData) &&
                        usersData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              activeIndex === index
                                ? "#4CAF50"
                                : COLORS1[index % COLORS1.length]
                            }
                            stroke={activeIndex === index ? "#2E7D32" : "none"}
                            strokeWidth={activeIndex === index ? 2 : 0}
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>

          <div className="info-grid" style={{ minWidth: 220 }}>
            {Array.isArray(top3) &&
              top3.map((u, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 8,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      background: COLORS[i],
                      borderRadius: 4,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: "#444" }}>
                      {u.value} order{u.value !== 1 ? "s" : ""} —{" "}
                      {i === 0 ? "Most" : i === 1 ? "Average" : "Fewest"}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-3">
            <span className="task-app">Submitted work</span>
          </div>

          <div className="card-body p-0 ms-2 me-21 pe-2">
            {!items.length ? (
              <div className="p-4 text-center">Loading items...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center">No matched user found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "30px" }}>ID</th>
                      <th>User Name</th>
                      <th>Image</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Remark</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered
                      .slice(
                        currentPage * itemsPerPage,
                        currentPage * itemsPerPage + itemsPerPage
                      )
                      .map((row) => (
                        <tr key={row.itemId ?? row.id}>
                          <td>{row.itemId ?? row.id}</td>
                          <td>
                            <Link className="text-dark text-decoration-none">
                              {row.fullname ?? `User ${row.user_id ?? "-"}`}
                            </Link>
                          </td>

                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              {row.images && row.images.length > 0 ? (
                                <div
                                  style={{
                                    position: "relative",
                                    width: 50,
                                    height: 50,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    setModalImages(row.images);
                                    setModalIndex(0);
                                    setModalOpen(true);
                                  }}
                                >
                                  <img
                                    src={`${uploadsBase}/${row.images[0]}`}
                                    alt="img-0"
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      borderRadius: 4,
                                    }}
                                  />
                                  {row.images.length > 1 && (
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
                                      +{row.images.length - 1}
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
                            {row.price ?? "-"}
                          </td>
                          <td>{row.displayDate ?? "-"}</td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Remark"
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {filtered.length > itemsPerPage && (
            <div className="d-flex justify-content-center gap-2 mt-3 mb-3">
              <button
                className="btn btn-success btn-span"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                disabled={currentPage === 0}
              >
                Prev
              </button>
              <button
                className="btn btn-success btn-span"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(
                      p + 1,
                      Math.ceil(filtered.length / itemsPerPage) - 1
                    )
                  )
                }
                disabled={
                  currentPage === Math.ceil(filtered.length / itemsPerPage) - 1
                }
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
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
  );
}
