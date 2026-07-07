import type { AppData } from "../types";

// Carimba updatedAt. Usado por toda ação que grava dados — vive aqui para ser
// compartilhado entre o AppProvider e os hooks de ação extraídos.
export function stampData(data: AppData): AppData {
  return { ...data, updatedAt: new Date().toISOString() };
}

export type ConfirmDialogState = {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
};
