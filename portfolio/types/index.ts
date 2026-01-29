// types/index.ts

export type UIState = {
  adminSidebarCollapsed: boolean;
  setAdminSidebarCollapsed: (v: boolean) => void;
  toggleAdminSidebarCollapsed: () => void;
};