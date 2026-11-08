import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (
  import.meta.env.DEV &&
  import.meta.env.VITE_ADMIN_REVIEW_MODE === "true" &&
  ["localhost", "127.0.0.1"].includes(location.hostname)
) {
  sessionStorage.setItem("pawever.admin.accessToken", "local-review-only");
}

createRoot(document.getElementById("root")!).render(<App />);
