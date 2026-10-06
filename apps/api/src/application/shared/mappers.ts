import type { Doc, DocMeta, UserDetail, UserInfo } from "@f-docbase/shared";
import type { Document, DocumentSummary } from "../../domain/document/document";
import type { User } from "../../domain/user/user";

export function toDocMeta(d: DocumentSummary): DocMeta {
  return { id: d.id.value, title: d.title, tags: d.tags, updated: d.updatedAt.toISOString() };
}

export function toDoc(d: Document): Doc {
  return { ...toDocMeta(d.toSummary()), content: d.content };
}

export function toUserInfo(u: User): UserInfo {
  return { username: u.username.value, role: u.role };
}

export function toUserDetail(u: User): UserDetail {
  return { ...toUserInfo(u), createdAt: u.createdAt.toISOString() };
}
