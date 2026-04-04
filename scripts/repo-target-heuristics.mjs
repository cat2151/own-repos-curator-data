const EXPLICIT_INDEX_FILE_PATTERN = /^index\.(?:html?|md|markdown)$/i;

function encodePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)));
}

function normalizeComparableText(value) {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractPrimaryPageText(html) {
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const source = bodyMatch?.[1] ?? html;
  const withoutScripts = source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  return decodeHtmlEntities(text).trim();
}

function markdownToComparableLines(markdown) {
  const lines = [];
  let insideFence = false;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (/^(```|~~~)/.test(trimmed)) {
      insideFence = !insideFence;
      continue;
    }

    let line = rawLine
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
      .replace(/`([^`]*)`/g, " $1 ")
      .replace(/^#{1,6}\s*/u, "")
      .replace(/^\s*>+\s*/u, "")
      .replace(/^\s*[-*+]\s+/u, "")
      .replace(/^\s*\d+\.\s+/u, "")
      .replace(/^\s*\|\s*/u, "")
      .replace(/\s*\|\s*$/u, "")
      .replace(/[*_~]/g, "");

    if (!insideFence && /^\s*[:\-|]{3,}\s*$/u.test(line)) {
      continue;
    }

    line = normalizeComparableText(line);
    if (line.length >= 16) {
      lines.push(line);
    }
  }

  return [...new Set(lines)].sort((left, right) => right.length - left.length).slice(0, 16);
}

function scorePageTextAgainstMarkdown(pageText, markdown) {
  if (!markdown) {
    return { matchedChars: 0, matchCount: 0, ratio: 0 };
  }

  const page = normalizeComparableText(pageText);
  const candidateLines = markdownToComparableLines(markdown);
  if (candidateLines.length === 0) {
    return { matchedChars: 0, matchCount: 0, ratio: 0 };
  }

  let matchedChars = 0;
  let matchCount = 0;
  let totalChars = 0;

  for (const line of candidateLines) {
    totalChars += line.length;
    if (page.includes(line)) {
      matchedChars += line.length;
      matchCount += 1;
    }
  }

  return {
    matchedChars,
    matchCount,
    ratio: totalChars > 0 ? matchedChars / totalChars : 0,
  };
}

function extractHrefsFromHtml(html) {
  const hrefs = [];
  const hrefPattern = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  for (let match = hrefPattern.exec(html); match; match = hrefPattern.exec(html)) {
    const href = match[1] ?? match[2] ?? match[3];
    if (href) {
      hrefs.push(decodeHtmlEntities(href.trim()));
    }
  }

  return hrefs;
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl);
  } catch {
    return null;
  }
}

function detectPagesSourceFromHref(href, owner, repoName, baseUrl) {
  const url = resolveUrl(href, baseUrl);
  if (!url || url.hostname.toLowerCase() !== "github.com") {
    return null;
  }

  const pathPattern = new RegExp(
    `^/${owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${repoName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/edit/.+/(?:(?:\\.github|docs)/)?README(?:\\.ja)?\\.md$`,
    "i",
  );
  if (!pathPattern.test(url.pathname)) {
    return null;
  }

  return /README\.ja\.md$/i.test(url.pathname) ? "readme-ja" : "readme-md";
}

function detectPagesSourceFromHtml(html, owner, repoName, pagesUrl) {
  for (const href of extractHrefsFromHtml(html)) {
    const detectedSource = detectPagesSourceFromHref(href, owner, repoName, pagesUrl);
    if (detectedSource) {
      return detectedSource;
    }
  }

  return null;
}

function detectPagesSourceByContent(html, readmeMarkdown, localizedReadmeMarkdown) {
  const pageText = extractPrimaryPageText(html);
  const readmeMdScore = scorePageTextAgainstMarkdown(pageText, readmeMarkdown);
  const readmeJaScore = scorePageTextAgainstMarkdown(pageText, localizedReadmeMarkdown);

  if (
    readmeMdScore.matchCount >= 3 &&
    readmeMdScore.ratio >= 0.45 &&
    readmeMdScore.matchedChars >= Math.max(160, readmeJaScore.matchedChars * 1.5)
  ) {
    return "readme-md";
  }

  if (
    readmeJaScore.matchCount >= 3 &&
    readmeJaScore.ratio >= 0.45 &&
    readmeJaScore.matchedChars >= Math.max(160, readmeMdScore.matchedChars * 1.5)
  ) {
    return "readme-ja";
  }

  return null;
}

export function getRepoTopUrl(owner, repoName) {
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;
}

export function getPagesFallbackUrl(owner, repoName) {
  if (repoName.localeCompare(`${owner}.github.io`, undefined, { sensitivity: "accent" }) === 0) {
    return `https://${owner}.github.io/`;
  }

  return `https://${owner}.github.io/${encodeURIComponent(repoName)}/`;
}

export function getGitHubBlobHeadUrl(owner, repoName, path) {
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/blob/HEAD/${encodePath(path)}`;
}

export function getRawGitHubHeadUrl(owner, repoName, path) {
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/HEAD/${encodePath(path)}`;
}

export function hasExplicitIndexPage(entries) {
  return Array.isArray(entries) && entries.some((entry) =>
    entry.type === "file" &&
    Boolean(entry.name && EXPLICIT_INDEX_FILE_PATTERN.test(entry.name))
  );
}

export function detectPagesSourceKindFromArtifacts({ owner, repoName, pagesUrl, pagesHtml, rootEntries, readmeMarkdown, localizedReadmeMarkdown }) {
  if (hasExplicitIndexPage(rootEntries)) {
    return "other";
  }

  return (
    detectPagesSourceFromHtml(pagesHtml, owner, repoName, pagesUrl) ??
    detectPagesSourceByContent(pagesHtml, readmeMarkdown, localizedReadmeMarkdown) ??
    "other"
  );
}

export function resolveRepoTargetFromArtifacts({ owner, repoName, pagesHtml, rootEntries, readmeMarkdown, localizedReadmeMarkdown }) {
  const repoTopUrl = getRepoTopUrl(owner, repoName);
  const pagesUrl = getPagesFallbackUrl(owner, repoName);
  const localizedReadmeUrl = getGitHubBlobHeadUrl(owner, repoName, "README.ja.md");

  if (pagesHtml) {
    return localizedReadmeMarkdown &&
      detectPagesSourceKindFromArtifacts({
        owner,
        repoName,
        pagesUrl,
        pagesHtml,
        rootEntries,
        readmeMarkdown,
        localizedReadmeMarkdown,
      }) === "readme-md"
      ? localizedReadmeUrl
      : pagesUrl;
  }

  return localizedReadmeMarkdown ? localizedReadmeUrl : repoTopUrl;
}

async function fetchResponse(url, init = {}) {
  try {
    const response = await fetch(url, init);
    return response.ok ? response : null;
  } catch {
    return null;
  }
}

async function fetchText(url, accept = "text/plain,text/html,*/*") {
  const response = await fetchResponse(url, {
    headers: {
      Accept: accept,
    },
  });
  if (!response) {
    return null;
  }

  return await response.text();
}

async function doesUrlExist(url, accept = "text/plain,*/*") {
  return Boolean(await fetchResponse(url, {
    method: "HEAD",
    headers: {
      Accept: accept,
    },
  }));
}

async function getExplicitIndexEntries(owner, repoName) {
  const names = ["index.html", "index.htm", "index.md", "index.markdown"];
  const results = await Promise.all(names.map(async (name) =>
    await doesUrlExist(getRawGitHubHeadUrl(owner, repoName, name)) ? { name, type: "file" } : null
  ));
  return results.filter((entry) => entry !== null);
}

export async function resolveRepoTarget(owner, repoName) {
  const [pagesHtml, rootEntries, readmeMarkdown, localizedReadmeMarkdown] = await Promise.all([
    fetchText(getPagesFallbackUrl(owner, repoName), "text/html,application/xhtml+xml"),
    getExplicitIndexEntries(owner, repoName),
    fetchText(getRawGitHubHeadUrl(owner, repoName, "README.md")),
    fetchText(getRawGitHubHeadUrl(owner, repoName, "README.ja.md")),
  ]);

  return resolveRepoTargetFromArtifacts({
    owner,
    repoName,
    pagesHtml,
    rootEntries,
    readmeMarkdown,
    localizedReadmeMarkdown,
  });
}
