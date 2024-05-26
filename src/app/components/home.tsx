"use client";

import { Routes, Route, HashRouter as Router } from "react-router-dom";
import styles from "./home.module.scss";
import { NewChat } from "./new-chat";
import { SideBar } from "./sidebar";
import { Path } from "../constant";
import Chat from "./chat";

export default function Home() {
  return (
    <Router>
      <div className={styles.container}>
        <SideBar />

        <div className={styles["window-content"]} >
          <Routes>
            <Route path={Path.Chat} element={<Chat />} />
            <Route path={Path.Home} element={<NewChat />} />
            <Route path={Path.NewChat} element={<NewChat />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
