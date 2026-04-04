import * as fs from "fs";
import * as path from "path";

interface Repo {
  name: string;
  description: string;
  url: string;
  stars: number;
}

interface ReposData {
  repos: Repo[];
}

const dataPath = path.join(__dirname, "../data/repos.json");
const outputDir = path.join(__dirname, "../dist");
const outputPath = path.join(outputDir, "index.html");

const data: ReposData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // Fall through to safe fallback.
  }
  return "#";
}

function formatStars(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

const repoItems = data.repos
  .map((repo) => {
    const safeUrl = escapeHtml(sanitizeUrl(String(repo.url)));
    const safeName = escapeHtml(String(repo.name));
    const safeDescription = escapeHtml(String(repo.description));
    const safeStars = escapeHtml(formatStars(repo.stars));

    return `    <li>
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a>
      <span class="description"> — ${safeDescription}</span>
      <span class="stars">⭐ ${safeStars}</span>
    </li>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Own Repos Curator</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    ul { list-style: none; padding: 0; }
    li { margin: 1rem 0; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; }
    a { font-size: 1.1rem; font-weight: bold; color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .description { color: #555; margin-left: 0.5rem; }
    .stars { float: right; color: #e36209; }
  </style>
</head>
<body>
  <h1>Own Repos Curator</h1>
  <ul>
${repoItems}
  </ul>
</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, html, "utf-8");
console.log(`Generated ${outputPath}`);
