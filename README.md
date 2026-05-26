# Range Buffs

Range Buffs is a first-pass Alt1-style ranged combat tracker for RuneScape 3. It starts as a static web app so it can be opened in a normal browser while the Alt1 screen-reading pieces are developed.

## What is built

- Ranged readiness dashboard for Death's Swiftness, Split Soul, Imbue Shadows, Galeshot, Rapid Fire, BoLG, Deathspore arrows, and Overload.
- Combo prompt logic for Galeshot into Rapid Fire.
- Manual test controls so the overlay can be tuned before real icon detection exists.
- Saved scan-region fields for buff bar and action bar calibration.
- Alt1 app metadata in `appconfig.json`.

## Next steps

1. Collect cropped icon screenshots from your exact action bar and buff bar.
2. Replace the manual state toggles with Alt1 pixel/template detection.
3. Add cooldown/duration constants that match your in-game setup.
4. Host the folder and install it in Alt1 with an `alt1://addapp/.../appconfig.json` URL.

Alt1 apps are webpages running in the Alt1 overlay browser, and the RuneApps developer notes recommend HTML, CSS, JavaScript, and the Alt1 library for capture and image detection.

## Hosting on GitHub Pages

1. Create a public GitHub repository named `range-buffs`.
2. Upload every file in this folder to the repository root.
3. In the GitHub repository, go to Settings > Pages.
4. Set the source to deploy from the `main` branch and `/root` folder.
5. After GitHub Pages publishes, install with:

```text
alt1://addapp/https://bgore89-cell.github.io/range-buffs/appconfig.json
```

The hosted app should be available at `https://bgore89-cell.github.io/range-buffs/`.
