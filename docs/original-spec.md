> **Provenance.** This is the original KidTasks requirements specification. It was
> written for an earlier Next.js implementation that is now archived at
> `github.com/Elizabeth1979/kidtasks-nextjs-prototype` (private, unrelated git history).
> It is kept here because it is the most complete statement of what the app is meant to
> do — section numbers referenced elsewhere in the codebase point at this document.
> Where the spec and the shipped Vite app disagree, **the shipped app wins**.

---

# Request to Build a Family Chore App for Kids

I want you to build a working app for managing kids' chores, with the working title:

**KidTasks – My Chores**

Don't settle for a specification, explanations, or a design sample. Actually create the project, including full code, database, screens, logic, demo data, and setup instructions.

## 1. Product Goal

The app is intended for a family in which the parents create chores and routines for the children, and the children see their chores, perform them, and mark them as completed.

The app must support:

- One-off chores.
- Daily chores.
- Weekly chores.
- Chores that recur on specific days.
- Routines that include several sub-tasks.
- Chores related to extracurricular classes and calendar events.
- Chores with a timer.
- Sports chores with sets, reps, and rest time.
- Notifications and reminders.
- A management screen for parents.
- A simple, clear screen for children.
- Multiple children under the same family account.

## 2. App Type and Technology

Build a Web app as a PWA, optimized first for phone and tablet.

Use the following technologies:

- Next.js with App Router.
- TypeScript.
- Tailwind CSS.
- Supabase for:
  - Authentication.
  - PostgreSQL Database.
  - Row Level Security.
  - Realtime data storage where needed.
- React Hook Form.
- Zod for form validation.
- date-fns for handling dates and times.
- Lucide Icons.
- Web Notifications where the browser supports them.
- Service Worker and PWA Manifest.

The code must be clean, modular, and easy to extend.

Add a `.env.example` file and precise instructions for running the project.

## 3. Language and Direction

- Primary UI language: Hebrew.
- The entire UI must work in RTL.
- The structure should be prepared so English can be added in the future.
- Use simple, clear text suitable for young children as well.
- Do not use text that is too small or buttons that are too small.

## 4. User Types

### Parent

A parent can:

- Open a family account.
- Create a profile for each child.
- Add, edit, duplicate, and delete chores.
- Create categories.
- Create routines and reusable templates.
- Set a date, time, recurring days, and an end date.
- Add sub-tasks.
- Define a timer chore.
- Define a sports chore.
- See which chores were completed.
- See chores that weren't completed on time.
- Require parent approval for some chores.
- Approve or reject completion of a chore.
- Assign a chore to one child, several children, or all children.
- Turn points and rewards on or off.
- View a daily and weekly report.

### Child

A child can:

- Log in with a simple PIN code or by selecting a profile.
- See only their own chores.
- See what they need to do right now.
- See chores for later in the day.
- Start a chore.
- Check off sub-tasks.
- Run a timer.
- Mark a set as done.
- Get a sound when the rest period ends.
- Mark a chore as completed.
- See the chores they've already completed.
- See their points and streak, when that option is enabled.

A child cannot:

- Delete chores.
- Change a chore's requirements.
- Change the number of sets or reps.
- Enter the parent screen without a parent PIN.

## 5. Login and Permissions

Create:

### Family account

A parent registers with:

- Email address.
- Password.
- Family name or household name.

### Child profile

Each child will have:

- Name.
- Avatar or emoji.
- Personal color.
- Optional 4-digit PIN.
- Optional birth year.
- Notification settings.
- Points system enabled or disabled.

### Switching to parent mode

To move from the child screen to the parent management screen, a parent PIN must be entered.

Parent actions must also be protected server-side. Do not rely only on hiding buttons in the UI.

## 6. Main Navigation

### Parent mode

Bottom or side menu with:

- Dashboard.
- Calendar.
- Chores.
- Templates.
- Children.
- Settings.

### Child mode

A simple menu with:

- My Day.
- My Week.
- Completed.
- Rewards, when that option is enabled.

## 7. Parent Dashboard Screen

Show a card for each child containing:

- Name and avatar.
- Number of chores for today.
- Number of chores completed.
- Completion percentage.
- Overdue chores.
- The next chore.
- The next class or event.
- A button to view the child's chores.
- A button to add a chore.

Also show:

- A family summary for today.
- Chores awaiting approval.
- Upcoming events.
- Chores that weren't done yesterday.
- A prominent action button: "Add chore".

## 8. Child Screen – My Day

The screen must be very simple.

Split the screen into zones:

### Now

Show one recommended chore to do right now.

Include:

- Chore name.
- Icon.
- Time.
- A short explanation.
- A large button: "I started".
- A large button: "I finished".

### Later today

Show upcoming chores ordered by time.

### No fixed time

Chores that need to be done by the end of the day.

### Completed

A collapsed list of chores that were done.

When there are no open chores, show a positive message such as:

"Great job! You finished all your chores for today."

## 9. Creating a Chore

Create a complete but simple form, divided into steps.

### Basic details

- Chore name.
- Description.
- Icon.
- Category.
- Assigned child or children.
- Importance level:
  - Normal.
  - Important.
  - Mandatory.

### Scheduling

- No date.
- One-off date.
- Every day.
- On specific days of the week.
- Every week.
- Every month.
- Start date.
- Optional end date.
- Start time.
- Deadline.
- Estimated time to complete.

### Notifications

- Notification when the chore starts.
- Notification a number of minutes before.
- Notification if the chore wasn't done.
- Notification to the parent after completion.
- Notification to the parent when the chore is overdue.

### Completion approval

Options:

- The child's check-off is enough.
- Parent approval required.
- A photo is required. The data structure and UI can be prepared even if the photo upload itself is defined as a second phase.

### Points

- No points.
- Number of points for completion.
- Bonus for completing on time.

## 10. Chore Types

Create a `task_type` field with the following options:

### Simple

A regular chore with a completion button.

### Checklist

A chore that includes several sub-tasks.

The chore counts as completed only when all items are checked, unless the parent allows partial completion.

### Timer

A chore with a countdown timer.

Settings:

- Timer duration.
- Sound on completion.
- Vibration on supported devices.
- Pause.
- Resume.
- Restart.

### Exercise

An activity chore that includes:

- Number of sets.
- Number of reps in each set.
- Rest duration between sets.
- A note or instructions.
- Option for a different number of reps in each set.

After marking a set as done:

1. A rest timer should start automatically.
2. Show the remaining time.
3. Play a sound when it ends.
4. Show the message: "You can start the next set".
5. When all sets are done, allow completing the chore.

The numbers are set only by the parent and must be adjustable to the child's age and ability.

### Routine

A routine that includes several chores or steps.

For example:

- Morning routine.
- Evening routine.
- Getting ready for school.
- Getting ready for a class.

### EventPreparation

A chore related to an event or class, including:

- Event name.
- Event time.
- Estimated travel time.
- How long before the event to start getting ready.
- How long before the event you need to leave.
- Equipment list.
- List of clothing actions.
- List of actions before leaving.

## 11. Sub-tasks

Each sub-task will have:

- Title.
- Optional description.
- Display order.
- Optional icon.
- Completion status.
- Completion time.
- Whether it is mandatory.
- Whether it has its own timer.

Sub-tasks can be dragged to reorder them in the parent screen.

## 12. Categories

Create default categories:

- Morning routine.
- Before bed.
- School.
- Homework.
- Classes.
- Pool.
- Sports.
- Hygiene.
- Tidying and cleaning.
- Kitchen.
- Family.
- One-off.

Each category will have:

- Name.
- Icon.
- Color.
- Whether the category is active.

A parent can create additional categories.

## 13. Templates

Create a template system.

A parent can:

- Save a chore as a template.
- Create a new template.
- Apply a template to a child.
- Copy a template to another child.
- Change the time and day when applying it.
- Edit a template without changing existing chores already created from it.

Default templates:

- Evening routine.
- Packing the school bag.
- Getting ready for the pool.
- Tidying the room.
- Short workout.
- Getting ready for bed.
- Going out on a trip.

## 14. Sample Evening Routine

Create demo data for a routine named:

**Evening and bedtime routine**

Sample start time: 20:00.

Sub-tasks:

### School and preparations for tomorrow

- Pack the school bag.
- Check that the books and notebooks needed for tomorrow are there.
- If there's a class, pack the bag for the class.
- Lay out clothes for school.
- Lay out clothes to wear after the shower.
- Put tomorrow's shoes in their usual place.
- Fill a water bottle and put it by the bed.

### Hygiene

- Take a shower.
- Brush teeth.
- Put dirty laundry in the laundry basket.

### Tidiness and cleaning

- Tidy the room.
- Pick up toys.
- Tidy the living room.
- Clear the plates.
- Wash the plates in the left sink.
- Put the washed plates in the right sink.

### Activity

Create four separate Exercise chores:

**Push-ups**

- 3 sets.
- 15 reps per set.
- 60 seconds rest.

**Squats**

- 3 sets.
- 15 reps per set.
- 60 seconds rest.

**Sit-ups**

- 3 sets.
- 15 reps per set.
- 60 seconds rest.

**Pull-ups**

- 3 sets.
- 3 reps per set.
- 60 seconds rest.

All numbers must be editable by the parent.

## 15. Sample Swimming Class

Create a sample weekly event:

- Category: Pool.
- Day: Monday.
- Class time: 16:00.
- Preparation starts: 15:00.
- Additional reminder: 15 minutes before leaving.

Chore name:

**Get ready for swimming class**

Sub-tasks:

### Packing the bag

- Put in a towel.
- Put in fins.
- Put in goggles.
- Put in a water bottle.
- Check that all the gear is in the bag.

### Clothing

- Put on a swimsuit.
- Put on a lycra shirt.
- Put on flip-flops.

### Before leaving

- Take the pool bag.
- Take a water bottle.
- Tell the parent you're ready to leave.

## 16. Calendar

Create a calendar screen with:

- Daily view.
- Weekly view.
- Monthly view.
- Filter by child.
- Filter by category.
- Filter by status.
- Display of classes and events.
- Click an event to open its details.
- Drag to reschedule, if it can be done reliably.

In the first version there's no requirement for a real Google Calendar integration, but a service layer and data structure should be built to allow adding sync in the future.

## 17. Statuses

A chore can have the following statuses:

- `pending` – not started yet.
- `in_progress` – in progress.
- `completed` – completed.
- `awaiting_parent_approval` – awaiting parent approval.
- `approved` – approved.
- `rejected` – rejected by the parent.
- `overdue` – overdue.
- `skipped` – skipped.
- `cancelled` – cancelled.

Keep a history of changes and completions. Do not change the original definition of a recurring chore when a daily instance of it is created.

## 18. Recurring Chores

There must be a separation between:

- The definition of the recurring chore.
- An instance of the chore on a specific date.

For example, "brush teeth every evening" is a recurring definition. Each day a separate instance is created that can be marked as completed.

Build a mechanism that generates instances in advance for a defined period, or computes them reliably when the day is loaded.

Make sure duplicate instances are not created.

## 19. Conditional Chores

Prepare basic support for conditions:

- Show only if there's school tomorrow.
- Show only if there's a class that day.
- Show only on school days.
- Don't show during vacation.
- Show manually at the parent's discretion.

In the MVP, the parent can be allowed to trigger the condition manually with a toggle such as:

"There's school tomorrow"
"There's a class today"

Structure the data so an external calendar integration can be added in the future.

## 20. Points System

The system will be optional per family and per child.

Options:

- Points for completing a chore.
- Bonus for completing a chore on time.
- Bonus for completing all of the day's chores.
- Day streak.
- Rewards defined by the parent.

Do not deduct points and do not create shaming or punitive messages.

Create a screen where the parent can define a reward, for example:

- 100 points – pick a family movie.
- 200 points – an activity of your choice.
- 300 points – a reward the parent defines.

## 21. Notifications and Timers

### Notifications

Prepare support for:

- Reminder before a chore.
- Reminder when a chore starts.
- Reminder in case of a delay.
- Reminder for a class.
- Notification that it's time to leave.
- Notification to the parent after completion.
- Notification to the parent when approval is needed.

Because of browser limitations, implement:

- Web Notifications when permission exists.
- An in-app internal notification.
- A sound inside the app.
- Clear documentation of notification limitations when the app is closed.

### Timers

The timer must:

- Keep running correctly even when switching to another screen.
- Be based on a start time and target time, not only on `setInterval`.
- Survive a page refresh.
- Persist its state in the database or in localStorage as needed.
- Play a sound when it ends.
- Show a clear completion message.
- Allow pause and resume in regular chores.
- In Exercise chores, allow the parent to choose whether rest can be skipped.

## 22. Data Model

Create a complete Supabase schema for the following entities:

### families

- id
- name
- created_at
- updated_at

### profiles

Parent profiles linked to Supabase Auth.

- id
- family_id
- role
- display_name
- parent_pin_hash
- created_at
- updated_at

### children

- id
- family_id
- name
- avatar
- color
- pin_hash
- birth_year
- points_enabled
- created_at
- updated_at

### categories

- id
- family_id
- name
- icon
- color
- is_active
- created_at
- updated_at

### task_templates

- id
- family_id
- title
- description
- category_id
- task_type
- recurrence_rule
- start_time
- due_time
- estimated_duration
- requires_parent_approval
- points
- priority
- is_active
- created_by
- created_at
- updated_at

### template_children

A join table between templates and children.

- template_id
- child_id

### task_items

Sub-tasks of a template or a chore.

- id
- template_id
- task_instance_id
- title
- description
- sort_order
- is_required
- timer_seconds
- created_at
- updated_at

### exercise_settings

- id
- template_id
- task_instance_id
- sets_count
- default_repetitions
- repetitions_by_set
- rest_seconds
- created_at
- updated_at

### events

- id
- family_id
- child_id
- category_id
- title
- event_date
- start_time
- end_time
- preparation_start_time
- leave_time
- recurrence_rule
- location
- notes
- created_at
- updated_at

### task_instances

- id
- family_id
- child_id
- template_id
- event_id
- title_snapshot
- description_snapshot
- category_snapshot
- task_type
- scheduled_date
- start_at
- due_at
- status
- progress_percent
- requires_parent_approval
- points_snapshot
- started_at
- completed_at
- approved_at
- approved_by
- created_at
- updated_at

### task_item_completions

- id
- task_instance_id
- task_item_id
- child_id
- is_completed
- completed_at
- created_at
- updated_at

### exercise_progress

- id
- task_instance_id
- child_id
- current_set
- completed_sets
- rest_started_at
- rest_ends_at
- status
- created_at
- updated_at

### rewards

- id
- family_id
- title
- description
- points_cost
- is_active
- created_at
- updated_at

### reward_redemptions

- id
- reward_id
- child_id
- status
- requested_at
- approved_at
- created_at
- updated_at

### notifications

- id
- family_id
- profile_id
- child_id
- title
- body
- notification_type
- is_read
- scheduled_at
- sent_at
- created_at

### activity_logs

- id
- family_id
- actor_type
- actor_id
- action
- entity_type
- entity_id
- metadata
- created_at

The schema may be improved if there's a more professional approach, but all the described capabilities must be preserved.

## 23. Security

Supabase Row Level Security must be implemented.

Each family can access only its own data.

Requirements:

- A parent can read and update only their own family's data.
- A child is not an independent Supabase Auth user in the first version, but logs in through a limited family session.
- Sensitive parent actions require server-side authentication.
- Do not store the PIN as plain text.
- The PIN must be hashed.
- Do not expose the Service Role Key in the browser.
- Permissions must also be checked in Server Actions or API Routes.
- Protect against `family_id` being modified in a client-side request.

## 24. Required Screens

Build all of the following screens:

### Public

- Login screen.
- Registration screen.
- Forgot password.

### Parent

- Dashboard.
- Children list.
- Create child.
- Edit child.
- Chores list.
- Create chore.
- Edit chore.
- Duplicate chore.
- Templates list.
- Create template.
- Calendar.
- Parent approvals.
- Reports.
- Points and rewards.
- Categories.
- Family settings.

### Child

- Child selection.
- PIN entry.
- My Day.
- Chore details.
- Checklist execution.
- Timer execution.
- Exercise execution.
- My Week.
- Completion history.
- Points and rewards.

## 25. Design and User Experience

The design should be:

- Clean.
- Friendly.
- Modern.
- Pleasant for children but not babyish.
- Suitable also for school-age children.
- With large buttons.
- With clear icons.
- With a personal color for each child.
- With light animations when a chore is completed.
- Without visual clutter.

Use large cards.

In child mode, present as few decisions as possible at a time.

A completion action should show short positive feedback, for example:

- "Great job!"
- "You finished!"
- "Excellent, on to the next task."

Do not use negative or shaming messages.

## 26. Accessibility

Implement:

- Good contrast.
- Keyboard support.
- ARIA labels.
- Comfortably sized buttons.
- Don't rely on color alone.
- Support for text enlargement.
- Correct RTL direction.
- Clear focus states.
- A future option for reading chores aloud.

## 27. Reports

The parent screen will show:

- Completion percentage by child.
- Daily completion percentage.
- Weekly completion percentage.
- Chores that are done consistently.
- Chores that are often forgotten.
- Chores that are completed late.
- Day streak.
- Points accumulated.

Use simple charts only.

## 28. Demo Data

Create seed data that includes:

- A sample family.
- Two children.
- Default categories.
- An evening routine.
- A swimming class on Monday.
- Sports chores.
- Several chores that have already been completed.
- One chore awaiting approval.
- One overdue chore.
- Several sample rewards.

Add an option to run a Demo Mode without needing to configure Supabase, if that's possible without complicating the code. Local data may be used for demo mode.

## 29. Tests

Add tests at least for:

- Creating a chore.
- Creating a recurring chore.
- Preventing duplicate instances.
- Completing a Checklist.
- Completing an Exercise chore.
- Timer calculation after a refresh.
- Transition to awaiting-parent-approval.
- Approving a chore.
- Points calculation.
- Family permissions.

Use Vitest and React Testing Library.

If possible, add a basic End-to-End test with Playwright for the flow:

1. Parent logs in.
2. Creates a child.
3. Creates a chore.
4. Switches to child mode.
5. The child completes the chore.
6. The parent sees that the chore was done.

## 30. Quality Requirements

- Don't use `any` without a justified reason.
- Don't leave buttons that don't work.
- Don't create placeholder-only screens.
- Loading states must be shown.
- Empty states must be shown.
- Errors must be handled.
- Toast messages must be used.
- Form validation must be performed.
- Dates must be stored consistently.
- The family's time zone must be taken into account.
- The default time zone will be `Asia/Jerusalem`.
- Daylight saving time must be supported.
- Don't compute times using a fixed offset.

## 31. Execution Phases

Do the work in the following order:

### Phase 1 – Brief planning

Before writing code, briefly present:

- The project structure.
- The data model.
- The approach to managing permissions.
- The approach to managing recurring chores.
- The approach to managing timers.
- Important technology decisions.

Don't stay in the planning phase. Right after that, start creating the project immediately.

### Phase 2 – Project foundation

- Create a Next.js project.
- Add Tailwind.
- Add RTL.
- Add PWA.
- Add Supabase.
- Create Authentication.
- Create Layouts.

### Phase 3 – Database

- Create migrations.
- Create RLS policies.
- Create seed data.
- Create TypeScript types.

### Phase 4 – Parent mode

- Dashboard.
- Children.
- Chores.
- Templates.
- Calendar.
- Approvals.
- Settings.

### Phase 5 – Child mode

- Child selection.
- My Day.
- Checklist.
- Timer.
- Exercise.
- Completing chores.

### Phase 6 – Notifications and reports

- Internal notifications.
- Web Notifications.
- Points.
- Basic reports.

### Phase 7 – Tests and documentation

- Tests.
- Fix TypeScript errors.
- Fix lint errors.
- Full README.
- Deploy instructions.

## 32. Required Final Deliverable

At the end I want to receive:

1. A complete, working project.
2. All code files.
3. Supabase schema and migrations.
4. RLS policies.
5. Seed data.
6. `.env.example`.
7. A README in Hebrew or clear English.
8. Instructions for running locally.
9. Instructions for creating a Supabase project.
10. Deployment instructions for Vercel.
11. A list of capabilities that were completed.
12. A list of capabilities left for the next phase.
13. Screenshots or a clear description of every screen.
14. Passing tests.
15. No TypeScript or build errors.

## 33. Working Rules

- Don't ask me to decide every small detail.
- When a detail is missing, choose a sensible default and explain it.
- Don't create only a mockup.
- Don't create only a specification document.
- Don't stop after creating a few files.
- Make sure the app can actually be run.
- Run build, type check, lint, and tests, and fix the errors.
- When you change a file, show the full content or actually edit it in the workspace.
- Keep the structure simple enough to maintain.
- Prioritize a stable, working MVP over complex, unfinished capabilities.
