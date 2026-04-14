import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("openVfd", {
  version: "0.1.0",
});
