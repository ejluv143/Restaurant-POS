// PostToolUse: run ESLint on the TS/TSX file Claude just edited and feed any errors back.
// Exit code 2 surfaces stderr to Claude so it fixes the problem before moving on.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8").replace(/^\uFEFF/, "") || "{}");
// Git Bash style /c/Users/... → C:/Users/...
const file = String(input.tool_input?.file_path ?? "").replace(/^\/([a-z])\//i, "$1:/");
const frontend = path.resolve(import.meta.dirname, "../../frontend");
const rel = path.relative(frontend, file);

if (!/\.(ts|tsx|mjs)$/.test(file) || rel.startsWith("..") || path.isAbsolute(rel)) process.exit(0);

const result = spawnSync("npx", ["eslint", "--max-warnings=0", rel], { cwd: frontend, encoding: "utf8", shell: true });
if (result.status !== 0) {
  process.stderr.write(`ESLint found problems in ${rel}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
