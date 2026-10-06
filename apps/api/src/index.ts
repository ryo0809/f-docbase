import { createD1Container, type Container } from "./container";
import { createApp } from "./interface/http/app";
import type { Env } from "./interface/http/types";

// 同じ D1 に対しては、use case の組み立てを使い回す(署名キーの取得結果もここに残る)
const containers = new WeakMap<object, Container>();

const app = createApp((env: Env) => {
  let container = containers.get(env.DB);
  if (!container) {
    container = createD1Container(env.DB);
    containers.set(env.DB, container);
  }
  return container;
});

export default app satisfies ExportedHandler<Env>;
