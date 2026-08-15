# Testing guide

## Automated checks

```bash
npm run lint       # eslint
npm run typecheck  # tsc
npm test           # vitest — outbox idempotency and streak calculation
npm run test:db    # pgTAP — RLS tenant isolation and transactional RPCs
npm run lint:db    # PostgreSQL function/schema lint
npm run build      # typecheck + production build
```

All six must pass before deploying. `test:db` and `lint:db` require the local
Supabase stack (`supabase start`). The tests deliberately cover the
places where a subtle bug would be invisible in the UI: whether a queued offline
action can be replayed twice and create a duplicate, whether streak counting
handles gaps and week boundaries correctly, and whether database tenant boundaries
hold when a caller submits another family's UUID.

## Installing the app

The app is a PWA, so "installing" means adding it to the home screen. There is no
app store involved and no APK to sideload.

**Android (Chrome).** Open the site, then either accept the install banner or use
the ⋮ menu → *Add to Home screen* / *Install app*.

**iPhone and iPad (Safari).** Open the site in Safari — this does not work in
Chrome on iOS. Tap the Share button, then *Add to Home Screen*. This step is
required for notifications to work at all on iOS.

**Windows / macOS (Chrome or Edge).** An install icon appears at the right-hand
end of the address bar.

The in-app `/install` screen shows these steps with the correct instructions for
whichever device is being used, which is easier to send to a family member than
this document.

## Manual test flows

### First run

1. Sign up with an email and password.
2. If email confirmation is enabled in Supabase, confirm via the emailed link.
3. Create the family and add a first child in onboarding.
4. Confirm you land in child mode with an empty day.

### Parent setup

1. Open the parent area and set a PIN.
2. Add a second child.
3. Create one task of each type for the first child:
   - a **check** task in the morning slot;
   - a **checklist** task with three sub-steps;
   - a **timer** task of 60 seconds;
   - a **sport** task with 2 sets and a 20-second rest.
4. Create a routine and put two tasks in it.
5. Create a reward costing 5 stars.
6. Confirm the tasks appear for the right child, on the right days, and not for
   the other child.

### Child's day

1. Switch to child mode and pick the first child.
2. Complete the check task — the progress ring should advance and a celebration
   should play.
3. Open the checklist task and tick the sub-steps one by one.
4. Start the timer task, switch to another app for a moment, and come back: the
   remaining time must reflect real elapsed time, not have paused.
5. Run the sport task through its sets and rests.
6. Play the routine and confirm it advances one task at a time.
7. Check the star balance has increased.

### Child email login

1. In Parent area → Children, edit a child and set an email and an 8+ character password.
2. In a private browser window, sign in with those credentials and confirm the app opens
   that child's day directly.
3. Confirm the child cannot open `/parent`, select a sibling, or see a sibling's tasks,
   completions or journal.
4. Complete a task, save a journal entry and request a reward; confirm all three work.
5. Back in the parent account, change the password and confirm the old password stops working.
6. Clear the child's email and save; confirm the child account can no longer sign in.

### Approvals

1. As a parent, create a task with *requires approval* switched on.
2. Complete it as the child; it should show as awaiting approval and **not** yet
   count stars.
3. Approve it as the parent, and confirm the stars are then credited.

### Rewards

1. As the child, ask to redeem the 5-star reward.
2. Confirm it cannot be requested without enough stars.
3. Approve as a parent and confirm the balance drops.
4. Confirm stars committed to a pending request cannot be spent twice.

### Offline

This is the most important flow to test on a real phone.

1. Load the app so the day is on screen.
2. Turn on airplane mode.
3. Confirm the offline banner appears and the day is still readable.
4. Complete two tasks and write a journal entry.
5. Turn airplane mode off.
6. Confirm the queue drains, the banner clears, and — importantly — that the
   completions appear exactly once, not twice.
7. Repeat with the app fully closed while offline, reopening it after
   reconnecting; queued actions survive a restart.

### Second parent

1. Create an invite in the parent area.
2. Open the link in a private window and sign up as a different person.
3. Confirm they join the same family and see the same children.
4. Confirm the link cannot be used a second time.
5. Create another invite, revoke it, and confirm it is refused.

### Notifications

Requires [`push-setup.md`](push-setup.md) to be complete.

1. Enable notifications in Settings; confirm the explanation appears before the
   browser's permission prompt.
2. With the app closed, have the child complete a task needing approval, and
   confirm the parent's device receives a notification.
3. Tap it and confirm it opens the right screen.
4. Confirm the text does not reveal the child's name on the lock screen while the
   generic-text setting is on.
5. Wait for a configured reminder time and confirm the reminder arrives.

### Privacy and deletion

1. Export the family data and confirm the JSON contains what you expect.
2. Delete a child and confirm their tasks, completions and journal entries go too.
3. On a **throwaway account**, delete the whole account. Confirm you are signed
   out, the login no longer works, and the data is gone — this is real deletion,
   not deactivation, and it cannot be undone.

### Languages and themes

1. Switch to English and back; the layout must flip between RTL and LTR cleanly.
2. Switch between light and dark, and confirm the system-preference default works.

## Updates

The service worker uses a prompt strategy: when a new version is deployed, an
update prompt appears rather than the app reloading underneath someone
mid-task. To test, deploy a change and reopen the installed app.

## Known limitations

- iOS push requires the app to be installed to the home screen (16.4+).
- Nothing can be scheduled locally on the device — reminders that arrive while
  the app is closed come from the server.
- The parent PIN keeps children out of parent screens on a shared parent device. It
  is not a security boundary; Row Level Security scopes parent accounts to their
  family and independently signed-in child accounts to one child profile.
- If two devices complete the same task offline, they converge to a single
  completion rather than duplicating.
