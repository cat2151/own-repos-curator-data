import type { RepoEntry, ReposData } from "./types";

export interface RenderOptions {
  activeTags: string[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return match ? match[0] : value;
}

function differenceInDays(start: Date, end: Date): number {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.floor((utcEnd - utcStart) / 86_400_000));
}

function differenceInCalendarMonths(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

function formatAge(value: string, now: Date): string {
  const datePart = formatDate(value);
  const parsed = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return datePart;
  }

  const days = differenceInDays(parsed, now);
  if (days === 0) {
    return "today";
  }

  if (days < 31) {
    return `${days}d`;
  }

  const months = differenceInCalendarMonths(parsed, now);
  if (months < 12) {
    return `${months}m`;
  }

  return `${Math.floor(months / 12)}y`;
}

function renderFilterTagButton(tag: string, activeTags: string[], isDisabled = false): string {
  const isActive = activeTags.includes(tag);
  return `<button class="tag tag-button${isActive ? " is-active" : ""}${isDisabled ? " is-disabled" : ""}" type="button" data-filter-tag="${escapeHtml(tag)}" aria-pressed="${isActive ? "true" : "false"}"${isDisabled ? ' disabled aria-disabled="true"' : ""}>${escapeHtml(tag)}</button>`;
}

function renderTags(tags: string[], activeTags: string[]): string {
  if (tags.length === 0) {
    return `<span class="tag tag-empty">tagなし</span>`;
  }

  return tags.map((tag) => renderFilterTagButton(tag, activeTags)).join("");
}

function pickSummary(repo: RepoEntry): string {
  const shortDesc = repo.desc_short.trim();
  if (shortDesc.length > 0) {
    return shortDesc;
  }

  const githubDesc = repo.github_desc.trim();
  if (githubDesc.length > 0) {
    return githubDesc;
  }

  const firstLongLine = repo.desc_long
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLongLine ?? "";
}

function renderRepoCard(repo: RepoEntry, activeTags: string[], now: Date): string {
  const summary = pickSummary(repo);
  const detail = repo.desc_long.trim();

  return `    <li class="repo-card">
      <div class="repo-card-header">
        <h2>${escapeHtml(repo.name)}</h2>
        <p class="repo-dates">created ${escapeHtml(formatAge(repo.created_at, now))} / updated ${escapeHtml(formatAge(repo.updated_at, now))}</p>
      </div>
      <p class="repo-summary">${escapeHtml(summary || "説明なし")}</p>
      <div class="repo-tags">${renderTags(repo.tags, activeTags)}</div>
      ${
        detail.length > 0
          ? `<details class="repo-detail">
        <summary>desc_long</summary>
        <pre>${escapeHtml(detail)}</pre>
      </details>`
          : ""
      }
    </li>`;
}

function filterReposByTags(repos: RepoEntry[], activeTags: string[]): RepoEntry[] {
  return activeTags.length === 0
    ? repos
    : repos.filter((repo) => activeTags.every((tag) => repo.tags.includes(tag)));
}

function renderRegisteredTags(tags: string[], repos: RepoEntry[], activeTags: string[]): string {
  return tags
    .map((tag) => {
      const isDisabled =
        !activeTags.includes(tag) && filterReposByTags(repos, [...activeTags, tag]).length === 0;
      return renderFilterTagButton(tag, activeTags, isDisabled);
    })
    .join("");
}

export function renderApp(data: ReposData, options: RenderOptions = { activeTags: [] }): string {
  const { activeTags } = options;
  const now = new Date();
  const filteredRepos = filterReposByTags(data.repos, activeTags);
  const registeredTags = renderRegisteredTags(data.registered_tags, data.repos, activeTags);
  const filterNote =
    activeTags.length === 0
      ? `<p class="filter-note">tags をクリックすると、選択したすべての tag を含む repo だけに絞り込みます。0件になる tag は押せません。</p>`
      : `<div class="filter-bar">
        <p class="filter-note">filter: <strong>${escapeHtml(activeTags.join(" AND "))}</strong> を含む repo のみ表示中</p>
        <button class="tag tag-button tag-clear-button" type="button" data-clear-tag-filter="true">フィルタ解除</button>
      </div>`;

  const repoItems = filteredRepos.map((repo) => renderRepoCard(repo, activeTags, now)).join("\n");

  return `  <main>
    <section class="hero">
      <h1>own-repos-curator-data</h1>
      <p>repos.json の内容をそのまま見えるようにした最小ビューです。</p>
      <div class="meta-list">
        <div>repos: ${escapeHtml(String(filteredRepos.length))}${activeTags.length === 0 ? "" : ` / ${escapeHtml(String(data.repos.length))}`}</div>
        <div>tags: ${escapeHtml(String(data.registered_tags.length))}</div>
        <div>github_desc_updated_at: ${escapeHtml(formatAge(data.meta.github_desc_updated_at, now))}</div>
        <div>last_json_commit_push_date: ${escapeHtml(formatAge(data.meta.last_json_commit_push_date, now))}</div>
      </div>
    </section>

    <section class="section">
      <h2>tags</h2>
      ${filterNote}
      <div class="tag-row">
        ${registeredTags}
      </div>
    </section>

    <section class="section">
      <h2>repos</h2>
      ${activeTags.length === 0 ? "" : `<p class="filter-note">selected tags: <strong>${escapeHtml(activeTags.join(", "))}</strong> / matched repos: ${escapeHtml(String(filteredRepos.length))}</p>`}
      ${
        filteredRepos.length > 0
          ? `<ul class="repo-list">
${repoItems}
      </ul>`
          : `<p class="empty-note">表示できる repo がありません。</p>`
      }
    </section>
  </main>`;
}
