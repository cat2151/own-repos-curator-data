import { resolveOwner, resolvePreferredRepoUrl } from "./repo-links";
import type { ReposData } from "./types";

export interface RepoLinkNavigator {
  openResolvedRepoLink(link: HTMLAnchorElement): Promise<void>;
}

function openInNewTab(href: string): void {
  window.open(href, "_blank", "noopener,noreferrer");
}

function openPendingRepoTab(repoName: string): Window | null {
  const openedTab = window.open("about:blank", "_blank");
  if (!openedTab) {
    return null;
  }

  try {
    openedTab.document.title = `Opening ${repoName}`;
    openedTab.document.body.textContent = `Opening ${repoName}...`;
  } catch {
    // Ignore same-origin access failures and continue with the navigation fallback.
  }

  return openedTab;
}

export function createRepoLinkNavigator(getCurrentData: () => ReposData): RepoLinkNavigator {
  async function openResolvedRepoLink(link: HTMLAnchorElement): Promise<void> {
    const repoName = link.dataset.openRepo?.trim();
    if (!repoName) {
      openInNewTab(link.href);
      return;
    }

    const owner = resolveOwner(getCurrentData());
    if (!owner) {
      openInNewTab(link.href);
      return;
    }

    const openedTab = openPendingRepoTab(repoName);
    if (!openedTab) {
      openInNewTab(link.href);
      return;
    }

    let destination = link.href;

    try {
      destination = await resolvePreferredRepoUrl(owner, repoName);
    } finally {
      try {
        openedTab.opener = null;
      } catch {
        // Ignore browsers that expose opener as read-only here.
      }

      openedTab.location.replace(destination);
    }
  }

  return { openResolvedRepoLink };
}
