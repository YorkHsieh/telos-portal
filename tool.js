export function initToolsPanel() {
  const toolsBtn = document.getElementById("tools-button");
  const toolsPanel = document.getElementById("tools-panel");

  if (!toolsBtn || !toolsPanel) return;

  toolsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toolsPanel.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    toolsPanel.classList.remove("open");
  });

  toolsPanel.addEventListener("click", (e) => e.stopPropagation());
}
