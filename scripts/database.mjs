import { spawnSync } from "node:child_process";
const result = spawnSync("python3", ["scripts/database.py", ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
