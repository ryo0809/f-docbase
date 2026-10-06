// API(wrangler dev)と画面(Vite)を同時に起動する。どちらかが止まったら、もう一方も止める。
import { spawn } from "node:child_process";

const tasks = [
  ["api", ["run", "dev", "-w", "@f-docbase/api"]],
  ["web", ["run", "dev", "-w", "@f-docbase/web"]],
];

const children = tasks.map(([name, args]) => {
  const child = spawn("npm", args, { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    console.log(`[${name}] 終了しました (code ${code})`);
    stop();
  });
  return child;
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"]);
    else c.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
