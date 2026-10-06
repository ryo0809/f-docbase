import type { Clock, IdGenerator, TemplateCatalog } from "../application/ports/ports";
import { TEMPLATES } from "./templates/templates.generated";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** 例: 1791280327111-3f9a1c */
export class TimestampIdGenerator implements IdGenerator {
  next(): string {
    return `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  }
}

/** リポジトリ直下の templates/*.md(ビルド時に生成されるモジュール)を返す。 */
export class BundledTemplateCatalog implements TemplateCatalog {
  list() {
    return TEMPLATES;
  }
}
