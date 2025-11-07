import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const monthShort = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${monthShort} ${year}`;
}

function PersonalExpanses() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [dates, setDates] = useState(() => formatDate(new Date()));

  useEffect(() => {
    setDates(formatDate(new Date()));
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );
    const msUntilNextMidnight = nextMidnight.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => {
      setDates(formatDate(new Date()));

      const dailyInterval = setInterval(() => {
        setDates(formatDate(new Date()));
      }, 24 * 60 * 60 * 1000);

      window.__dailyDateIntervalId = dailyInterval;
    }, msUntilNextMidnight);

    return () => {
      clearTimeout(midnightTimeout);
      if (window.__dailyDateIntervalId) {
        clearInterval(window.__dailyDateIntervalId);
        delete window.__dailyDateIntervalId;
      }
    };
  }, []);

  const [cate, setCate] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/allcategorydata`);
        const cateData = response?.data?.data;

        if (Array.isArray(cateData)) {
          setCate(cateData);
        } else {
          console.warn("Unexpected category data shape:", response.data);
          setCate([]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCate([]);
      }
    };

    fetchCategories();
  }, []);

  const [user, setUser] = useState({
    reason: "",
    category_name: "",
    amount: "",
  });
  const { reason, category_name, amount } = user;

  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      axios.post(`${API_URL}/personalexpense`, user);

      setUser({
        reason: "",
        category_name: "",
        amount: "",
      });

      toast.success("Personal expanses submit successfully", {
        position: "bottom-right",
        autoClose: 800,
        pauseOnHover: true,
        closeOnClick: true,
      });

      setTimeout(() => {
        navigate("/admin/expense");
      }, 800);
    } catch (error) {
      console.error("error", error);

      toast.error("Personal expanses not post", {
        position: "bottom-right",
        autoClose: 800,
        pauseOnHover: true,
        closeOnClick: true,
      });
    }
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const [selected, setSelected] = useState("Personal Expenses");

  const handleSelectChange = (e) => {
    const value = e.target.value;
    setSelected(value);

    const map = {
      "Shop Expenses": "/admin/expense/shop",
      "Employee Expenses": "/admin/expense/employee",
      "Personal Expenses": "/admin/expense/personal",
    };

    const path = map[value];
    if (path) navigate(path);
  };

  return (
    <div className="content-wrapper">
      <div className="transaction-page">
        <form
          className="transaction-container p-0 border payroll-inner border-0"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="d-flex justify-content-between w-100 py-3 text-dark box-transaction">
            <Link
              to="/admin/expense"
              aria-label="close expense"
              className="ms-3 fw-bold text-decoration-none text-dark"
            >
              ✕
            </Link>
          </div>

          <div className="py-0 box-span d-flex justify-content-between align-items-center">
            <div className="w-100 mt-1 mb-1">
              <select
                className="form-select rounded-0"
                value={selected}
                onChange={handleSelectChange}
              >
                <option value="Shop Expenses">Shop Expenses</option>
                <option value="Employee Expenses">Employee Expenses</option>
                <option value="Personal Expenses">Personal Expenses</option>
              </select>
            </div>
          </div>

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="date-exp">Date</label>
              <input
                id="date-exp"
                type="text"
                className="form-control"
                value={dates}
                readOnly
              />
            </div>

            <hr className="divider mt-0 mb-0" />

            <div className="form-row d-flex flex-row">
              <label htmlFor="note-exp">Reason</label>
              <textarea
                id="reason"
                name="reason"
                className="form-control rounded-0"
                placeholder="Reason..."
                value={reason}
                onChange={onInputChange}
              />
            </div>

            <hr className="divider mt-0 mb-0" />

            <div className="form-row">
              <label htmlFor="category-exp">Category</label>
              <select
                id="category-exp"
                name="category_name"
                className="form-control rounded-0"
                required
                value={category_name}
                onChange={onInputChange}
              >
                <input type="search" />
                <option value="">Select a category</option>
                {Array.isArray(cate) && cate.length > 0 ? (
                  cate.map((item) => (
                    <option key={item.id} value={item.category_name}>
                      {item.category_name}
                    </option>
                  ))
                ) : (
                  <option disabled>No category available</option>
                )}
              </select>
            </div>

            <hr className="divider mt-0 mb-0" />

            <div className="form-row">
              <label htmlFor="amount-exp">Amount</label>
              <input
                id="amount"
                name="amount"
                type="number"
                className="form-control"
                placeholder="Amount"
                required
                value={amount}
                onChange={onInputChange}
              />
            </div>

            <hr className="divider mt-0 mb-0" />

            <div className="d-flex justify-content-center mt-2 pb-2 w-100">
              <button className="btn btn-success rounded-1" type="submit">
                Add
              </button>
            </div>
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}

export default PersonalExpanses;
