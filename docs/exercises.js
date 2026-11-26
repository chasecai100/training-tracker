// Starting exercise list and split. Changes made in the app's Settings are kept on each device.
//
// bodyweight: each set is bodyweight, weighted (+kg) or band.
// oneArm: log left and right reps separately (same weight).
// variations: choices shown in a picker on the exercise (label names the picker).
//   A variation with oneArm: true switches that exercise to left/right reps.
//   Each variation gets its own progress line.
window.TT_DEFAULTS = {
  version: 2,
  exercises: [
    { name: 'Machine Press', label: 'Machine', variations: [{ name: 'Weight stack' }, { name: 'Plate-loaded' }] },
    { name: 'Incline Bench' },
    { name: 'Ab Raise' },
    { name: 'Landmine Press' },
    { name: 'Pec Deck' },
    { name: 'Shoulder Press', label: 'Type', variations: [{ name: 'Smith' }, { name: 'Dumbbell' }] },
    { name: 'Dumbbell Pullover' },
    { name: 'Triceps', label: 'Type', variations: [{ name: 'Overhead extension' }] },
    { name: 'Pull-up', bodyweight: true },
    { name: 'Chin-up', bodyweight: true },
    { name: 'Seated Row', label: 'Attachment', variations: [{ name: 'Close MAG grip' }, { name: 'Medium MAG grip' }] },
    { name: 'Ab Crunch' },
    { name: 'Supported Row' },
    {
      name: 'Lat Pulldown',
      label: 'Attachment',
      variations: [{ name: 'Close MAG grip' }, { name: 'Medium MAG grip' }, { name: 'Single arm', oneArm: true }],
    },
    { name: 'Reverse Fly', label: 'Type', variations: [{ name: 'Double' }, { name: 'Single arm', oneArm: true }] },
    { name: 'Biceps', label: 'Type', variations: [{ name: 'Cable' }, { name: 'Supported single arm', oneArm: true }] },
    { name: 'Face Pull' },
    { name: 'Leg Press' },
    { name: 'Calves' },
    { name: 'Hamstring Curl' },
    { name: 'Leg Extension' },
    { name: 'Adductor' },
    { name: 'Lateral Raise' },
  ],
  // Usual order and number of sets for each day. names with two entries is a
  // superset, and its sets are rounds (one set of each per round).
  days: {
    Push: [
      { names: ['Machine Press'], sets: 5 },
      { names: ['Incline Bench'], sets: 5 },
      { names: ['Ab Raise'], sets: 2 },
      { names: ['Landmine Press'], sets: 3 },
      { names: ['Pec Deck'], sets: 5 },
      { names: ['Shoulder Press'], sets: 8 },
      { names: ['Dumbbell Pullover'], sets: 3 },
      { names: ['Triceps'], sets: 2 },
    ],
    Pull: [
      { names: ['Pull-up', 'Chin-up'], sets: 5 },
      { names: ['Seated Row'], sets: 5 },
      { names: ['Ab Crunch'], sets: 2 },
      { names: ['Supported Row'], sets: 5 },
      { names: ['Lat Pulldown'], sets: 5 },
      { names: ['Reverse Fly'], sets: 5 },
      { names: ['Biceps'], sets: 3 },
      { names: ['Face Pull'], sets: 5 },
    ],
    Legs: [
      { names: ['Leg Press'], sets: 5 },
      { names: ['Calves'], sets: 5 },
      { names: ['Hamstring Curl'], sets: 5 },
      { names: ['Leg Extension'], sets: 5 },
      { names: ['Adductor'], sets: 5 },
      { names: ['Calves'], sets: 5 },
    ],
    Shoulders: [
      { names: ['Shoulder Press'], sets: 5 },
      { names: ['Reverse Fly'], sets: 5 },
      { names: ['Lateral Raise'], sets: 5 },
      { names: ['Landmine Press'], sets: 3 },
      { names: ['Face Pull'], sets: 4 },
      { names: ['Supported Row'], sets: 3 },
    ],
  },
};
