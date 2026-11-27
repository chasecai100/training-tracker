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
   - Below that is a list of recent workouts (8, or Show All). Tap one to review it.
     - **Its summary:** total, working and rest minutes, working sets and estimated calories.
     - **Below that:** every set, drop and warm-up by exercise, with set and rest times.
     - Saving a workout opens this page straight away.
   - **Edit** on that page fixes logging mistakes:
     - Change kg, reps or partials, or an exercise's grip or setup.
     - Delete a set or drop (tap ✕ twice); later sets renumber to close the gap.
     - Add a forgotten set or drop. It saves once you type into it.
     - Delete the whole workout.
     - Changes save as you type and sync like any set. Suggestions, history and the workout's totals follow.
2. **Workout:**
   - **Pinned top bar:** the total workout time, plus a big countdown to your next set. While a set is running, it shows the set timer instead.
   - **Set rows:** each row reads set number, then weight, then Start/End, then reps. Reps (and partials) unlock once you tap End.
   - **Suggested weights and reps:** every weight and reps box hints a suggestion (see Suggested weights below). When you type a finished set's reps, the sets after it update straight away. Hints show dim, except on the row you're on, where the weight hint shows white as the value. Tapping a white hint selects it so typing replaces it, and an unchanged hint is saved when you tap End. If you type a different weight, the reps hint changes to what you'd get with it.
   - **Why it moved:** when the next set's suggested weight differs from the set before (or from last time), one short line under it says why, e.g. "Up to 65 kg: you'd get about 16 at 62.5 kg, over your 12–15".
   - **On each exercise:** a closed card is just its name. Opening it shows its note (read-only), type pickers, warm-up rows (W1…) and drop rows. There are no up/down markers and no "Last time" or "To Beat" line; the hints in the boxes are the suggestions.
   - **Fix Time:** under each finished set, "set 0:42 · rest 2:00 ✎" opens Fix Set Time. A working set under 5 seconds shows "Forgot Start? Fix Time" instead.
     - A longer time moves the set's start earlier and takes it off the rest before.
     - A shorter time moves its end earlier and adds it to the rest after.
     - "Use Your Usual" fills in your typical set time for that exercise.
     - Past workouts have the same thing in Edit.
   - **Reorder** (Do Next, ↑ ↓, save the order), and **search** to add or create any exercise.
   - **Finish:** shows total, working and rest minutes, working sets and estimated calories. Save Workout then opens the workout's summary page, where Edit fixes anything logged wrong.
   - **Workout check:** it runs by itself in the Finish dialog and on a workout's summary page.
     - **Fixed with one tap (Fix, or Fix All):** a set of a few seconds (Start tapped late), or one far longer than the exercise's other sets (End tapped late; over 2.5× and 2 minutes more). The set gets the middle of that exercise's other set times in the workout, else your usual time. A late Start never takes more than the rest before it.
     - **Only pointed out:** a working set with no reps, or a weight (2.5× off) or rep count (25+ and 3× the others) far from your other sets, a likely typo.
3. **Exercises:** each exercise's note (edit it here), progress chart, Suggestions, records and history.
   - **Suggestions:** the exercise's own rep range (or Default), what set 1 would suggest next time fresh and pre-fatigued, and what the app has learned: how much weaker each set gets than the one before, how much weaker you are pre-fatigued, and the weight step.
4. **Settings:**
   - **Timer And Sound:** default rest, rest after warm-ups, a choice of rest-over sound with test buttons, and keep the screen on.
   - **Options:**
    - **Supersets**, off by default: shows the "Superset With…" options.
    - **Partial Reps**, on by default: shows the Partial Reps switch on each exercise card. When it's off, partial reps are hidden everywhere.
    - **Body Weight (Kg):** used for estimated calories (MET method: about 6 METs while lifting, 2 between sets), and for weighted pull-up and chin-up suggestions (70 kg is assumed until it's set). Blank hides calories.
   - **Weight Suggestions:** the default rep range, 12 to 15. Each exercise can have its own on the Exercises tab.
   - **Workout Setup:** every exercise on each day, with its own sets, warm-ups, rest, set style, default types, and bodyweight/band per set.
   - **New Exercise.**

## Your split (Workout Setup defaults)

| Day | Exercise | Sets | Rest | Setup |
|---|---|---|---|---|
| Push | Machine Press | 5 | 2:00 | 1 warm-up · Weight Stack / Plate Loaded |
| | Smith Bench | 5 | 2:00 | 1 warm-up · Angle 15° (or 30°, 45°, Flat) |
| | Core Exercise | 3 | 1:30 | Ab Raise (or Ab Crunch, Pallof Press) |
| | Landmine Press | 3 | 1:00 | Red band + added kg · each side timed alone |
| | Pec Deck Fly | 5 | 2:00 | 1 warm-up |
| | Shoulder Press | 8 | 1:30 | Smith / Dumbbell / Barbell |
| | Tricep | 2 | 2:00 | Overhead Extension / Pushdown · Single Rope / Double Cable / V Bar · ultimate drop set (2.5 kg steps down to 2.5 kg) |
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
- **Each type is its own exercise for progress:** Machine Press on the weight stack and plate loaded, Smith Bench at 15° and 45°, or Shoulder Press with a Smith machine or dumbbells aren't the same strength. Each type (the Variation column) therefore gets its own suggestions, learned numbers, chart, bests and history. The Exercises tab shows one type at a time, defaulting to the one you did last. A type you've never done gets no suggestion. In Excel, group by Exercise and Variation together.
- **Renamed exercises:** sets in the sheet under an old name (Incline Smith Bench) are saved back under the new name and type (Smith Bench · 15°) the next time the app loads your history, so the sheet and Excel match.
- **Each side timed alone:** one-sided exercises get one row per side (1L, 1R, 2L…), each with its own Start/End and rest. In the sheet, both sides share the set number, with Side L or R.
- **Warm-ups:** feeler sets, not to failure. They're tagged Type = Warm-up and kept out of progress, suggestions, set numbering and Excel's 1-rep max and volume.
- **Set styles:**
  - **Normal:** working sets only. A set can still get a drop set: "+ Drop Set" appears under the set you're about to do (or doing), so you can enter the drop weight before you start. "+ Another Drop" adds more.
  - **Two-Weight Drop Every Set:** each set has weight 1 and weight 2, and you enter both rep counts after End.
  - **Ultimate Drop Set:** drop rows fill in automatically from your starting weight, going down in fixed steps all the way to 2.5 kg on every set. Remove (✕) the drops you don't get to.
- **Drop sets are one continuous set:** one Start, straight through every drop, one End ("End Drop Set"). The rest timer starts at End, and then you enter the reps for the set and every drop.
- **Drops:** each drop is its own row (Drop = 1, 2, 3…) on the same set number. Drops count toward volume, but not toward progress or the 1-rep max. Drops have their own partials when partials are on. A drop with no reps or partials entered isn't saved.
- **Rest timing:**
  - Rest is recorded from the end of one set to the start of the next.
  - The countdown uses the exercise's rest from Workout Setup. In a superset it uses "Rest Between Exercises" within a round. After a warm-up it uses the warm-up rest.
  - "No Rest" means the timer only counts up.
- **Fresh or pre-fatigued:** order changes what you can lift, so each exercise in each workout gets a state.
  - It's **pre-fatigued** when 2 or more working sets earlier in that workout hit any of its muscles (muscle tags are in `exercises.js`); otherwise it's **fresh**.
  - The state comes from set start times, so no extra Sheet columns are needed.
  - Smith Bench after Machine Press counts as pre-fatigued; Smith Bench after Leg Press counts as fresh.
- **Progress, like for like:**
  - The Exercises chart draws fresh and pre-fatigued workouts as separate lines, each with its trend: the straight-line fit over the last 8 weeks, e.g. "Fresh +6% since Oct 3".
  - History rows are tagged fresh or pre-fatigued.
  - All-time bests stay on the Exercises tab as a reference. There are no PR badges and no up/down markers.
- **Suggested weights** (the hints in the weight and reps boxes). Everything runs on one estimate of your strength for the set: an estimated 1-rep max (Epley: weight × (1 + reps ÷ 30)), which puts any weight and reps on the same scale.
  1. **Rep range:** 12–15 by default (Settings), or the exercise's own (Exercises tab).
  2. **Before you've done a set of the exercise today** (from your history): it uses your last 4 workouts with that exercise in today's state, for that set number.
     - The latest counts most, and each workout further back counts half as much. A good day counts in full; one bad day only pulls you down halfway.
     - More than 3 weeks since you last did it: it eases off 1% a week, up to 8%.
     - It's double progression: at last time's weight it aims for one more rep, until that reaches the top of your range. Then the weight goes up to the heaviest that still gets you one rep inside the range (13 for 12–15). If a step up would drop you more than a rep under the range, you add reps first.
     - Under the range, the weight comes down only as far as it takes to get back in.
  3. **During a workout:** each set follows the set you just did. That set's weight and reps give today's strength, less how much you usually drop off from one set to the next on that exercise.
     - The drop-off is learned from back-to-back sets in your last 10 workouts of it. It starts at 4% and settles as you log more.
     - The weight stays while the reps you'd get are still inside your range. Over it, the weight goes up to the heaviest that gets you near the top (14 for 12–15), so it lasts a couple of sets. Under it, it comes down only as far as it takes to get back in.
     - The sets after the next one chain on from it, so the whole exercise updates as you go.
     - Until you type a finished set's reps, its weight carries to the next set.
     - One-arm sets: the right side keeps the left side's weight within a set.
  4. **No workout in today's state yet:** it converts from the other state with your fresh-to-tired ratio for that exercise. That's learned from your last few workouts each way, weighed against the ratio across all your exercises (0.9 until there's data).
  5. **Limits:** a suggestion moves at most +15% or −20% from the weight it starts from (always at least one step). Weights move in your usual step for that exercise: the most common gap between weights you've logged, once it's come up twice; until then 2.5 kg.
  6. **Added weight:** weighted pull-ups and chin-ups use your body weight plus the added weight. Landmine Press adds about 10 kg for the bar's share.
  7. **Bodyweight and band sets:** reps only, following the set before less your usual drop-off, else last time's.
  8. **Drop weights** keep their share of the set's weight when that changes.
- **Notes:** one per exercise, stored in the sheet's Notes tab. Edit them in Exercises; a workout only shows them on an open exercise.
- **Old names:** history logged under earlier names (Pull-up, Triceps, Tricep Overhead Extension, Ab Raise…) is read under today's names, so history, suggestions and notes carry over.

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
