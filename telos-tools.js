// telos-tools.js
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

  // tool-item：帳號中心 → 發事件給 profile 模組
  document
    .querySelectorAll(".tool-item[data-tool='account']")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("open-profile"));
        toolsPanel.classList.remove("open");
      });
    });

  // chat 按鈕 / 設定 按鈕照舊，可按需要再加
}
