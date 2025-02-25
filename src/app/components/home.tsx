"use client";

import { Routes, Route, HashRouter as Router } from "react-router-dom";
import styles from "./home.module.scss";
import { MaskPage } from "./mask-page";
import { SideBar } from "./sidebar";
import { Path } from "../constant";
import Chat from "./chat";
import Login from "./login";
import { useTokenStore } from "../store/token";

export default function Home() {
  const token = useTokenStore((state) => state.token);

  return (
    <Router>
      {token.length > 0 ? (
        <div className={styles.container}>
          <SideBar />

          <div className={styles["window-content"]} >
            <Routes>
              <Route path={Path.Chat} element={<Chat />} />
              <Route path={Path.Home} element={<MaskPage />} />
              <Route path={Path.Masks} element={<MaskPage />} />
            </Routes>
          </div>
        </div>) : <Login />}
    </Router>
  );
}
