// Deterministic fake account so the display can be previewed without a token.

export function demoUser(now = new Date()) {
  let seed = 35; // R35
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const days = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const recent = i < 12; // a live 12-day streak
    const count = recent ? 1 + Math.floor(rand() * 9) : rand() < 0.45 ? 0 : Math.floor(rand() * 7);
    days.push({ date: d.toISOString().slice(0, 10), contributionCount: i === 12 ? 0 : count });
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) });

  const lang = (name, color, size) => ({ size, node: { name, color } });
  const hoursAgo = (h) => new Date(now - h * 3600e3).toISOString();

  return {
    login: "demo-driver",
    name: "Demo Driver",
    contributionsCollection: { contributionCalendar: { totalContributions: 0, weeks } },
    repositories: {
      nodes: [
        { name: "supremetides", isArchived: false, issues: { totalCount: 4 },
          languages: { edges: [lang("TypeScript", "#3178c6", 420000), lang("CSS", "#663399", 60000)] } },
        { name: "embedded-labs", isArchived: false, issues: { totalCount: 1 },
          languages: { edges: [lang("C", "#555555", 210000)] } },
        { name: "faultclaw", isArchived: false, issues: { totalCount: 3 },
          languages: { edges: [lang("Python", "#3572A5", 260000)] } },
        { name: "gtr-mfd", isArchived: false, issues: { totalCount: 2 },
          languages: { edges: [lang("JavaScript", "#f1e05a", 40000)] } },
      ],
    },
    merged: {
      nodes: [
        { title: "Add lap timer page", mergedAt: hoursAgo(19), repository: { name: "gtr-mfd" } },
        { title: "Fix checkout tax", mergedAt: hoursAgo(19 + 53), repository: { name: "supremetides" } },
        { title: "Fuzz harness", mergedAt: hoursAgo(19 + 53 + 31), repository: { name: "faultclaw" } },
        { title: "Lab 6 bounce", mergedAt: hoursAgo(19 + 53 + 31 + 98), repository: { name: "embedded-labs" } },
        { title: "Product grid", mergedAt: hoursAgo(19 + 53 + 31 + 98 + 44), repository: { name: "supremetides" } },
        { title: "Initial", mergedAt: hoursAgo(19 + 53 + 31 + 98 + 44 + 140), repository: { name: "supremetides" } },
      ],
    },
    open: { totalCount: 3 },
  };
}
