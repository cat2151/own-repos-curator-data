import { describe, expect, it } from "vitest";

import { renderApp } from "./render";
import type { ReposData } from "./types";

function listRenderedGroupTabs(markup: string): string[] {
  return [...markup.matchAll(/class="group-tab(?: is-active)?".*?data-filter-group="([^"]+)"/gs)].map(
    ([, group]) => group,
  );
}

describe("renderApp group tabs", () => {
  it("sorts group tabs by repo count descending", () => {
    const data: ReposData = {
      meta: {
        github_desc_updated_at: "2026-04-01",
        last_json_commit_push_date: "2026-04-01",
        owner: "cat2151",
      },
      registered_tags: [],
      registered_groups: ["alpha", "beta", "gamma"],
      repos: [
        {
          name: "repo-1",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "alpha",
          tags: [],
        },
        {
          name: "repo-2",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "beta",
          tags: [],
        },
        {
          name: "repo-3",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "beta",
          tags: [],
        },
        {
          name: "repo-4",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "beta",
          tags: [],
        },
        {
          name: "repo-5",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "gamma",
          tags: [],
        },
        {
          name: "repo-6",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "alpha",
          tags: [],
        },
      ],
    };

    expect(listRenderedGroupTabs(renderApp(data))).toEqual(["all", "beta", "alpha", "gamma"]);
  });

  it("falls back to alphabetical order when counts are equal", () => {
    const data: ReposData = {
      meta: {
        github_desc_updated_at: "2026-04-01",
        last_json_commit_push_date: "2026-04-01",
        owner: "cat2151",
      },
      registered_tags: [],
      registered_groups: ["zeta", "alpha"],
      repos: [
        {
          name: "repo-1",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "zeta",
          tags: [],
        },
        {
          name: "repo-2",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "alpha",
          tags: [],
        },
      ],
    };

    expect(listRenderedGroupTabs(renderApp(data))).toEqual(["all", "alpha", "zeta"]);
  });

  it("keeps etc and stub at the end", () => {
    const data: ReposData = {
      meta: {
        github_desc_updated_at: "2026-04-01",
        last_json_commit_push_date: "2026-04-01",
        owner: "cat2151",
      },
      registered_tags: [],
      registered_groups: ["alpha", "beta", "etc", "stub"],
      repos: [
        {
          name: "repo-1",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "alpha",
          tags: [],
        },
        {
          name: "repo-2",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "beta",
          tags: [],
        },
        {
          name: "repo-3",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "beta",
          tags: [],
        },
        {
          name: "repo-4",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "etc",
          tags: [],
        },
        {
          name: "repo-5",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "etc",
          tags: [],
        },
        {
          name: "repo-6",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "etc",
          tags: [],
        },
        {
          name: "repo-7",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "stub",
          tags: [],
        },
        {
          name: "repo-8",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "stub",
          tags: [],
        },
        {
          name: "repo-9",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "stub",
          tags: [],
        },
        {
          name: "repo-10",
          created_at: "2026-04-01",
          updated_at: "2026-04-01",
          github_desc: "",
          desc_short: "",
          desc_long: "",
          group: "stub",
          tags: [],
        },
      ],
    };

    expect(listRenderedGroupTabs(renderApp(data))).toEqual(["all", "beta", "alpha", "etc", "stub"]);
  });
});
