import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";

type StatusFooterProps = {};

export function StatusFooter({}: StatusFooterProps) {
  const { notice, errorMessage, projectName, projectDirty } = useAppContext();
  const { t } = useTranslation();

  return (
    <footer className="bg-[#191c1d] text-[#f0f8f7] p-2 flex flex-wrap gap-2 text-sm select-none">
      <Label>{t("backendStatus")}</Label>
      <Value>{errorMessage ? t("attention") : t("connected")}</Value>
      <Label>{t("projectName")}</Label>
      <Value>
        {projectName}
        {projectDirty ? " *" : ""}
      </Value>
      {notice && (
        <>
          <Label>{t("notice")}</Label>
          <Value>{notice}</Value>
        </>
      )}
      {errorMessage && (
        <>
          <Label>{t("error")}</Label>
          <span className="uppercase mr-10 text-red-500">{errorMessage}</span>
        </>
      )}
    </footer>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="uppercase text-primary-70">{children} :</span>;
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="uppercase mr-10">{children}</span>;
}
