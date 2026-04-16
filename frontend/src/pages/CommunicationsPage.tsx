import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function CommunicationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="panel view-page">
      <div className="panel-head">
        <h2>{t("communicationsTitle")}</h2>
      </div>
      <p className="caption">{t("communicationsSubtitle")}</p>
      <div className="row-actions" style={{ marginTop: "14px" }}>
        <button onClick={() => navigate("/communications/opcua")}>{t("opcua")}</button>
      </div>
    </section>
  );
}
