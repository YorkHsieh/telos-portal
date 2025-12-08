// main.js
import { initAuthUI } from "./telos-auth.js";
import { initChat } from "./telos-chat.js";
import { initToolsPanel } from "./telos-tools.js";
import { initProfile } from "./telos-profile.js";

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
