import React from "react";
import ReactDOM from "react-dom/client";

import { PopupApp } from "./popup/PopupApp";
import "./popup/styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);


