# Training Tracker: plan

_Last updated 26 Nov 2026 (version 2.2). App code is in `docs/`, the sheet script is in `apps-script/Code.gs`._

## What it is

A web app for your iPhone 16 Pro Max and your PC. On the iPhone you add it to the home screen, so it opens like a normal app. You tap Start and End for each set, and the app logs the weight, reps, how long the set took and how long you rested. Everything goes into a Google Sheet you can analyse in Excel.

- App: https://chasecai100.github.io/training-tracker/
- Master log: the `Training Log` Google Sheet, with Sets, Sessions and Notes tabs
- Analysis: `Training Analysis.xlsx` in this folder, which refreshes from the sheet every time you open it

## How the data flows

1. **Each set is saved on the phone the moment you tap End**, even with no signal.
2. **The app uploads it** to the sheet in the background whenever it has signal. If an upload fails, it keeps retrying, so nothing is lost when the signal drops.
3. **Excel** pulls the latest data from the sheet on open, or when you click Refresh All. Your own charts live in that workbook alongside the Sets and Sessions tables.

## Screens

1. **Start:** choose Push, Pull, Legs, Shoulders, or an empty workout. Each day shows its total sets and when you last did it.
2. **Workout:**
   - The day's exercises load in your usual order, with your set counts. Do them in any order, skip any, or add any exercise with search. If it isn't in the list yet, you can create it there.
   - Each set row has a Start button. While a set runs, the button becomes End and a red bar at the top shows the set timer. When you tap End, the reps box is ready for you to type into.
   - After End, the rest timer counts up toward your target (2:00 by default) and beeps when you reach it. If you go over, it turns red and shows by how much.
   - Each exercise shows its note (seat settings and so on), what you did last time, and an up/same/down marker on every set compared with last time.
   - **Drop sets:** tap "+ drop" under a set to add a drop row, with its own kg and reps. Triceps and Biceps start with drop rows on their last set: as many as last time, or 3 the first time. Empty drop rows are ignored.
   - **Reorder:** "⇅ Reorder exercises" switches to a compact list.
     - "Do next" puts an exercise straight after the one you're on, and ↑ ↓ move it one place.
     - "Save this order for every Push day" (or Pull, Legs, Shoulders) makes the new order your usual one. It only reorders your split: exercises you added just for today aren't added, and ones you skipped keep their place at the end.
3. **Exercises:** pick any exercise to see or edit its note, a chart of your progress, and its history with your average rest.
4. **Settings:**
   - Rest target, beep, and keeping the screen on.
   - Your split: change the order, the set counts, and which exercises belong to each day.
   - New exercises.

## The split

| Day | Exercises (sets) | Total |
|---|---|---|
| Push | Machine Press 5, Incline Bench 5, Ab Raise 2, Landmine Press 3, Pec Deck 5, Shoulder Press 8, Dumbbell Pullover 3, Triceps 2 | 33 |
| Pull | Pull-up + Chin-up superset 5 rounds, Seated Row 5, Ab Crunch 2, Supported Row 5, Lat Pulldown 5, Reverse Fly 5, Biceps 3, Face Pull 5 | 40 |
| Legs | Leg Press 5, Calves 5, Hamstring Curl 5, Leg Extension 5, Adductor 5, Calves 5 | 30 |
| Shoulders | Shoulder Press 5, Reverse Fly 5, Lateral Raise 5, Landmine Press 3, Face Pull 4, Supported Row 3 | 25 |

**Type pickers.** Some exercises have a picker. The app remembers the last one you used, and each choice gets its own progress line:

| Exercise | Choices |
|---|---|
| Machine Press | Weight stack / Plate-loaded |
| Shoulder Press | Smith / Dumbbell |
| Triceps | Overhead extension |
| Seated Row | Close MAG grip / Medium MAG grip |
| Lat Pulldown | Close MAG grip / Medium MAG grip / Single arm |
| Reverse Fly | Double / Single arm |
| Biceps | Cable / Supported single arm |

- Choosing a single-arm type switches the exercise to separate left and right reps.
- "Other…" in any picker adds a new choice.

**Calves twice on Legs.** Both blocks count as one exercise, so set numbers run 1–5 and then 6–10. Each block compares against the same sets from last time.

## Rules the app follows

- **Weights:** always kg.
  - Dumbbells: the weight of one dumbbell.
  - Plate-loaded machines: the full weight, as you enter it.
- **One-arm sets:** one weight box, with separate left and right reps. Saved as two rows, side L and side R. The set time and rest are only on the L row, so adding up a column in Excel doesn't count them twice.
- **Pull-ups and chin-ups:** each set is bodyweight, weighted (kg is the added weight), or band. Band defaults to purple.
- **Timing:**
  - Set time runs from Start to End.
  - Rest is the time from the end of your previous set (any exercise) to the start of this one. The first set of a workout has no rest.
  - Workout length runs from your first Start to your last End.
- **Rest target:** the countdown and beep happen after the last exercise of a superset round. Between the two exercises of a superset it only counts up.
- **Beep:** it plays through your headphones while the app is on screen, which is why the screen stays on during a workout. A locked phone can't beep.
- **Progress marker:**
  - Up: heavier, or the same weight for more reps.
  - Same: same weight and same reps.
  - Down: anything else.
- **Drop sets:**
  - Drops share their set's number and times, with no rest in between. Each drop is its own row with Drop = 1, 2, 3…
  - The weight hint for a drop comes from last time's same drop. If there's no history, it continues the step down: after 50 → 45 it suggests 40.
  - Drops count toward volume but not toward progress markers or the 1-rep-max chart.
  - You can switch "Drop set on the last set every time" on or off for any exercise in the Exercises tab.
- **Notes:** one per exercise. They're stored in the sheet's Notes tab, so your phone and PC show the same notes.
- **Fixing mistakes:** during a workout, edit the boxes; to undo a finished set, tap its tick twice. For past sessions, edit the Google Sheet and the app picks up the change.

## Spreadsheet layout

**Sets tab** (one row per set, one per side for one-arm sets):

| Column | What it holds |
|---|---|
| Date, Time, Day | When the set started, and which day of your split |
| Exercise, Variation | The exercise and its type, grip or bodyweight mode |
| Set, Drop, Side | Set number; drop number (blank for the main set); L or R for one-arm sets |
| kg, Reps | Weight and reps |
| Start, End | Clock times of the set |
| Set (s), Rest (s) | Set length and the rest before it, in seconds |
| Session, ID | Which workout it belongs to, and the row's own ID |

**Sessions tab:** Session, Date, Day, Start, End, Length (min), Sets, Work (min), Rest (min).

**Notes tab:** Exercise, Note, Updated.

The Excel workbook adds **Est 1RM** (weight × (1 + reps ÷ 30), main sets only) and **Volume** (weight × reps, drops included) to each set. To look at main sets only, filter Drop to blank.

## Privacy

The GitHub repository is public, and it holds only the app's code. That code includes the addresses of your sheet and its script, but neither is any use without your Google sign-in or your passphrase. Your training data and your passphrase never go to GitHub. The Excel workbook holds your passphrase, so git is set to never upload it.

## Maintenance

None planned. To change anything, ask me: I update the code and publish it, and the app updates itself the next time you open it with signal.
