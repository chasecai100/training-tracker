// Starting exercise list and Workout Setup. Changes made in the app's Settings are kept on each device.
//
// Exercise flags:
//   options: pickers shown on the exercise, e.g. { label: 'Grip', choices: ['Wide MAG Grip', ...] }.
//            A choice with oneArm: true switches the exercise to one side at a time.
//   oneArm: always done one side at a time (each side is its own timed set).
//   bodyweight: each set is bodyweight, weighted (+kg) or band. partials: also log partial reps.
//   kgLabel: what the weight box means (Landmine Press logs the added weight).
//
// Workout Setup items (one per card):
//   names: one exercise, or two for a superset (sets are then rounds).
//   sets, warmups: how many working sets and warm-up sets load.
//   rest: seconds after a set (0 = no rest timer; leave out for the default).
//   restBetween: superset only, seconds between the two exercises in a round.
//   style (the "Set Style"): 'normal' | 'double' (two weights every set)
//          | 'ultimate' (drops of `step` kg down to floors[set], e.g. 5 kg then 2.5 kg).
//          Any set can also get a drop set with "+ Drop Set" while it's the active set.
//   choices: default picker choices per exercise. modes/band: bodyweight set types per set.
window.TT_DEFAULTS = {
  version: 4,
  exercises: [
    { name: 'Machine Press', options: [{ label: 'Machine', choices: ['Weight Stack', 'Plate Loaded'] }] },
    { name: 'Incline Smith Bench' },
    { name: 'Core Exercise', options: [{ label: 'Exercise', choices: ['Ab Raise', 'Ab Crunch', 'Pallof Press'] }] },
    { name: 'Landmine Press', oneArm: true, kgLabel: '+Kg', options: [{ label: 'Band', choices: ['Red Band', 'No Band'] }] },
    { name: 'Pec Deck Fly' },
    { name: 'Shoulder Press', options: [{ label: 'Type', choices: ['Smith', 'Dumbbell'] }] },
    { name: 'Dumbbell Pullover' },
    {
      name: 'Tricep',
      options: [
        { label: 'Setup', choices: ['Overhead Extension', 'Pushdown'] },
        { label: 'Attachment', choices: ['Single Rope', 'Double Cable', 'V Bar'] },
      ],
    },
    { name: 'Pull-Up', bodyweight: true, partials: true },
    { name: 'Chin-Up', bodyweight: true, partials: true },
    { name: 'Seated Row', options: [{ label: 'Grip', choices: ['Wide MAG Grip', 'Close MAG Grip', 'Medium MAG Grip', 'V Grip'] }] },
    { name: 'Supported Row' },
    {
      name: 'Lat Pulldown',
      options: [{ label: 'Grip', choices: [{ name: 'Single Hand', oneArm: true }, 'Close MAG Grip', 'Medium MAG Grip', 'V Grip'] }],
    },
    {
      name: 'Reverse Fly',
      options: [
        { label: 'Equipment', choices: ['Machine', 'Cable'] },
        { label: 'Arms', choices: ['Double', { name: 'Single', oneArm: true }] },
      ],
    },
    {
      name: 'Biceps',
      options: [
        { label: 'Equipment', choices: ['Cable', 'Dumbbell', 'Bench Supported'] },
        { label: 'Arms', choices: ['Double', { name: 'Single', oneArm: true }] },
      ],
    },
    { name: 'Face Pull' },
    { name: 'Leg Press' },
    { name: 'Calves', options: [{ label: 'Machine', choices: ['Machine', 'Smith'] }] },
    { name: 'Hamstring Curl', options: [{ label: 'Position', choices: ['Lying', 'Seated'] }] },
    { name: 'Leg Extension' },
    { name: 'Adductor' },
    { name: 'Lateral Raise', options: [{ label: 'Equipment', choices: ['Dumbbell', 'Cable'] }] },
  ],
  days: {
    Push: [
      { names: ['Machine Press'], sets: 5, warmups: 1, rest: 120, choices: { 'Machine Press': { Machine: 'Weight Stack' } } },
      { names: ['Incline Smith Bench'], sets: 5, warmups: 1, rest: 120 },
      { names: ['Core Exercise'], sets: 3, rest: 90, choices: { 'Core Exercise': { Exercise: 'Ab Raise' } } },
      { names: ['Landmine Press'], sets: 3, rest: 60, choices: { 'Landmine Press': { Band: 'Red Band' } } },
      { names: ['Pec Deck Fly'], sets: 5, warmups: 1, rest: 120 },
      { names: ['Shoulder Press'], sets: 8, rest: 90 },
      { names: ['Dumbbell Pullover'], sets: 5, rest: 90 },
      {
        names: ['Tricep'],
        sets: 2,
        rest: 120,
        style: 'ultimate',
        step: 2.5,
        floors: [5, 2.5],
        choices: { Tricep: { Setup: 'Overhead Extension', Attachment: 'Single Rope' } },
      },
    ],
    Pull: [
      {
        names: ['Pull-Up', 'Chin-Up'],
        sets: 5,
        rest: 120,
        restBetween: 60,
        modes: ['Bodyweight', 'Bodyweight', 'Band', 'Band', 'Band'],
        band: 'Purple',
      },
      { names: ['Seated Row'], sets: 5, rest: 120, choices: { 'Seated Row': { Grip: 'Wide MAG Grip' } } },
      { names: ['Core Exercise'], sets: 3, rest: 90, choices: { 'Core Exercise': { Exercise: 'Ab Crunch' } } },
      { names: ['Supported Row'], sets: 5, rest: 120 },
      { names: ['Lat Pulldown'], sets: 5, rest: 0, choices: { 'Lat Pulldown': { Grip: 'Single Hand' } } },
      { names: ['Reverse Fly'], sets: 5, rest: 120, style: 'double', choices: { 'Reverse Fly': { Equipment: 'Machine', Arms: 'Double' } } },
      {
        names: ['Biceps'],
        sets: 2,
        rest: 120,
        style: 'ultimate',
        step: 2.5,
        floors: [5, 2.5],
        choices: { Biceps: { Equipment: 'Cable', Arms: 'Double' } },
      },
      { names: ['Biceps'], sets: 5, rest: 60, style: 'double', choices: { Biceps: { Equipment: 'Bench Supported', Arms: 'Single' } } },
      { names: ['Face Pull'], sets: 5 },
    ],
    Legs: [
      { names: ['Leg Press'], sets: 5, warmups: 2, rest: 180 },
      { names: ['Calves'], sets: 5, rest: 90, choices: { Calves: { Machine: 'Machine' } } },
      { names: ['Hamstring Curl'], sets: 5, rest: 120, choices: { 'Hamstring Curl': { Position: 'Lying' } } },
      { names: ['Leg Extension'], sets: 5, rest: 120 },
      { names: ['Adductor'], sets: 5, rest: 90 },
      { names: ['Calves'], sets: 5, rest: 90, choices: { Calves: { Machine: 'Machine' } } },
    ],
    Shoulders: [
      { names: ['Shoulder Press'], sets: 5, rest: 120, style: 'double' },
      { names: ['Reverse Fly'], sets: 5, rest: 120, style: 'double', choices: { 'Reverse Fly': { Equipment: 'Machine', Arms: 'Double' } } },
      { names: ['Lateral Raise'], sets: 5, rest: 120, style: 'double', choices: { 'Lateral Raise': { Equipment: 'Dumbbell' } } },
      { names: ['Landmine Press'], sets: 3, rest: 60, choices: { 'Landmine Press': { Band: 'Red Band' } } },
      { names: ['Face Pull'], sets: 4, rest: 120 },
      { names: ['Supported Row'], sets: 3, rest: 120 },
    ],
  },
};
