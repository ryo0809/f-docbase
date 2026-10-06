import { Asset } from "../../domain/asset/asset";
import type { AssetRepository } from "../../domain/asset/asset-repository";
import { NotFoundError } from "../../domain/shared/errors";
import type { User } from "../../domain/user/user";
import type { Clock, IdGenerator } from "../ports/ports";
import { requirePermission } from "../shared/authorize";

export class UploadAssetUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(actor: User | null, input: { filename: string; data: Uint8Array }): Promise<{ url: string }> {
    requirePermission(actor, "edit");
    const asset = Asset.upload(input.filename, input.data, this.ids.next(), this.clock.now());
    await this.assets.add(asset);
    return { url: `/api/assets/${asset.name}` };
  }
}

export class GetAssetUseCase {
  constructor(private readonly assets: AssetRepository) {}

  async execute(actor: User | null, name: string): Promise<Asset> {
    requirePermission(actor, "view");
    const asset = await this.assets.find(name);
    if (!asset) throw new NotFoundError("画像が見つかりません");
    return asset;
  }
}
