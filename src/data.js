// Fetches a user's public GitHub activity and turns it into the numbers the MFD shows.

const QUERY = `
query($login: String!) {
  user(login: $login) {
    login
    name
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes {
        name
        isArchived
        issues(states: OPEN) { totalCount }
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name color } }
        }
      }
    }
    merged: pullRequests(first: 50, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { title mergedAt repository { name } }
    }
    open: pullRequests(states: OPEN) { totalCount }
  }
}`;

export async function fetchUser(login, token) {
  if (!token) throw new Error("GITHUB_TOKEN is not set. The GraphQL API needs a token, even for public data.");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "gtr-mfd",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data.user) throw new Error(`No GitHub user named "${login}".`);
  return json.data.user;
}

// Turn the raw API response into display metrics. `now` is injectable for tests and demo mode.
export function computeMetrics(user, now = new Date()) {
  const days = user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => d.date <= isoDate(now))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Current streak: an empty today doesn't break it, since the day isn't over.
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  let streak = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) streak++;

  let longest = 0, run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  const sum = (arr) => arr.reduce((s, d) => s + d.contributionCount, 0);
  const last7 = days.slice(-7);
  const last30 = sum(days.slice(-30));
  const yearTotal = sum(days);
  const dailyAvg = days.length ? yearTotal / days.length : 0;
  // Fuel: how the last 30 days compare with your own yearly pace. 100% = on pace.
  const fuel = dailyAvg > 0 ? last30 / (dailyAvg * 30) : 0;

  const repos = user.repositories.nodes.filter((r) => !r.isArchived);
  const openIssues = repos.reduce((s, r) => s + r.issues.totalCount, 0);

  const langBytes = new Map();
  for (const r of repos) {
    for (const e of r.languages.edges) {
      const cur = langBytes.get(e.node.name) || { name: e.node.name, color: e.node.color || "#8b949e", size: 0 };
      cur.size += e.size;
      langBytes.set(e.node.name, cur);
    }
  }
  const totalBytes = [...langBytes.values()].reduce((s, l) => s + l.size, 0) || 1;
  const languages = [...langBytes.values()]
    .sort((a, b) => b.size - a.size)
    .slice(0, 4)
    .map((l) => ({ name: l.name, color: l.color, pct: l.size / totalBytes }));

  const merges = user.merged.nodes
    .filter((p) => p.mergedAt)
    .map((p) => ({ title: p.title, repo: p.repository.name, at: new Date(p.mergedAt) }))
    .sort((a, b) => b.at - a.at);
  // Each merged PR is a crossing of the line; a lap is the time between two crossings.
  const laps = [];
  for (let k = 0; k < merges.length - 1 && laps.length < 5; k++) {
    laps.push({ repo: merges[k].repo, title: merges[k].title, ms: merges[k].at - merges[k + 1].at });
  }
  const bestLap = laps.length ? Math.min(...laps.map((l) => l.ms)) : null;
  const sinceLastMerge = merges.length ? now - merges[0].at : null;

  return {
    login: user.login,
    name: user.name || user.login,
    streak,
    longest,
    week: sum(last7),
    week7: last7.map((d) => d.contributionCount),
    yearTotal,
    fuel,
    openIssues,
    openPRs: user.open.totalCount,
    languages,
    laps,
    bestLap,
    sinceLastMerge,
    mergedCount: merges.length,
    updated: now,
  };
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
