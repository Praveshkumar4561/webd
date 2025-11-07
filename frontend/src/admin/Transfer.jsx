import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Transfer() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [shops, setShops] = useState([]);

  const [transfer, setTransfer] = useState({
    employee_id: "",
    employee_name: "",
    shop_from: "",
    shop_to: "",
  });

  useEffect(() => {
    axios
      .get(`${API_URL}/allemployee`)
      .then((res) => {
        if (Array.isArray(res.data.employees)) {
          setEmployees(res.data.employees);
        } else {
          console.warn("Expected array but got:", res.data);
          setEmployees([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      });
  }, [API_URL]);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/allshop`);
        setShops(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error("Failed to fetch shops:", err);
        setShops([]);
      }
    };

    fetchShops();
  }, [API_URL]);

  const handleEmployeeSelect = (e) => {
    const id = e.target.value;
    const selected = employees.find((emp) => String(emp.id) === String(id));

    setTransfer((prev) => ({
      ...prev,
      employee_id: selected ? selected.id : "",
      employee_name: selected ? selected.employee_name : "",
      shop_from:
        selected?.shop ||
        selected?.shop_name ||
        selected?.shop?.shop_name ||
        "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransfer((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transfer.employee_id || !transfer.shop_from || !transfer.shop_to) {
      return;
    }
    try {
      await axios.post(`${API_URL}/transfer`, transfer);
      setSummary({
        employee_name: transfer.employee_name,
        shop_from: transfer.shop_from,
        shop_to: transfer.shop_to,
      });
      setTransfer({
        employee_id: "",
        employee_name: "",
        shop_from: "",
        shop_to: "",
      });
    } catch (error) {
      console.error("Transfer failed:", error.response?.data || error.message);
    }
  };

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
      <div className="card shadow-sm employee-details">
        <div className="card-header text-center">
          <h5 className="mb-0">Internal Employee Transfer</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Select Employee:</label>

                <select
                  className="form-select"
                  name="employee_id"
                  value={transfer.employee_id}
                  onChange={handleEmployeeSelect}
                  required
                >
                  <option value="">Select Employee</option>
                  {Array.isArray(employees) && employees.length > 0 ? (
                    employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No employees available</option>
                  )}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Transfer From Shop:</label>

                <input
                  type="text"
                  className="form-control"
                  name="shop_from"
                  value={transfer.shop_from}
                  placeholder="Select employee"
                  readOnly
                  disabled
                />
              </div>

              <div className="col-12">
                <label className="form-label">Transfer To Shop:</label>
                <select
                  className="form-select"
                  name="shop_to"
                  value={transfer.shop_to}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Shop</option>
                  {Array.isArray(shops) && shops.length > 0 ? (
                    shops.map((shop) => (
                      <option key={shop.id} value={shop.shop_name}>
                        {shop.shop_name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No shops available</option>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button type="submit" className="btn btn-primary w-100">
                Transfer Employee
              </button>
            </div>
          </form>
        </div>

        {summary && (
          <div className="p-0 m-0 fw-bold text-center bg-dark-subtle mt-3">
            <p className="mt-3 mb-1">Transfer Summary</p>
            <p className="transfer-shop p-1">
              Employee {summary.employee_name} has been successfully transferred
              from {summary.shop_from} to {summary.shop_to}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
