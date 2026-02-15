import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { CustomControllerProvider } from "context";  // Adjust path if needed

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <CustomControllerProvider>
      <App />
    </CustomControllerProvider>
  </BrowserRouter>
);
