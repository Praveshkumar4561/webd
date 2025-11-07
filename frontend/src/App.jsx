import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login";
import UserPage from "./components/UserPage";
import AdminHomePage from "./admin/AdminHomePage";
import User from "./User";
import NewEmployee from "./admin/NewEmployee";
import Transfer from "./admin/Transfer";
import Expenses from "./admin/Expenses";
import EmployeeEdit from "./admin/EmployeeEdit";
import NewShop from "./admin/NewShop";
import CreateShop from "./admin/CreateShop";
import ShopEdit from "./admin/ShopEdit";
import NewUser from "./admin/NewUser";
import AllUsers from "./admin/AllUsers";
import UserEdit from "./admin/UserEdit";
import ViewWork from "./admin/ViewWork";
import EmployeePerformance from "./admin/EmployeePerformance";
import ManageWork from "./admin/ManageWork";
import Payroll from "./admin/Payroll";
import Transaction from "./admin/Transaction";
import Categories from "./admin/Categories";
import NewCategory from "./admin/NewCategory";
import AllCategory from "./admin/AllCategory";
import CategoryEdit from "./admin/CategoryEdit";
import ViewEmployee from "./admin/ViewEmployee";
import ViewUsers from "./admin/ViewUsers";
import EmployeeAdvance from "./admin/EmployeeAdvance";
import OtherCate from "./admin/OtherCate";
import CategoryView from "./admin/CategoryView";
import ProtectedRoute from "./components/ProtectedRoute";
import ShopExpanses from "./admin/expanses/ShopExpanses";
import EmployeeExpanses from "./admin/expanses/EmployeeExpanses";
import PersonalExpanses from "./admin/expanses/PersonalExpanses";
import Income from "./admin/income/Income";
import AllIncome from "./admin/income/AllIncome";
import ProtectedUser from "./components/ProtectedUser";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedUser />}>
          <Route path="/user" element={<UserPage />} />
        </Route>

        <Route path="/user"></Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<User />}>
            <Route path="home" element={<AdminHomePage />} />
            <Route path="newemployee" element={<NewEmployee />} />
            <Route path="employeetransfer" element={<Transfer />} />
            <Route path="employeeexpenses" element={<Expenses />} />
            <Route path="shops" element={<NewShop />} />
            <Route path="newshop" element={<CreateShop />} />
            <Route path="users" element={<AllUsers />} />
            <Route path="works" element={<ViewWork />} />
            <Route
              path="employeeperformance"
              element={<EmployeePerformance />}
            />
            <Route path="managework" element={<ManageWork />} />
            <Route path="expense" element={<Payroll />} />
            <Route path="transaction" element={<Transaction />} />
            <Route path="categories" element={<Categories />} />
            <Route path="allcategories" element={<AllCategory />} />
            <Route path="employeeadvance" element={<EmployeeAdvance />} />
            <Route path="income" element={<AllIncome />} />
          </Route>

          <Route path="/admin/income" element={<User />}>
            <Route path="create" element={<Income />} />
          </Route>

          <Route path="/admin/expense" element={<User />}>
            <Route path="shop" element={<ShopExpanses />} />
            <Route path="employee" element={<EmployeeExpanses />} />
            <Route path="personal" element={<PersonalExpanses />} />
          </Route>

          <Route path="/admin/category" element={<User />}>
            <Route path="create" element={<NewCategory />} />
            <Route path="edit/:id" element={<CategoryEdit />} />
            <Route path="view/:id" element={<CategoryView />} />
          </Route>

          <Route path="/admin/othercategory" element={<User />}>
            <Route path="create" element={<OtherCate />} />
          </Route>

          <Route path="/admin/employee" element={<User />}>
            <Route path="edit/:id" element={<EmployeeEdit />} />
            <Route path="view/:id" element={<ViewEmployee />} />
          </Route>

          <Route path="/admin/user" element={<User />}>
            <Route path="create" element={<NewUser />} />
            <Route path="edit/:id" element={<UserEdit />} />
            <Route path="view/:id" element={<ViewUsers />} />
          </Route>

          <Route path="/admin/newshop" element={<User />}>
            <Route path="edit/:id" element={<ShopEdit />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
