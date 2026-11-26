# Training Tracker: plan

_Last updated 26 Nov 2026. Status: approved and built. App code is in `docs/`, the sheet script is in `apps-script/Code.gs`._

## What it is

A web app for your iPhone 16 Pro Max and your PC. On the iPhone you add it to the home screen, so it opens like a normal app. You log every set at the gym. Every set, warm-ups included, goes into a spreadsheet you can analyse in Excel.

## How the data flows

1. **You tick off a set.** It's saved on the phone immediately, even with no signal.
2. **The app uploads it** to your `Training Log` Google Sheet in the background whenever it has signal, and again when you tap Finish. If an upload fails, it keeps retrying. Nothing is lost if the signal drops.
3. **Your Excel workbook** (kept in this OneDrive folder) pulls the latest data from the sheet when you click Refresh. Your charts live in that workbook, so the app can never overwrite them.

## Screens

1. **Start:** choose Push, Pull, Legs, Shoulders, or an empty workout. Shows when you last did each day.
2. **Workout:**
   - The day's exercises load in your usual order. Do them in any order, skip any, or add any exercise with search.
   - Each exercise shows what you did last time. Boxes are pre-filled with last time's numbers, and each set gets an up/same/down marker.
   - Workout clock and rest timer at the top.
3. **Finish:** a summary (length, number of sets, how many sets beat last time) and the upload status.
4. **Progress:** pick an exercise to see a chart of your heaviest set in each session, plus the full history. Works on the phone and the PC.
5. **Settings:** rest timer length, sound on/off, the connection to your sheet, and the exercise list (add, rename, choose which day an exercise belongs to, mark it as one-arm or as having attachments).

## Exercises

| Day | Exercises (in usual order) |
|---|---|
| Push | Machine Press (Weight stack), Machine Press (Plate), Incline Smith Bench, Landmine Press, Pec Deck, Smith Shoulder Press, Dumbbell Shoulder Press, Dumbbell Pullover, Tricep Overhead Extension, Ab Raise |
| Pull | Pull-up + Chin-up (superset), Seated Row, Supported Row, Lat Pulldown (Single), Lat Pulldown (Double), Reverse Fly (Double), Reverse Fly (Single), Cable Biceps, Supported Biceps (Single), Face Pull, Ab Crunch |
| Legs | Leg Press, Machine Calf Raise, Hamstring Curl, Leg Extension, Adductor |
| Shoulders | Smith Shoulder Press, Reverse Fly (Double), Lateral Raise, Landmine Press, Face Pull, Supported Row |

An exercise that appears on more than one day (for example Landmine Press, Face Pull, Supported Row, Smith Shoulder Press) is one exercise with one history.

## Rules the app follows

- **Weights:** always kg.
  - Dumbbells: the weight of one dumbbell.
  - Plate-loaded machines: the full weight, as you enter it.
- **One-arm exercises** (Lat Pulldown Single, Reverse Fly Single, Supported Biceps Single): one weight box, with separate left and right reps. Saved as two rows, side L and side R.
- **Pull-ups and chin-ups:**
  - Two separate exercises, shown as a superset pair.
  - Each set is bodyweight, weighted (kg is the added weight), or band. Band defaults to purple.
- **Attachments** (Seated Row, Lat Pulldown Double):
  - Choices are Close MAG grip, Medium MAG grip, or other.
  - Defaults to what you used last time.
  - Each grip is tracked as its own progress line.
- **Progress marker** (each set compared with the same set last session):
  - Up: heavier, or the same weight for more reps.
  - Same: same weight and same reps.
  - Down: anything else.
- **Rest timer:**
  - 2:00 by default. Starts when you tick off a set. Buttons for +30s and skip.
  - Beeps through your headphones. It should play over your music without pausing it; this gets checked on your phone.
  - The screen stays awake during a workout, so the timer can beep.
  - No alert while the phone is locked: that would need a server, which means upkeep.
- **Workout clock:** starts at your first set, stops at Finish. The length is saved.
- **Fixing mistakes:** edit freely during the workout. For past sessions, edit the Google Sheet directly and the app picks up the change.

## Spreadsheet layout

**Sets sheet** (one row per set, per side for one-arm exercises):

| Date | Time | Day | Exercise | Variation | Set | Side | kg | Reps | Session |
|---|---|---|---|---|---|---|---|---|---|
| 2026-11-26 | 18:42 | Pull | Seated Row | Close MAG | 1 | | 55 | 10 | 2026-11-26-1 |
| 2026-11-26 | 18:51 | Pull | Lat Pulldown (Single) | | 1 | L | 25 | 12 | 2026-11-26-1 |
| 2026-11-26 | 18:51 | Pull | Lat Pulldown (Single) | | 1 | R | 25 | 12 | 2026-11-26-1 |
| 2026-11-26 | 18:30 | Pull | Pull Up | Weighted | 1 | | 5 | 8 | 2026-11-26-1 |
| 2026-11-26 | 18:33 | Pull | Chin Up | Band: Purple | 1 | | | 10 | 2026-11-26-1 |

**Sessions sheet:** Session, Date, Day, Start, End, Length (min).

## One-time setup

I operate your Chrome. You handle sign-ins, passwords, verification codes, and Google's "Allow" screen.

1. **Google Sheet and script** (about 10 min): create the `Training Log` sheet and add a small script that receives sets from the app.
2. **Hosting on GitHub Pages** (about 10 min): create a free GitHub account and publish the app at a web address. The repository is public, and it holds only the app's code. That code includes the addresses of your sheet and its script, but neither is any use without your Google sign-in or your passphrase. Your training data and your passphrase never go to GitHub.
3. **iPhone** (about 2 min, you): open the address, choose Share, then Add to Home Screen, then open the setup link once.
4. **Excel on the PC** (about 5 min): create the analysis workbook in this folder, connected to the sheet, with a few starter charts.

## Maintenance

None planned. To change anything, ask me: I update the code and publish it, and the app updates itself the next time you open it.

## Decision: Google Sheet instead of writing straight to OneDrive (needs your OK)

Writing to OneDrive directly needs a "registered app" in Microsoft's developer portal. Microsoft no longer lets a personal account register one on its own. You'd first need to create an Azure account, which asks for a card to verify your identity even on the free tier. People also report the setup can stop working after the free trial ends. That conflicts with "minimal maintenance."

The Google Sheet route needs no sign-in on the phone and has nothing that expires. Excel still gets all the data. The only difference is that the master log lives in your Google Drive rather than in OneDrive.

## Assumptions to correct

- Shoulders day loads Reverse Fly (Double). You can switch it to Single with one tap.
- Lateral Raise uses dumbbells, both arms at once, weight per dumbbell.
- Ab Raise is bodyweight (the weight box is optional). Ab Crunch has a weight.
