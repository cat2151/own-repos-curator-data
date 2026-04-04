import { execSync } from "node:child_process";
import { defineConfig } from "vite";

const REMOTE_OWNER_PATTERNS = [
  /github\.com[:/]([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\//i,
] as const;

function parseOwnerFromRemoteUrl(value: string): string {
  for (const pattern of REMOTE_OWNER_PATTERNS) {
    const match = pattern.exec(value);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function resolveSiteGitHubOwner(): string {
  const configuredOwner = process.env.VITE_GITHUB_OWNER?.trim() || process.env.GITHUB_OWNER?.trim();
  if (configuredOwner) {
    return configuredOwner;
  }

  try {
    const remoteUrl = execSync("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return parseOwnerFromRemoteUrl(remoteUrl);
  } catch {
    return "";
  }
}

export default defineConfig({
  base: "./",
  define: {
    __SITE_GITHUB_OWNER__: JSON.stringify(resolveSiteGitHubOwner()),
  },
});
