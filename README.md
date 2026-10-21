# Clinic Outreach Desk

A simple, single-page tracker for clinic owners you've spoken with. Save each clinic's details, tag them, and set follow-up reminders that alert you when they're due.

## Features

- **Clinic records**: clinic name, clinic type (Dental or Other, with a specialty), person name, number, location, mail and remarks
- **Tags**: create a tag once and use it on any clinic. You can assign one tag to many clinics at once, and renaming, recolouring or deleting a tag updates every clinic that has it
- **Filters**: search across all fields, filter by Dental/Other, filter by one or more tags, and sort by name, last update or next follow-up
- **Follow-up reminders**: set a reminder per clinic with quick picks (in 1 hr, tomorrow 10am, in 3 days, next week) or an exact date and time
- **Alerts**: when a reminder comes due, a pop-up appears with a chime. From the pop-up you can mark it done, snooze it 1 hour or move it to tomorrow
- **Follow-ups view**: reminders grouped into Overdue, Today, Next 7 days, Later and Done
- **Light and dark themes**: follows your system setting. Works on phone and desktop
- **Backup**: export all data to a JSON file, and import it on another device or browser

## Run it

There's no build step and nothing to install.

- **Locally:** open `index.html` in a browser, or serve the folder:
  ```bash
  python3 -m http.server 8000
  # then visit http://localhost:8000
  ```
- **GitHub Pages:** in the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, and save. The app will be live at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## Where data is stored

All data is saved in your browser's `localStorage` on the device you use. Nothing is sent to a server. This means:

- Data doesn't sync between devices or browsers automatically. Use **Export backup** and **Import backup** at the bottom of the page to move it.
- Clearing your browser's site data deletes it, so export a backup regularly.
- Reminders alert you only while the page is open in a tab.

## Project structure

```
index.html        The app: markup, styles and logic
js/local-db.js    Small storage layer (localStorage) plus export/import
```

`js/local-db.js` provides a minimal document-store API (`collection().onSnapshot`, `doc().set / update / delete`). To add cloud sync later (for example Firebase Firestore or Supabase), replace this file with an adapter that exposes the same methods. The app code doesn't need to change.

Data is stored in three collections:

| Collection | Fields |
|---|---|
| `clinics` | `clinicName`, `type` (`Dental`/`Other`), `typeOther`, `person`, `phone`, `email`, `location`, `remarks`, `tagIds[]`, `createdAt`, `updatedAt` |
| `tags` | `name`, `color` (0–5), `createdAt` |
| `tasks` | `clinicId`, `title`, `notes`, `dueMs`, `dueAt` (ISO with offset), `done`, `doneAt`, `createdAt` |
