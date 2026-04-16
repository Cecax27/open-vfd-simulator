import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppContext } from "../../context/AppContext";

export function OpcUaPage() {
  const { t } = useTranslation();
  const {
    configuration,
    opcUaStatus,
    opcUaBrowse,
    isMutating,
    setOpcUaConfiguration,
    testOpcUaServer,
    browseOpcUaNode,
  } = useAppContext();

  const [enabled, setEnabled] = useState(configuration.opcua.enabled);
  const [endpointUrl, setEndpointUrl] = useState(
    configuration.opcua.endpoint_url ?? "",
  );
  const [timeoutSeconds, setTimeoutSeconds] = useState(
    configuration.opcua.request_timeout_s,
  );
  const [browseNodeId, setBrowseNodeId] = useState("i=84");

  const statusLabel = useMemo(() => {
    if (opcUaStatus.state === "connected") return t("connected");
    if (opcUaStatus.state === "connecting") return t("opcuaConnecting");
    if (opcUaStatus.state === "error") return t("attention");
    return t("closed");
  }, [opcUaStatus.state, t]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await setOpcUaConfiguration({
      enabled,
      endpoint_url: endpointUrl.trim() ? endpointUrl.trim() : null,
      request_timeout_s: timeoutSeconds,
    });
    await testOpcUaServer();
  }

  return (
    <section className="panel">
      <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
        <label>
          <span className="toggle-field">
            <input
              className="toggle-input"
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span className="toggle-switch" aria-hidden="true" />
            <h2>{t("opcua")}</h2>
            <strong>{statusLabel}</strong>
          </span>
        </label>
        <label>
          <span>{t("opcuaEndpoint")}</span>
          <input
            placeholder="opc.tcp://127.0.0.1:4840"
            value={endpointUrl}
            onChange={(event) => setEndpointUrl(event.target.value)}
          />
        </label>
        {opcUaStatus.last_error && <p className="text-sm text-red-500">{opcUaStatus.last_error}</p>}
        <label>
          <span>{t("opcuaTimeout")}</span>
          <input
            type="number"
            min={0.1}
            max={30}
            step={0.1}
            value={timeoutSeconds}
            onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
          />
        </label>
        <div className="row-actions">
          <button type="submit" disabled={isMutating}>
            {t("saveSettings")}
          </button>
        </div>
      </form>

      <hr />

      {opcUaStatus.state === "connected" && (
        <section className="opcua-browse-block">
          <h2>{t("opcuaBrowse")}</h2>
          <div className="row-actions">
            <input
              value={browseNodeId}
                onChange={(event) => setBrowseNodeId(event.target.value)}
            placeholder="i=84"
          />
          <button
            type="button"
            onClick={() => void browseOpcUaNode(browseNodeId)}
            disabled={isMutating}
          >
            {t("browse")}
          </button>
        </div>
        <ul className="telemetry-list" style={{ marginTop: "10px" }}>
          {(opcUaBrowse?.items ?? []).map((item) => (
            <li key={item.node_id}>
              <span>
                {item.display_name} ({item.node_class})
              </span>
              <strong>{item.node_id}</strong>
            </li>
          ))}
        </ul>
      </section>)}
    </section>
  );
}
