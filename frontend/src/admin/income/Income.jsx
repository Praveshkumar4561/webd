import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function Income() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [income, setIncome] = useState({
    employee_name: "",
    category_name: "",
    amount: "",
    repeats: false,
    note: "",
  });

  const handleIncomeChange = (e) => {
    const { name, type, value, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setIncome((prev) => ({ ...prev, [name]: val }));
  };

  const [date, setDate] = useState(new Date());
  const navigate = useNavigate();

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setDate(null);
      return;
    }
    const parsed = new Date(val + "T00:00:00");
    setDate(isValidDate(parsed) ? parsed : null);
  };

  const dateInputValue = isValidDate(date)
    ? date.toISOString().slice(0, 10)
    : "";

  const pad = (n) => String(n).padStart(2, "0");

  const formatDateForMysqlDatetime = (dt) => {
    if (!dt) return null;
    const y = dt.getFullYear();
    const m = pad(dt.getMonth() + 1);
    const d = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mm = pad(dt.getMinutes());
    const ss = pad(dt.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  };

  const handleIncomeSubmit = async () => {
    try {
      const formattedDate = formatDateForMysqlDatetime(date);

      if (!formattedDate) {
        toast.error("Please select a valid date", {
          position: "bottom-right",
          autoClose: 1500,
        });
        return;
      }
      if (!income.category_name) {
        toast.error("Please select a category", {
          position: "bottom-right",
          autoClose: 1500,
        });
        return;
      }
      if (
        income.amount === "" ||
        income.amount === null ||
        isNaN(Number(income.amount))
      ) {
        toast.error("Please enter a valid amount", {
          position: "bottom-right",
          autoClose: 1500,
        });
        return;
      }
      if (Number(income.amount) <= 0) {
        toast.error("Amount must be greater than 0", {
          position: "bottom-right",
          autoClose: 1500,
        });
        return;
      }

      const payload = {
        date: formattedDate,
        category_name: income.category_name,
        amount: Number(income.amount),
        repeats: income.repeats ? "yes" : "no",
        note: income.note || null,
        employee_name: income.employee_name || null,
      };

      const response = await axios.post(`${API_URL}/incomepost`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 201) {
        toast.success("Income added successfully", {
          position: "bottom-right",
          autoClose: 1500,
        });

        setDate(new Date());

        setIncome({
          employee_name: "",
          category_name: "",
          amount: "",
          repeats: false,
          note: "",
        });

        setTimeout(() => {
          navigate("/admin/income");
        }, 800);

        if (typeof setView === "function") setView("payroll");
      }
    } catch (err) {
      console.error("Failed to post income:", err);
      const serverMsg =
        err.response?.data?.error || err.response?.data?.message;
      if (serverMsg)
        toast.error(serverMsg, { position: "bottom-right", autoClose: 2000 });
      else
        toast.error("Could not add income", {
          position: "bottom-right",
          autoClose: 1500,
        });
    }
  };

  const [cate, setCate] = useState([]);
  const [employee, setEmployee] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoryRes, employeeRes] = await Promise.all([
          axios.get(`${API_URL}/allcategorydata`),
          axios.get(`${API_URL}/allemployee`),
        ]);

        const categoryData = categoryRes?.data;
        if (Array.isArray(categoryData?.data)) {
          setCate(categoryData.data);
        } else if (Array.isArray(categoryData)) {
          setCate(categoryData);
        } else {
          setCate([]);
        }

        setEmployee(employeeRes?.data.employees || []);
      } catch (error) {
        console.error("Error fetching category or employee data:", error);
        setCate([]);
        setEmployee([]);
      }
    };

    fetchData();
  }, [API_URL]);

  return (
    <div className="content-wrapper">
      <div className="transaction-page">
        <form
          className="transaction-container p-0 border payroll-inner border-0"
          onSubmit={(e) => {
            e.preventDefault();
            handleIncomeSubmit();
          }}
        >
          <div className="d-flex justify-content-between w-100 py-3 text-dark box-transaction">
            <Link
              to="/admin/income"
              aria-label="close expense"
              className="ms-3 fw-bold text-decoration-none text-dark"
            >
              ✕
            </Link>
          </div>

          <div className="d-flex justify-content-center mt-2 mb-2">
            <Link
              className="px-2 py-1 button1 text-decoration-none expense-detail"
              to="/admin/expense"
              type="button"
            >
              Expense
            </Link>

            <Link
              className="px-2 py-1 button1 button2 text-decoration-none bg-success text-light"
              type="button"
              to="/admin/income"
            >
              Income
            </Link>
          </div>

          <div className="px-2 py-0 box-span d-flex justify-content-between align-items-center">
            <span className="details-t">Transaction Details</span>
            <span className="border border-dark question-mark mt-1 mb-1">
              ❔
            </span>
          </div>

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="date-inc">Date</label>
              <input
                id="date-inc"
                name="date"
                type="date"
                className="form-control"
                value={dateInputValue}
                onChange={handleDateChange}
                required
              />
            </div>

            <hr className="divider mt-0 mb-0" />

            <div className="form-row">
              <label htmlFor="category-inc">Employee</label>
              <select
                id="employee-inc"
                name="employee_name"
                className="form-control rounded-0"
                value={income.employee_name}
                onChange={handleIncomeChange}
                required
              >
                <option value="">Select an employee</option>
                {Array.isArray(employee) && employee.length > 0 ? (
                  employee.map((item, idx) => (
                    <option key={idx} value={item.employee_name}>
                      {item.employee_name}
                    </option>
                  ))
                ) : (
                  <option disabled>No employee available</option>
                )}
              </select>
            </div>

            <hr className="divider mt-0 mb-0" />

            <div className="form-row">
              <label htmlFor="category-inc">Category</label>
              <select
                id="category-inc"
                name="category_name"
                className="form-control rounded-0"
                value={income.category_name}
                onChange={handleIncomeChange}
                required
              >
                <option value="">Select a category</option>
                {Array.isArray(cate) && cate.length > 0 ? (
                  cate.map((item) => (
                    <option
                      key={item.id ?? item._id ?? item.category_id}
                      value={item.category_name}
                    >
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
              <label htmlFor="amount-inc">Amount</label>
              <input
                id="amount-inc"
                name="amount"
                type="number"
                className="form-control"
                placeholder="Amount"
                value={income.amount}
                onChange={handleIncomeChange}
                required
              />
            </div>
          </div>

          <div className="px-2 py-0 box-span d-flex justify-content-between align-items-center mt-3">
            <span className="details-t">Repeating Details</span>
            <span className="border border-dark question-mark mt-1 mb-1">
              ❔
            </span>
          </div>

          <div className="form-panel">
            <div className="form-row repeat-row">
              <label className="repeat-label" htmlFor="repeat-inc">
                Repeat
              </label>

              <input
                type="checkbox"
                id="repeat-inc"
                name="repeats"
                className="repeat-checkbox"
                checked={Boolean(income.repeats)}
                onChange={handleIncomeChange}
              />

              <label htmlFor="repeat-inc" className="toggle-switch">
                <span className="track">
                  <span className="knob" />
                </span>
              </label>
            </div>
          </div>

          <div className="form-panel">
            <div className="form-row d-flex flex-row">
              <label htmlFor="note-inc">Note</label>
              <textarea
                id="note-inc"
                name="note"
                type="text"
                className="form-control rounded-0"
                placeholder="No Note Entered"
                value={income.note}
                onChange={handleIncomeChange}
                style={{ height: "50px" }}
              />
            </div>
          </div>

          <div className="d-flex justify-content-center mt-3 pb-3">
            <button className="btn btn-success rounded-1" type="submit">
              Add
            </button>
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}

export default Income;
