import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppContext } from "../../context/AppContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

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
    <section className="panel space-y-4">
      <h2>{t("opcua")}</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t("opcua")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <label
              htmlFor="enable-opcua"
              className="flex items-center justify-between gap-3 rounded-lg bg-bg-tertiary px-3 py-3"
            >
              <div className="space-y-1">
                <span className="block text-sm font-medium text-text-primary">
                  {t("opcuaEnabled")}
                </span>
                <span className="block text-xs text-text-muted">{statusLabel}</span>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                id="enable-opcua"
                className="h-5 w-5 rounded border border-text-muted bg-bg-primary accent-success"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-slate-600">{t("opcuaEndpoint")}</span>
              <input
                placeholder="opc.tcp://127.0.0.1:4840"
                value={endpointUrl}
                onChange={(event) => setEndpointUrl(event.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm font-jetbrains-mono text-accent-primary"
              />
            </label>

            {opcUaStatus.last_error && (
              <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                {opcUaStatus.last_error}
              </p>
            )}

            <label className="block space-y-1">
              <span className="text-sm text-slate-600">{t("opcuaTimeout")}</span>
              <input
                type="number"
                min={0.1}
                max={30}
                step={0.1}
                value={timeoutSeconds}
                onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
                className="w-full rounded-md px-3 py-2 text-sm font-jetbrains-mono text-accent-primary"
              />
            </label>

            <div className="flex justify-end">
              <Button type="submit" disabled={isMutating}>
                {t("saveSettings")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {opcUaStatus.state === "connected" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{t("opcuaBrowse")}</CardTitle>
                <p className="text-sm text-slate-600">{t("opcuaBrowseRootHint")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void browseOpcUaNode("i=84")}
                disabled={isMutating}
              >
                {t("refresh")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(opcUaBrowse?.items ?? []).map((item) => (
                <li
                  key={item.node_id}
                  className="flex flex-col gap-1 rounded-lg border border-bg-tertiary bg-bg-tertiary px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm text-text-primary">
                    {item.display_name} ({item.node_class}
                    {item.data_type ? `, ${item.data_type}` : ""})
                  </span>
                  <strong className="text-sm font-jetbrains-mono break-all text-accent-primary">
                    {item.node_id}
                  </strong>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
