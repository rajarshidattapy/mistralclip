import React from "react";
import ReactDOM from "react-dom/client";
import { EditorPage } from "./pages/editor";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EditorPage />
  </React.StrictMode>
);

