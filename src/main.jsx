// react strict mode helps catch issues during development
import { StrictMode } from "react";

// used to mount the react app into the html root element
import { createRoot } from "react-dom/client";

// registers the service worker so the app can work offline (pwa feature)
import { registerSW } from "virtual:pwa-register";

// global styles
import "./index.css";
import "./App.css";

// main application component
import App from "./App.jsx";

// register the service worker
// this enables offline capability and caching
registerSW({
  // called when the app is fully cached and ready offline
  onOfflineReady() {
    console.log("yapsie is ready to work offline");
  }
});

// render the app inside the root div in index.html
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);