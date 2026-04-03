# Work Smarter — Project Documentation

## Design Principles

- **Tasks** — sharp, actionable, binary
- **Meetings** — scheduled, time-anchored
- **Notes** — ambient, persistent, low-contrast

---

## Bugs

- [x] CREATE -> Project
- [x] Categories being labeled as projects
- [x] Weekly tracker UI / Task edit button
- [x] Unfinished tasks aren't being returned from API in weekly view
- [x] Not able to associate new task to project
- [x] Recurring tasks seem to be piling up in daily log (fixed in weekly tracker)
- [x] Need to truncate meeting/work on daily log
- [x] Make Type dropdown
- [x] Recurring tasks aren't pre-populated as recurring in edit task form
- [x] Recurring objects not deleting from daily log page
- [x] Logout button doesn't work
- [x] Task index page does not always have access to projects — missing identifiers and blank dropdowns in task edit page
- [x] Task and Meetings do not scroll on weekly tracker page, container just continues to grow to accomodate content
- [x] There is no mitigation of large content on the projects page. If there are many tasks the page just keeps going. Not sure if infinite scroll, pagination or truncation would be the best option here. What do you think?

---

## Tweaks

### Backend
- [x] Update tests for new functionality
- [x] Recurring tasks need bi-weekly and quarterly options
- [x] Users should be able to delete a single recurring task, all recurring tasks or all future recurring tasks
- [x] Daily recurring tasks will need to be able to exclude weekends

### UI
- [x] Make daily recurring tasks/meetings appear as one in weekly tracker (dropdown on click?)
- [x] Implement urgency into UI
- [x] Notes should take a less prominent role in UI (filtered from project view entirely, shown at bottom of tracker page, possibly removed from daily log as well)
- [x] Show page audit
- [x] Implement toast notifications
- [x] Remove redundant "back" buttons
<<<<<<< HEAD
- [ ] Project colors should be assignable by user
- [x] Past meetings should not show in the project page. Current and future meetings should sort (current first to furthest in the future)
- [ ] Notes description should display markdown in weekly tracker page
=======
- [ ] There's currently no way to view a note, we should make them clickable in the weekly tracker
- [ ] Add some padding between the weekly tracker containers (meetings, tasks, notes)
- [ ] Notes description should display markdown in weekly tracker page and be truncated to 2-3 lines per note
- [ ] Project colors should be assignable by user
- [x] Past meetings should not show in the project page. Current and future meetings should sort (current first to furthest in the future)
>>>>>>> dev
- [x] Optimistic UI for toggles (daily log feels instant)
- [ ] Carry-over logic visualization (ghost tasks / "rolled from yesterday")
- [ ] Project → task creation shortcuts (preselect project when creating from project view)
- [ ] Weekly summary header (X done / Y remaining)
- [ ] Micro polish: hover states, subtle transitions, keyboard nav
- [ ] Recurrence badges ("weekly", "ongoing")
- [ ] Project-scoped tags
- [ ] "Seen this week" indicators
- [ ] Collapsible "Background reminders" section — visual distinction only, no behavior yet
- [ ] Add dark mode

---

## Features

- [x] Add recurring tasks/events (meetings)
- [x] Meetings auto-done after day-of (frontend and backend)
- [ ] Meetings should have a time
- [ ] Implement deadlines
- [ ] Add bi-weekly schedule to recurring events
- [ ] Integration with Google Calendar
- [ ] Resume features
- [ ] AI resume analysis


## User-facing (go-live features)

- [ ] Account show/edit page
- [ ] Beef up account security
- [ ] Tutorial section
- [ ] About page
