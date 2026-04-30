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
- [x] Logout requests take about 2 minutes to resolve on staging
- [x] Logout button should always log users out and redirect to home page
- [x] Redundant copy on projects page at the top of meetings and tasks containers
- [x] Meetings are marked complete about 4 hours too early
- [x] Marking parent task as done should also mark children as done
- [x] Weird daily "Home" meeting keeps being imported even though I can't see it in my google calendar. Should check code for anything suspicious
- [x] Meetings that should be recurring aren't imported as recurring, but as individual events
- [x] Meeting should only show time in daily view
- [x] Dark mode not applied in all forms (create)
- [x] Back buttons on show pages and import page redundant, no back button (or dashboard button) on daily log or weekly tracker page
- [x] Meeting project color is not visible because there is not enough room, also meeting time wraps onto next line - there's basically not enough space for all of the information being displayed for meetings on the daily log page

---

## Tweaks

### Backend
- [x] Recurring tasks need bi-weekly and quarterly options
- [x] Users should be able to delete a single recurring task, all recurring tasks or all future recurring tasks
- [x] Daily recurring tasks will need to be able to exclude weekends
- [x] Is there a programmatic way to automatically assign imported google calendar meetings to projects?
- [x] Add status to project (indicates whether still active or complete)
- [x] Add description to project
- [x] Add role to project
- [ ] Allow encryption for notes

### UI
- [x] Make daily recurring tasks/meetings appear as one in weekly tracker (dropdown on click?)
- [x] Implement urgency into UI
- [x] Notes should take a less prominent role in UI (filtered from project view entirely, shown at bottom of tracker page, possibly removed from daily log as well)
- [x] Show page audit
- [x] Implement toast notifications
- [x] Remove redundant "back" buttons
- [x] There's currently no way to view a note, we should make them clickable in the weekly tracker
- [x] Add some padding between the weekly tracker containers (meetings, tasks, notes)
- [x] Notes description should display markdown in weekly tracker page and be truncated to 2-3 lines per note
- [x] Meeting and task section too short in daily log
- [x] Weekly tracker should display 3 sections like a grid with meetings on the left
- [x] Meeting titles get cut off quickly in daily log page
- [x] "Title" and "Task" rows in meeting and task containers on weekly tracker page are unnecessary
- [x] Project colors should be assignable by user
- [x] Settings page should allow users to change account info (email, password)
- [x] Past meetings should not show in the project page. Current and future meetings should sort (current first to furthest in the future)
- [x] Optimistic UI for toggles (daily log feels instant)
- [x] Sort meetings in order by time in daily log (earliest first)
- [x] Time select should be less granular (15 minute scale vs 60 minute scale)
- [x] Project → task creation shortcuts (preselect project when creating from project view)
- [x] Weekly summary header (X done / Y remaining)
- [x] Micro polish: hover states, subtle transitions, keyboard nav
- [x] Recurrence badges ("weekly", "ongoing")
- [x] Add status to project (indicates whether still active or complete)
- [s] Add description to project
- [x] Add a logo
- [x] Make navbar and footer sticky

---

### De-scoped/low priority

- [ ] Carry-over logic visualization (ghost tasks / "rolled from yesterday")
- [ ] Project-scoped tags

---

(not sure if these make sense)

- [ ] "Seen this week" indicators
- [ ] Collapsible "Background reminders" section — visual distinction only, no behavior yet

---

## Features

- [x] Add recurring tasks/events (meetings)
- [x] Meetings auto-done after day-of (frontend and backend)
- [x] Meetings should have a time
- [x] Implement deadlines
- [x] Integration with Google Calendar (push meetings to calendar, timezone-aware)
  - [x] Pull events from Google Calendar into Work Smarter
  - [x] Users should have the option to blacklist certain meetings from importing
  - [x] Sync tasks with deadlines once deadlines are implemented
- [x] Add dark mode
- [x] Resume
  - [x] User can have an attached resume model(s)
  - [x] User should be able to upload or create from scratch
  - [x] User should also be able to download resume
  - [/] Build Resume from linkedin profile(not possible right now)
- [ ] Dedicated UI for notes
- [ ] Make tasks searchable
- [x] Log in with LinkedIn/Google (social auth)
- [ ] AI resume analysis


## User-facing (go-live features)

- [x] Account show/edit page
- [ ] Beef up account security
- [ ] Tutorial section
- [ ] About page


## Ongoing (these actions need to be performed whenever a box in this file is checked)

- [ ] Update tests
- [ ] Ensure app is aligned with design principles
