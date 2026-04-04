import { describe, expect, it } from "vitest";

import { getGitHubBlobHeadUrl, getPagesFallbackUrl, resolveRepoTargetFromArtifacts } from "./repo-target-heuristics.mjs";

describe("repo target heuristics", () => {
  it("keeps GitHub Pages when an explicit index.html exists", () => {
    const owner = "cat2151";
    const repoName = "own-repos-curator-data";

    expect(resolveRepoTargetFromArtifacts({
      owner,
      repoName,
      pagesHtml: `<!DOCTYPE html><html lang="ja"><head><title>repositories</title></head><body><div id="app"></div></body></html>`,
      rootEntries: [{ name: "index.html", type: "file" }],
      readmeMarkdown: "# own-repos-curator-data\n\nThis is a static site for visualizing repos.json.",
      localizedReadmeMarkdown: "# own-repos-curator-data\n\n`repos.json` を可視化する静的サイトです。",
    })).toBe(getPagesFallbackUrl(owner, repoName));
  });

  it("detects README.md-derived GitHub Pages from an edit link", () => {
    const owner = "cat2151";
    const repoName = "cat-self-update";

    expect(resolveRepoTargetFromArtifacts({
      owner,
      repoName,
      pagesHtml: `<!DOCTYPE html><html lang="en-US"><body><div class="markdown-body"><h1>cat-self-update</h1><p>Currently dogfooding.</p><a href="https://github.com/cat2151/cat-self-update/edit/main/README.md">Improve this page</a></div></body></html>`,
      rootEntries: [],
      readmeMarkdown: "# cat-self-update\n\n## Status\nCurrently dogfooding.",
      localizedReadmeMarkdown: "# cat-self-update\n\n## 状況\nドッグフーディング中です。",
    })).toBe(getGitHubBlobHeadUrl(owner, repoName, "README.ja.md"));
  });

  it("detects README.md-derived custom theme Pages by content match", () => {
    const owner = "cat2151";
    const repoName = "claude-chat-code";

    expect(resolveRepoTargetFromArtifacts({
      owner,
      repoName,
      pagesHtml: `<!DOCTYPE html><html lang="en-US"><body><div id="header_wrap"><a href="https://github.com/cat2151/claude-chat-code">View on GitHub</a></div><section id="main_content"><h1>claude-chat-code</h1><p>A Windows TUI that monitors for zip file downloads from Claude chat, then automatically builds and launches the code. Written in Rust.</p><h2>Installation</h2><p>Rust is required.</p><pre><code>cargo install --force --git https://github.com/cat2151/claude-chat-code</code></pre><h2>Challenges and Solutions</h2><p>When generating or modifying code with Claude chat, the following steps were traditionally required every time:</p><ol><li>Download the zip from Claude chat.</li><li>Back up the working directory.</li><li>Delete old files.</li></ol></section></body></html>`,
      rootEntries: [{ name: "_config.yml", type: "file" }],
      readmeMarkdown: `# claude-chat-code

A Windows TUI that monitors for zip file downloads from Claude chat, then automatically builds and launches the code. Written in Rust.

## Installation

Rust is required.

\`\`\`powershell
cargo install --force --git https://github.com/cat2151/claude-chat-code
\`\`\`

## Challenges and Solutions

When generating or modifying code with Claude chat, the following steps were traditionally required every time:

1. Download the zip from Claude chat.
2. Back up the working directory.
3. Delete old files.`,
      localizedReadmeMarkdown: `# claude-chat-code

Claude chat からzipダウンロードしたか監視して自動ビルドと起動をする Windows 用 TUI 。Rustで書かれています。

## インストール

Rustが必要です。`,
    })).toBe(getGitHubBlobHeadUrl(owner, repoName, "README.ja.md"));
  });
});
