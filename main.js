// main.js
import { initAuthUI } from "./auth.js";
import { initChat } from "./chat.js";
import { initToolsPanel } from "./tools.js";
import { initProfile } from "./profile.js";

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const appMain = document.getElementById("app-main");

  setTimeout(() => {
    splash?.classList.add("hidden");
    appMain?.classList.add("ready");
  }, 2300);

  initAuthUI();
  initChat();
  initToolsPanel();
  initProfile();
});
