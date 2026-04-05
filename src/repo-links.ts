import type { RepoEntry, ReposData } from "./types";

const OWNER_PATTERNS = [
  /(?:https?:\/\/)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)(?:\/|$)/i,
  /(?:https?:\/\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\.github\.io(?:\/|$)/i,
] as const;

function findOwnerInText(value: string): string | null {
  for (const pattern of OWNER_PATTERNS) {
    const match = pattern.exec(value);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function getBrowserLocationText(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  return [window.location.href, window.location.hostname];
}

function getConfiguredOwner(): string | null {
  const configuredOwner = __SITE_GITHUB_OWNER__.trim();
  return configuredOwner.length > 0 ? configuredOwner : null;
}

export function getRepoLinkUrl(repo: Pick<RepoEntry, "url">): string | null {
  const url = repo.url?.trim();
  return url && url.length > 0 ? url : null;
}

export function resolveOwner(data: ReposData): string | null {
  const explicitOwner = data.meta.owner?.trim();
  if (explicitOwner) {
    return explicitOwner;
  }

  const configuredOwner = getConfiguredOwner();
  if (configuredOwner) {
    return configuredOwner;
  }

  const candidates = [JSON.stringify(data), ...getBrowserLocationText()];
  for (const candidate of candidates) {
    const owner = findOwnerInText(candidate);
    if (owner) {
      return owner;
    }
  }

  return null;
}
