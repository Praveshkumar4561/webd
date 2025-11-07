import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const monthShort = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${monthShort} ${year}`;
}

function EmployeeExpanses() {
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

  const [shop, setShop] = useState([]);
  const [cate, setCate] = useState([]);
  const [employee, setEmployee] = useState([]);

  const [user, setUser] = useState({
    shop_name: "",
    employee_name: "",
    reason: "",
    category_name: "",
    amount: "",
  });
  const { shop_name, employee_name, reason, category_name, amount } = user;

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, shopRes, empRes] = await Promise.all([
          axios.get(`${API_URL}/allcategorydata`),
          axios.get(`${API_URL}/allshop`),
          axios.get(`${API_URL}/allemployee`),
        ]);

        const cateData = catRes?.data?.data;
        setCate(Array.isArray(cateData) ? cateData : []);
        if (!Array.isArray(cateData))
          console.warn("Unexpected category data shape:", catRes.data);

        const shopData = shopRes?.data?.data;
        setShop(Array.isArray(shopData) ? shopData : []);
        if (!Array.isArray(shopData))
          console.warn("Unexpected shop data shape:", shopRes.data);

        const empData = empRes?.data?.employees;
        setEmployee(Array.isArray(empData) ? empData : []);
        if (!Array.isArray(empData))
          console.warn("Unexpected employee data shape:", empRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setCate([]);
        setShop([]);
        setEmployee([]);
      }
    };

    fetchData();
  }, [API_URL]);

  const onInputChange = (e) => {
    const { name, value } = e.target;

    setUser((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "shop_name") {
        next.employee_name = "";
      }

      return next;
    });
  };

  const filteredEmployees = useMemo(() => {
    if (!shop_name) return [];
    return Array.isArray(employee)
      ? employee.filter(
          (emp) => (emp.shop_name ?? "").toString() === shop_name.toString()
        )
      : [];
  }, [employee, shop_name]);

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    try {
      await axios.post(`${API_URL}/employeeexpensepost`, user);

      setUser({
        shop_name: "",
        employee_name: "",
        reason: "",
        category_name: "",
        amount: "",
      });

      toast.success("Employee expenses submitted successfully", {
        position: "bottom-right",
        autoClose: 800,
        pauseOnHover: true,
        closeOnClick: true,
      });

      setTimeout(() => navigate("/admin/expense"), 800);
    } catch (error) {
      console.error("error", error);
      toast.error("Employee expenses not posted", {
        position: "bottom-right",
        autoClose: 800,
        pauseOnHover: true,
        closeOnClick: true,
      });
    }
  };

  const [selected, setSelected] = useState("Employee Expenses");

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

            <div className="form-row">
              <label htmlFor="employee_id-exp">Shop</label>
              <select
                id="shop_name"
                name="shop_name"
                className="form-control rounded-0"
                required
                value={shop_name}
                onChange={onInputChange}
              >
                <option value="">Select a shop</option>
                {Array.isArray(shop) && shop.length > 0 ? (
                  shop.map((s) => (
                    <option key={s.id} value={s.shop_name}>
                      {s.shop_name}
                    </option>
                  ))
                ) : (
                  <option disabled>No shops available</option>
                )}
              </select>
            </div>

            <hr className="divider mt-0 mb-0" />

            <div className="form-row">
              <label htmlFor="employee_id-exp">Employee</label>
              <select
                id="employee_id-exp"
                name="employee_name"
                className="form-control rounded-0"
                required
                value={employee_name}
                onChange={onInputChange}
              >
                <option value="">
                  {shop_name ? "Select an employee" : "Select a shop first"}
                </option>

                {shop_name ? (
                  filteredEmployees.length > 0 ? (
                    filteredEmployees.map((item) => (
                      <option key={item.id} value={item.employee_name}>
                        {item.employee_name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No employees in selected shop</option>
                  )
                ) : null}
              </select>
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
                id="category_name"
                name="category_name"
                className="form-control rounded-0"
                required
                value={category_name}
                onChange={onInputChange}
              >
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

export default EmployeeExpanses;
