import React from "react"
import { createRoot } from "react-dom/client"
import Home from "./Home"
import "../src/index.css"

const root = document.getElementById("root")

if (!root) throw new Error("Root element not found")

createRoot(root).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>
)
