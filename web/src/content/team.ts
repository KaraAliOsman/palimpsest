// The team, as it should appear on the About page. This is the one place to edit.
// Add one entry per person, in the order they should be listed; the page shows only what is filled in.
//   { name: "Ada Lovelace", role: "Pipeline and statistics", affiliation: "University of …", url: "https://…" }
export interface TeamMember { name: string; role?: string; affiliation?: string; url?: string }

export const TEAM_NAME = "Team Palimpsest · EthnoHack 2026";

export const TEAM: TeamMember[] = [];
