import { BrowserWindow, Menu, app, dialog, ipcMain } from "electron";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "../..");

let backendProcess = null;

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
        { label: "Devices", accelerator: "CmdOrCtrl+1", click: () => sendMenuAction("view:devices") }
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: async () => {
            const { shell } = await import("electron");
            await shell.openExternal("https://openvfd.org/en/docs");
          },
        },
        {
          label: "Discord Server",
          click: async () => {
            const { shell } = await import("electron");
            await shell.openExternal("hhttps://discord.gg/RScK4jEC7");
          },
        },
        {
          label: "GitHub Repository",
          click: async () => {
            const { shell } = await import("electron");
            await shell.openExternal("https://github.com/Cecax27/open-vfd-simulator");
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        {
          label: "Make a Donation",
          click: async () => {
            const { shell } = await import("electron");
            await shell.openExternal("https://github.com/sponsors/Cecax27");
          },
        }
      ],
    }
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
      filters: [{ name: "OpenVFD Project", extensions: ["ovfd", "json"] }],
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
      filters: [{ name: "OpenVFD Project", extensions: ["ovfd", "json"] }],
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

async function startBackend() {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged;
    let backendPath;

    if (isDev) {
      // Development: use Python directly
      backendPath = path.join(projectRoot, ".venv", "bin", "python");
      backendProcess = spawn(backendPath, [
        "-m", "uvicorn",
        "open_vfd_simulator_backend.main:app",
        "--app-dir", path.join(projectRoot, "backend", "src"),
        "--host", "127.0.0.1",
        "--port", "8000",
        "--reload"
      ], {
        cwd: path.join(projectRoot, "backend"),
        stdio: ["ignore", "pipe", "pipe"]
      });
    } else {
      // Production: use PyInstaller bundle
      if (process.platform === "win32") {
        backendPath = path.join(process.resourcesPath, "backend", "main.exe");
      } else {
        backendPath = path.join(process.resourcesPath, "backend", "main");
      }

      backendProcess = spawn(backendPath, [],{
        stdio: "pipe"
      });
    }

    // Wait for backend to be ready
    const checkBackend = setInterval(async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/health");
        if (response.ok) {
          clearInterval(checkBackend);
          resolve();
        }
      } catch (err) {
        // Backend not ready yet
      }
    }, 200);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkBackend);
      reject(new Error("Backend startup timeout"));
    }, 30000);

    backendProcess.on("error", (err) => {
      clearInterval(checkBackend);
      reject(err);
    });
  });
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(currentDirectory, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  const startUrl = isDev
    ? "http://127.0.0.1:5173"
    : `file://${path.join(currentDirectory, "../dist/index.html")}`;

  window.loadURL(startUrl);

  if (isDev) {
    window.webContents.openDevTools();
  }

  return window;
}

app.on("ready", async () => {
  createApplicationMenu();
  registerIpcHandlers();

  try {
    await startBackend();
    await createWindow();
  } catch (err) {
    console.error("Failed to start backend:", err);
    dialog.showErrorBox("Error", `Failed to start backend service: ${err.message}. Please try again.`);
    app.quit();
  }
});

app.on("quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
