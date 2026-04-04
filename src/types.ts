export interface RepoMeta {
  github_desc_updated_at: string;
  last_json_commit_push_date: string;
}

export interface RepoEntry {
  name: string;
  created_at: string;
  updated_at: string;
  github_desc: string;
  desc_short: string;
  desc_long: string;
  group?: string;
  tags: string[];
}

export interface ReposData {
  meta: RepoMeta;
  registered_tags: string[];
  registered_groups?: string[];
  repos: RepoEntry[];
}
