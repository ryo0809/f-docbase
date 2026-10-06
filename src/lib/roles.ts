// ロールと権限の定義。クライアントコンポーネントからも使えるよう、Node 依存を持たない。

export const ROLES = ["owner", "developer", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "オーナー",
  developer: "開発メンバー",
  viewer: "一般メンバー",
};

export type Permission = "view" | "edit" | "delete" | "manageUsers";

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ["view", "edit", "delete", "manageUsers"],
  developer: ["view", "edit"],
  viewer: ["view"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
