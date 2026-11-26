-- Icons of the outlets a relaying source (a news search feed) passes on, by the host of their reports:
-- cards name the outlet, not the search, and show its icon (sources/icons.ts refreshOutletIcons).
CREATE TABLE IF NOT EXISTS outlet_icons (
  host text PRIMARY KEY,
  icon_url text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
