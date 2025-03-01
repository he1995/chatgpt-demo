"use client";

import { Routes, Route, HashRouter as Router, useNavigate } from "react-router-dom";
import { MaskPage } from "./mask-page";

import { Path } from "../constant";
import Chat from "./chat";
import Login from "./login";

import ProductList from "./ProductList";
import ProductDetail from "./ProductDetail";
import OrderDetail from "./OrderDetail";
export default function Home() {
  

  return (
    <Router>
      <Routes>
        <Route path={Path.Home} element={<MaskPage />} />
        <Route path={Path.Login} element={<Login />} />
        <Route path={Path.Product} element={<ProductList />} />
        <Route path={Path.ProductDetail} element={<ProductDetail />} />
        <Route path={Path.Chat} element={<Chat />} />
        <Route path={Path.Masks} element={<MaskPage />} />
        <Route path={Path.Order} element={<OrderDetail />} />
      </Routes>
    </Router>
  );
}
