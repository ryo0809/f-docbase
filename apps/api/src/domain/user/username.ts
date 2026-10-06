import { ValidationError } from "../shared/errors";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

export class Username {
  private constructor(readonly value: string) {}

  static create(raw: string): Username {
    if (!USERNAME_RE.test(raw)) {
      throw new ValidationError("ユーザー名は英数字と _ . - の3〜32文字で入力してください");
    }
    return new Username(raw);
  }

  /** 形式が正しくなければ null(ログイン時など、理由を知らせたくない場面で使う) */
  static tryCreate(raw: string): Username | null {
    return USERNAME_RE.test(raw) ? new Username(raw) : null;
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
