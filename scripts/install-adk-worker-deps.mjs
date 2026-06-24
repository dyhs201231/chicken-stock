import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const isVercelBuild = process.env.VERCEL === "1" || process.env.VERCEL === "true";

if (!isVercelBuild) {
  console.log("Skipping ADK worker Python dependency install outside Vercel.");
  process.exit(0);
}

const projectRoot = process.cwd();
const requirementsPath = path.join(projectRoot, "adk-worker", "requirements.txt");
const targetPath = path.join(projectRoot, "adk-worker", ".python_packages");
const python = process.env.PYTHON_BIN || "python3";

if (!existsSync(requirementsPath)) {
  console.error(`ADK worker requirements file not found: ${requirementsPath}`);
  process.exit(1);
}

await mkdir(targetPath, { recursive: true });

const result = spawnSync(
  python,
  [
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    "--no-cache-dir",
    "-r",
    requirementsPath,
    "-t",
    targetPath,
  ],
  {
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
