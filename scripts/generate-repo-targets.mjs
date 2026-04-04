import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getRepoTopUrl, resolveRepoTarget } from "./repo-target-heuristics.mjs";

const REMOTE_OWNER_PATTERNS = [
  /github\.com[:/]([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\//i,
];

function parseOwnerFromRemoteUrl(value) {
  for (const pattern of REMOTE_OWNER_PATTERNS) {
    const match = pattern.exec(value);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function resolveSiteGitHubOwner() {
  const configuredOwner = process.env.VITE_GITHUB_OWNER?.trim() || process.env.GITHUB_OWNER?.trim();
  if (configuredOwner) {
    return configuredOwner;
  }

  try {
    return parseOwnerFromRemoteUrl(execSync("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim());
  } catch {
    return "";
  }
}

async function main() {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const reposPath = path.join(repoRoot, "repos.json");
  const outputPath = path.join(repoRoot, "src", "generated-repo-targets.ts");
  const owner = resolveSiteGitHubOwner();
  if (!owner) {
    throw new Error("GitHub owner could not be resolved");
  }

  const reposData = JSON.parse(await fs.readFile(reposPath, "utf8"));
  const targets = {};

  for (const repo of reposData.repos) {
    const repoName = repo.name;
    process.stdout.write(`resolving ${owner}/${repoName}\n`);
    targets[repoName] = await resolveRepoTarget(owner, repoName);
  }

  const lines = [
    "export const generatedRepoTargets: Record<string, string> = {",
    ...Object.entries(targets)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([repoName, url]) => `  ${JSON.stringify(repoName)}: ${JSON.stringify(url)},`),
    "};",
    "",
  ];
  await fs.writeFile(outputPath, lines.join("\n"), "utf8");

  const repoTopFallbacks = Object.entries(targets).filter(([repoName, url]) => url === getRepoTopUrl(owner, repoName));
  process.stdout.write(`generated ${Object.keys(targets).length} repo targets\n`);
  process.stdout.write(`repo-top fallbacks: ${repoTopFallbacks.length}\n`);
}

await main();
