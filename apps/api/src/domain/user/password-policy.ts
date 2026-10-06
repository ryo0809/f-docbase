import { ValidationError } from "../shared/errors";

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(`パスワードは${MAX_PASSWORD_LENGTH}文字までです`);
  }
}
