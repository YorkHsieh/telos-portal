// main.js
import { initAuthUI } from "./auth.js";
import { initChat } from "./chat.js";
import { initToolsPanel } from "./tools.js";
import { initProfile } from "./profile.js";

document.addEventListener("DOMContentLoaded", () => {
  // ====== 開場動畫 ======
  const splash = document.getElementById("splash");
  const appMain = document.getElementById("app-main");

  setTimeout(() => {
    if (splash) splash.classList.add("hidden");
    if (appMain) appMain.classList.add("ready");
  }, 2300);

  // ====== 各模組初始化 ======
  initAuthUI();
  initChat();
  initToolsPanel();
  initProfile();
});
