# Training Tracker: plan

_Last updated 27 Nov 2026 (version 3.0). App code is in `docs/`, the sheet script is in `apps-script/Code.gs`. Ideas for later are in `BACKLOG.md`._

## What it is

A web app for your iPhone and PC.
- **Logging:** you tap Start and End for every set, and the app logs the weight, reps, how long the set took and how long you rested.
- **Storage:** everything goes into the `Training Log` Google Sheet, which has Sets, Sessions and Notes tabs.
- **Analysis:** `Training Analysis.xlsx` in this folder pulls the data into Excel.

- App: https://chasecai100.github.io/training-tracker/
- Sets are saved on the phone the moment you tap End, and uploaded whenever there's signal. Nothing is lost when the signal drops.

## Screens

1. **Start:**
   - Push, Pull, Legs, Shoulders, or an empty workout.
   - Once a day has history, its card shows your average workout time.
   - Below that is a list of recent workouts.
2. **Workout:**
   - **Pinned top bar:** the total workout time, plus a big countdown to your next set. While a set is running, it shows the set timer and your "to beat" target instead.
   - **Set rows:** each row reads set number, then weight, then Start/End, then reps. Reps (and partials) unlock once you tap End.
   - **Weight carry-over:** when a set finishes, the next set takes its weight unless you change it.
   - **On each exercise:** its note (read-only), type pickers, what you did last time, up/same/down markers, PR badges, warm-up rows (W1…), and drop rows.
   - **Reorder** (Do Next, ↑ ↓, save the order), and **search** to add or create any exercise.
3. **Exercises:** each exercise's note (edit it here), progress chart, records and history.
4. **Settings:**
   - **Timer And Sound:** default rest, rest after warm-ups, a choice of rest-over sound with test buttons, and keep the screen on.
   - **Options:**
    - **Supersets**, off by default: shows the "Superset With…" options.
    - **Partial Reps**, on by default: shows the Partial Reps switch on each exercise card. When it's off, partial reps are hidden everywhere.
   - **Workout Setup:** every exercise on each day, with its own sets, warm-ups, rest, set style, default types, and bodyweight/band per set.
   - **New Exercise.**

## Your split (Workout Setup defaults)

| Day | Exercise | Sets | Rest | Setup |
|---|---|---|---|---|
| Push | Machine Press | 5 | 2:00 | 1 warm-up · Weight Stack / Plate Loaded |
| | Incline Smith Bench | 5 | 2:00 | 1 warm-up |
| | Core Exercise | 3 | 1:30 | Ab Raise (or Ab Crunch, Pallof Press) |
| | Landmine Press | 3 | 1:00 | Red band + added kg · each side timed alone |
| | Pec Deck Fly | 5 | 2:00 | 1 warm-up |
| | Shoulder Press | 8 | 1:30 | Smith / Dumbbell |
| | Dumbbell Pullover | 5 | 1:30 | |
| | Tricep Overhead Extension | 2 | 2:00 | Single Rope / Double Cable · Rope / V-Bar · ultimate drop set (2.5 kg steps to 5 kg, then 2.5 kg) |
| Pull | Pull-Up + Chin-Up superset | 5 rounds | 1:00 between, 2:00 after | BW sets 1–2, purple band sets 3–5 · full and partial reps |
| | Seated Row | 5 | 2:00 | Wide MAG Grip (or Close MAG, Medium MAG, V Grip) |
| | Core Exercise | 3 | 1:30 | Ab Crunch |
| | Supported Row | 5 | 2:00 | |
| | Lat Pulldown | 5 | No rest | Single Hand (each side timed alone), or Close/Medium MAG, V Grip |
| | Reverse Fly | 5 | 2:00 | Machine · Double · two-weight drop every set |
| | Biceps | 2 | 2:00 | Cable · Double · ultimate drop set |
| | Biceps | 5 | 1:00 | Bench Supported · Single · two-weight drop every set |
| | Face Pull | 5 | default | |
| Legs | Leg Press | 5 | 3:00 | 2 warm-ups |
| | Calves | 5 | 1:30 | Machine / Smith |
| | Hamstring Curl | 5 | 2:00 | Lying / Seated |
| | Leg Extension | 5 | 2:00 | |
| | Adductor | 5 | 1:30 | |
| | Calves | 5 | 1:30 | Set numbers carry on (6–10) |
| Shoulders | Shoulder Press | 5 | 2:00 | Two-weight drop every set |
| | Reverse Fly | 5 | 2:00 | Machine · Double · two-weight drop every set |
| | Lateral Raise | 5 | 2:00 | Dumbbell / Cable · two-weight drop every set |
| | Landmine Press | 3 | 1:00 | As on Push |
| | Face Pull | 4 | 2:00 | |
| | Supported Row | 3 | 2:00 | |

## Rules the app follows

- **Weights:** always kg; for dumbbells, the weight of one dumbbell. Landmine Press logs the added weight on top of the bar.
- **Each side timed alone:** one-sided exercises get one row per side (1L, 1R, 2L…), each with its own Start/End and rest. In the sheet, both sides share the set number, with Side L or R.
- **Warm-ups:** feeler sets, not to failure. They're tagged Type = Warm-up and kept out of progress, PRs, set numbering and Excel's 1-rep max and volume.
- **Set styles:**
  - **Normal:** working sets only. Any set can still get a drop set: "+ Drop Set" appears on the active set (the one running, the one just finished, or the next one up).
  - **Two-Weight Drop Every Set:** each set has weight 1 and weight 2, and you enter both rep counts after End.
  - **Ultimate Drop Set:** drop rows fill in automatically from your starting weight, going down in fixed steps to a floor per set.
- **Drops:** each drop is its own row (Drop = 1, 2, 3…) on the same set number. Drops count toward volume, but not toward progress or the 1-rep max.
- **Rest timing:**
  - Rest is recorded from the end of one set to the start of the next.
  - The countdown uses the exercise's rest from Workout Setup. In a superset it uses "Rest Between Exercises" within a round. After a warm-up it uses the warm-up rest.
  - "No Rest" means the timer only counts up.
- **Progress, PRs and targets:**
  - **Up** means heavier, or the same weight for more reps.
  - **PRs:** heaviest weight, best estimated 1-rep max, or most reps at a weight.
  - **"To beat":** last time's same set with one more rep.
- **Notes:** one per exercise, stored in the sheet's Notes tab. Edit them in Exercises; workouts only show them.
- **Old names:** history logged under earlier names (Pull-up, Triceps, Ab Raise…) is read under today's names, so "last time" and PRs carry over.

## Spreadsheet layout

**Sets tab** (one row per set, side or drop):

| Columns | What they hold |
|---|---|
| Date, Time, Day | When the set started, and which day of your split |
| Exercise, Variation | The exercise and its selected types (e.g. "Machine · Double"), or the bodyweight mode |
| Type, Set, Drop, Side | Warm-up or blank; set number; drop number; L or R |
| kg, Reps, Partials | Weight, reps, and partial reps (pull-ups and chin-ups) |
| Start, End, Set (s), Rest (s) | Clock times, set length, and the rest before the set |
| Session, ID | Which workout, and the row's own ID |

**Sessions tab:** Session, Date, Day, Start, End, Duration, Length (min), Sets, Work (min), Rest (min), Time Zone.

- All times are your phone's local time.
- Start and End are stored to the second: the first set's Start and the last set's End.
- Duration is the exact workout length (h:mm:ss).
- Time Zone records where the phone was, e.g. "Australia/Sydney (UTC+11:00)", so times stay meaningful if you train while travelling.
- In the app, the workout's top bar shows "Since 18:05" under the total time, and Recent Workouts show each workout's start–end times.

**Notes tab:** Exercise, Note, Updated.

The Excel workbook adds Est 1RM and Volume, both for working sets only.

## Lock screen and Dynamic Island

These aren't possible for a web app:
- **Live Activities** (the lock-screen card and Dynamic Island timer) are only available to native iPhone apps.
- **Now Playing:** a web page that plays audio can show a Now Playing card, but it would take over from your music.
- **Push notifications:** home-screen web apps can receive them, but a "rest over" alert would need a server sending it at the right moment. That means ongoing upkeep.

Getting any of these would mean building a native iPhone app. That needs a Mac, Xcode and a paid Apple developer account.

## Privacy

The GitHub repository is public, and it holds only the app's code. That code includes the addresses of your sheet and its script, but neither is any use without your Google sign-in or your passphrase. The Excel workbook holds your passphrase, so git never uploads it.
