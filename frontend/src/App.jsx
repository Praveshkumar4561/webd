import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login";
import UserPage from "./components/UserPage";
import AdminHomePage from "./admin/AdminHomePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/user" element={<UserPage />} />

        <Route path="/admin">
          <Route path="home" element={<AdminHomePage />} />
        </Route>

        {/* <Route path="/admin/home" element={<AdminHome />} />
        <Route path="/user" element={<UserHome />} />
        <Route path="/admin/newuser" element={<AddUser />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
