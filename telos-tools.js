// telos-tools.js — 九宮格工具面板

export function initToolsPanel() {
  const toolsBtn = document.getElementById("tools-button");
  const toolsPanel = document.getElementById("tools-panel");

  if (!toolsBtn || !toolsPanel) return;

  toolsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toolsPanel.classList.toggle("open");
  });

  toolsPanel.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => {
    toolsPanel.classList.remove("open");
  });

  // 帳號中心 → 發事件讓 profile 模組打開個人頁 modal
  document
    .querySelectorAll(".tool-item[data-tool='account']")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .getElementById("user-panel")
          ?.scrollIntoView({ behavior: "smooth" });
        const ev = new Event("open-profile");
        document.dispatchEvent(ev);
        toolsPanel.classList.remove("open");
      });
    });

  // 訊息按鈕（chat）也在 chat 模組裡會另外處理開關
}
