export {};

type MenuAction =
  | "project:new"
  | "project:open"
  | "project:save"
  | "project:save-as"
  | "view:devices"
  | "view:settings";

type MenuActionHandler = (action: MenuAction) => void;

declare global {
  interface Window {
    openVfd?: {
      version: string;
      onMenuAction: (handler: MenuActionHandler) => () => void;
      confirmSaveBeforeContinue: (
        projectName?: string,
      ) => Promise<"save" | "dont-save" | "cancel">;
      openProjectDialog: () => Promise<string | null>;
      saveProjectDialog: (defaultPath?: string) => Promise<string | null>;
      readProjectFile: (filePath: string) => Promise<string>;
      writeProjectFile: (filePath: string, content: string) => Promise<boolean>;
    };
  }
}
