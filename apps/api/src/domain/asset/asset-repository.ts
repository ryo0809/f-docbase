import type { Asset } from "./asset";

export interface AssetRepository {
  add(asset: Asset): Promise<void>;
  find(name: string): Promise<Asset | null>;
}
