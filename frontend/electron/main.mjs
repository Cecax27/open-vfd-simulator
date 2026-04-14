import { BrowserWindow, Menu, app, dialog, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");

function sendMenuAction(action) {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!window) {
    return;
  }
  window.webContents.send("menu:action", action);
}

function createApplicationMenu() {
  const template = [
    {
      label: "Project",
      submenu: [
        { label: "New Project", accelerator: "CmdOrCtrl+N", click: () => sendMenuAction("project:new") },
        { label: "Open Project...", accelerator: "CmdOrCtrl+O", click: () => sendMenuAction("project:open") },
        { type: "separator" },
        { label: "Save", accelerator: "CmdOrCtrl+S", click: () => sendMenuAction("project:save") },
        { label: "Save As...", accelerator: "CmdOrCtrl+Shift+S", click: () => sendMenuAction("project:save-as") },
        { type: "separator" },
        { label: "Program Settings", accelerator: "CmdOrCtrl+2", click: () => sendMenuAction("view:settings") },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Devices", accelerator: "CmdOrCtrl+1", click: () => sendMenuAction("view:devices") },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerIpcHandlers() {
  ipcMain.handle("project:confirm-save-before-continue", async (_, projectName) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!window) {
      return "cancel";
    }

    const result = await dialog.showMessageBox(window, {
      type: "question",
      title: "Unsaved Changes",
      message: `Save changes to ${projectName || "current project"} before continuing?`,
      detail: "If you continue without saving, your changes will be lost.",
      buttons: ["Save", "Don't Save", "Cancel"],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });

    if (result.response === 0) {
      return "save";
    }
    if (result.response === 1) {
      return "dont-save";
    }
    return "cancel";
  });

  ipcMain.handle("project:open-dialog", async () => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!window) {
      return null;
    }

    const result = await dialog.showOpenDialog(window, {
      title: "Open Project",
      properties: ["openFile"],
      filters: [{ name: "Open VFD Project", extensions: ["ovfd", "json"] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("project:save-dialog", async (_, defaultPath) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!window) {
      return null;
    }

    const result = await dialog.showSaveDialog(window, {
      title: "Save Project",
      defaultPath,
      filters: [{ name: "Open VFD Project", extensions: ["ovfd", "json"] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
  });

  ipcMain.handle("project:file-read", async (_, filePath) => {
    return fs.readFile(filePath, "utf-8");
  });

  ipcMain.handle("project:file-write", async (_, payload) => {
    const tempFilePath = path.join(
      os.tmpdir(),
      `open-vfd-save-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
    );

    await fs.writeFile(tempFilePath, payload.content, "utf-8");
    await fs.rename(tempFilePath, payload.filePath);
    return true;
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(currentDirectory, "preload.cjs"),
    },
  });

  if (!app.isPackaged) {
    window.loadURL("http://localhost:5173");
    return;
  }

  window.loadFile(path.join(projectRoot, "dist", "index.html"));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createApplicationMenu();
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
