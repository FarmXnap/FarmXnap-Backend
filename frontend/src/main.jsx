import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"
import { BrowserRouter } from "react-router-dom"

try {
  const saved = JSON.parse(localStorage.getItem('farmxnap-theme') || '{}')
  const theme = saved?.state?.theme || 'dark'
  document.documentElement.setAttribute('data-theme', theme)
} catch {}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)