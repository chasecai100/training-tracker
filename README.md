# Training Tracker

A gym logging web app for iPhone and PC. Every set goes into a Google Sheet ("Training Log") for analysis in Excel.

- App: https://chasecai100.github.io/training-tracker/
- `docs/`: the web app (served by GitHub Pages)
- `apps-script/Code.gs`: the script inside the Training Log sheet that receives sets
- `PLAN.md`: what the app does and why

No build step: edit the files in `docs/` and push. When you change any file in `docs/`, bump `CACHE` in `docs/sw.js` so phones pick up the new version.

The icon is drawn in `docs/icon.svg`. The PNG icons are rendered from it with headless Edge.

After changing `apps-script/Code.gs`, paste it into the sheet's script editor, then choose Deploy > Manage deployments > edit > New version. That keeps the same address.
