import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { NotificationsProvider } from "./notifications/NotificationsContext";

/**
 * PUBLIC_INTERFACE
 * Entry point: Renders the App wrapped with NotificationsProvider and React Router v6 BrowserRouter.
 */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <NotificationsProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </NotificationsProvider>
);
