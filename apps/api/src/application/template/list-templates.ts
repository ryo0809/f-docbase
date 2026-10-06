import type { TemplateInfo } from "@f-docbase/shared";
import type { User } from "../../domain/user/user";
import type { TemplateCatalog } from "../ports/ports";
import { requirePermission } from "../shared/authorize";

export class ListTemplatesUseCase {
  constructor(private readonly templates: TemplateCatalog) {}

  execute(actor: User | null): TemplateInfo[] {
    requirePermission(actor, "view");
    return [...this.templates.list()];
  }
}
