import type { RepoEntry, ReposData } from "./types";

export interface RenderOptions {
  activeTags: string[];
  activeGroup: string | null;
  isHelpOpen: boolean;
}

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

export function getAppTitle(data: ReposData): string {
  const candidates = [JSON.stringify(data), ...getBrowserLocationText()];

  for (const candidate of candidates) {
    const owner = findOwnerInText(candidate);
    if (owner) {
      return `${owner}'s repositories`;
    }
  }

  return "repositories";
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

function renderGroupTabButton(group: string | null, count: number, activeGroup: string | null): string {
  const isActive = activeGroup === group;
  const value = group ?? "all";
  const label = group ?? "all";

  return `<button class="group-tab${isActive ? " is-active" : ""}" type="button" role="tab" tabindex="${isActive ? "0" : "-1"}" data-filter-group="${escapeHtml(value)}" aria-controls="group-tabpanel" aria-selected="${isActive ? "true" : "false"}">
    <span class="group-tab-label">${escapeHtml(label)}</span>
    <span class="group-tab-count">${escapeHtml(String(count))}</span>
  </button>`;
}

function renderGroupBadge(group: string): string {
  return `<button class="group-badge group-badge-button" type="button" data-filter-group="${escapeHtml(group)}" aria-label="${escapeHtml(`${group} group を表示`)}">${escapeHtml(group)}</button>`;
}

function renderTags(tags: string[], activeTags: string[]): string {
  if (tags.length === 0) {
    return "";
  }

  return tags.map((tag) => renderFilterTagButton(tag, activeTags)).join("");
}

function getRepoGroup(repo: RepoEntry): string {
  const normalized = repo.group?.trim();
  return normalized && normalized.length > 0 ? normalized : "ungrouped";
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

function renderRepoCard(
  repo: RepoEntry,
  activeTags: string[],
  now: Date,
  showGroupBadge: boolean,
): string {
  const summary = pickSummary(repo);
  const detail = repo.desc_long.trim();
  const group = getRepoGroup(repo);

  return `    <li class="repo-card">
      <div class="repo-card-header">
        <div class="repo-title-block">
          <h2>${escapeHtml(repo.name)}</h2>
          ${showGroupBadge ? renderGroupBadge(group) : ""}
        </div>
        <p class="repo-dates">created ${escapeHtml(formatAge(repo.created_at, now))} / updated ${escapeHtml(formatAge(repo.updated_at, now))}</p>
      </div>
      <p class="repo-summary">${escapeHtml(summary || "説明なし")}</p>
      ${repo.tags.length > 0 ? `<div class="repo-tags">${renderTags(repo.tags, activeTags)}</div>` : ""}
      ${
        detail.length > 0
          ? `<details class="repo-detail">
        <summary>3行で説明</summary>
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

function filterReposByGroup(repos: RepoEntry[], activeGroup: string | null): RepoEntry[] {
  return activeGroup === null ? repos : repos.filter((repo) => getRepoGroup(repo) === activeGroup);
}

function collectGroupCounts(repos: RepoEntry[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const repo of repos) {
    const group = getRepoGroup(repo);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  return counts;
}

function listAvailableGroups(data: ReposData): Array<{ name: string; count: number }> {
  const counts = collectGroupCounts(data.repos);
  const orderedNames = new Set<string>(data.registered_groups ?? []);

  for (const name of counts.keys()) {
    orderedNames.add(name);
  }

  return [...orderedNames]
    .map((name) => ({ name, count: counts.get(name) ?? 0 }))
    .filter((entry) => entry.count > 0);
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

function renderHelpPanel(isHelpOpen: boolean): string {
  return `<div class="hero-help" id="help-panel"${isHelpOpen ? "" : " hidden"}>
      <p class="hero-help-intro">repos.json の内容をそのまま見えるようにした最小ビューです。</p>
      <div class="hero-help-grid">
        <div class="hero-help-block">
          <p class="hero-help-label">browse</p>
          <ul class="hero-help-list">
            <li>上段の tab で group を切り替えます。左端の <code>all</code> は全件表示です。入り切らないときは左右ボタンか左右矢印キーで移動できます。</li>
            <li><code>all</code> 表示では repo カード上の group 名を押しても、その group に移動できます。</li>
            <li>group を切り替えると、選択中の tag は自動で解除されます。</li>
          </ul>
        </div>
        <div class="hero-help-block">
          <p class="hero-help-label">tags</p>
          <ul class="hero-help-list">
            <li>tag は現在の group 内で AND 条件として絞り込みます。</li>
            <li>0件になる tag は押せません。解除は「フィルタ解除」です。</li>
          </ul>
        </div>
        <div class="hero-help-block">
          <p class="hero-help-label">repos</p>
          <ul class="hero-help-list">
            <li>カードには概要、tag、作成日と更新日の相対表示を出しています。</li>
            <li>「3行で説明」を開くと長文説明を確認できます。</li>
          </ul>
        </div>
      </div>
    </div>`;
}

export function renderApp(
  data: ReposData,
  options: RenderOptions = { activeTags: [], activeGroup: null, isHelpOpen: false },
): string {
  const { activeGroup, activeTags, isHelpOpen } = options;
  const now = new Date();
  const appTitle = getAppTitle(data);
  const availableGroups = listAvailableGroups(data);
  const groupScopedRepos = filterReposByGroup(data.repos, activeGroup);
  const filteredRepos = filterReposByTags(groupScopedRepos, activeTags);
  const visibleTags = data.registered_tags.filter((tag) =>
    groupScopedRepos.some((repo) => repo.tags.includes(tag)),
  );
  const registeredTags = renderRegisteredTags(visibleTags, groupScopedRepos, activeTags);
  const activeGroupLabel = activeGroup ?? "all";
  const filterStatus =
    activeTags.length === 0
      ? ""
      : `<div class="filter-bar">
        <p class="filter-note">group: <strong>${escapeHtml(activeGroupLabel)}</strong> / tags: <strong>${escapeHtml(activeTags.join(" AND "))}</strong></p>
        <button class="tag tag-button tag-clear-button" type="button" data-clear-tag-filter="true">フィルタ解除</button>
      </div>`;

  const groupTabs = [
    renderGroupTabButton(null, data.repos.length, activeGroup),
    ...availableGroups.map((entry) => renderGroupTabButton(entry.name, entry.count, activeGroup)),
  ].join("\n");
  const repoItems = filteredRepos
    .map((repo) => renderRepoCard(repo, activeTags, now, activeGroup === null))
    .join("\n");

  return `  <main>
    <section class="hero">
      <div class="hero-header">
        <div class="hero-copy">
          <h1>${escapeHtml(appTitle)}</h1>
        </div>
        <button class="guide-toggle${isHelpOpen ? " is-open" : ""}" type="button" data-help-toggle="true" aria-expanded="${isHelpOpen ? "true" : "false"}" aria-controls="help-panel" aria-label="${isHelpOpen ? "操作説明を閉じる" : "操作説明を開く"}">
          <span class="guide-toggle-bars" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>
      ${renderHelpPanel(isHelpOpen)}
      <div class="meta-list">
        <div>visible repos: ${escapeHtml(String(filteredRepos.length))}</div>
        <div>scope: ${escapeHtml(activeGroupLabel)}</div>
        <div>groups: ${escapeHtml(String(availableGroups.length))}</div>
        <div>tags in scope: ${escapeHtml(String(visibleTags.length))}</div>
        <div>github_desc_updated_at: ${escapeHtml(formatAge(data.meta.github_desc_updated_at, now))}</div>
        <div>last_json_commit_push_date: ${escapeHtml(formatAge(data.meta.last_json_commit_push_date, now))}</div>
      </div>
    </section>

    <section class="section tabbed-section">
      <h2>browse</h2>
      <div class="group-tab-strip" data-group-tab-strip="true">
        <button class="group-tab-scroll" type="button" data-scroll-group-tabs="previous" aria-label="前の group を表示" aria-controls="group-tablist">
          <span class="group-tab-scroll-icon" aria-hidden="true">&lt;</span>
        </button>
        <div class="group-tab-viewport">
          <div class="group-tab-row" id="group-tablist" role="tablist" aria-label="repo groups" aria-orientation="horizontal">
            ${groupTabs}
          </div>
        </div>
        <button class="group-tab-scroll" type="button" data-scroll-group-tabs="next" aria-label="次の group を表示" aria-controls="group-tablist">
          <span class="group-tab-scroll-icon" aria-hidden="true">&gt;</span>
        </button>
      </div>
      <div class="tab-panel" id="group-tabpanel" role="tabpanel">
        <div class="panel-block">
          <h3>tags</h3>
          ${filterStatus}
          ${
            visibleTags.length > 0
              ? `<div class="tag-row">
        ${registeredTags}
      </div>`
              : `<p class="empty-note">この group には tag 付き repo がありません。</p>`
          }
        </div>
        <div class="panel-block">
          <h3>repos</h3>
          ${
            activeGroup === null && activeTags.length === 0
              ? ""
              : `<p class="filter-note">scope: <strong>${escapeHtml(activeGroupLabel)}</strong> / matched repos: ${escapeHtml(String(filteredRepos.length))}${activeTags.length === 0 ? "" : ` / selected tags: <strong>${escapeHtml(activeTags.join(", "))}</strong>`}</p>`
          }
          ${
            filteredRepos.length > 0
              ? `<ul class="repo-list">
${repoItems}
      </ul>`
              : `<p class="empty-note">表示できる repo がありません。</p>`
          }
        </div>
      </div>
    </section>
  </main>`;
}
