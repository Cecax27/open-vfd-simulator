import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppProvider } from "./context/AppContext";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { DevicesPage } from "./pages/DevicesPage";
import { DeviceConfigPage } from "./pages/DeviceConfigPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CommunicationsPage } from "./pages/CommunicationsPage";
import { OpcUaPage } from "./pages/communications/OpcUaPage";

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/devices/config" element={<DeviceConfigPage />} />
            <Route path="/communications" element={<CommunicationsPage />} />
            <Route path="/communications/opcua" element={<OpcUaPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
