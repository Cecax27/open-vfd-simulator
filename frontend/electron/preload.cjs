const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openVfd", {
  version: "0.1.0",
  onMenuAction(handler) {
    const wrappedHandler = (_, action) => handler(action);
    ipcRenderer.on("menu:action", wrappedHandler);
    return () => {
      ipcRenderer.off("menu:action", wrappedHandler);
    };
  },
  confirmSaveBeforeContinue(projectName) {
    return ipcRenderer.invoke("project:confirm-save-before-continue", projectName);
  },
  openProjectDialog() {
    return ipcRenderer.invoke("project:open-dialog");
  },
  saveProjectDialog(defaultPath) {
    return ipcRenderer.invoke("project:save-dialog", defaultPath);
  },
  readProjectFile(filePath) {
    return ipcRenderer.invoke("project:file-read", filePath);
  },
  writeProjectFile(filePath, content) {
    return ipcRenderer.invoke("project:file-write", { filePath, content });
  },
});
