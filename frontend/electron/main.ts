import { BrowserWindow, app } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(currentDirectory, "preload.js"),
    },
  });

  window.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
