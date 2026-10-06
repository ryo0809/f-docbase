// ドメインとアプリケーション層で起きる業務上のエラー。HTTP のステータスへの変換は interface 層で行う。

export type ErrorKind = "validation" | "not_found" | "conflict" | "forbidden" | "unauthenticated";

export class DomainError extends Error {
  readonly kind: ErrorKind;

  constructor(kind: ErrorKind, message: string) {
    super(message);
    this.name = new.target.name;
    this.kind = kind;
  }
}

/** 入力が業務ルールに反している */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super("validation", message);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super("not_found", message);
  }
}

/** すでに存在する、最後のオーナーを消そうとした、など状態と矛盾する操作 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super("conflict", message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "この操作を行う権限がありません") {
    super("forbidden", message);
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = "ログインが必要です") {
    super("unauthenticated", message);
  }
}
