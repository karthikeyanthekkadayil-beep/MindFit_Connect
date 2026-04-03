import { 
  Dumbbell, Flame, Heart, Zap, ArrowUp, ArrowDown, 
  RotateCcw, Target, Timer, TrendingUp 
} from "lucide-react";

export interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string; // "12" or "30s" for time-based
  restSeconds: number;
  muscleGroups: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string;
  animationId: string;
}

export interface WorkoutDay {
  name: string;
  focus: string;
  exercises: ExerciseItem[];
  estimatedMinutes: number;
}

export interface WorkoutSplit {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  category: string;
  color: string;
  days: WorkoutDay[];
}

export const HOME_WORKOUT_SPLITS: WorkoutSplit[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    description: "Classic 6-day split targeting push muscles, pull muscles, and legs separately for balanced growth.",
    icon: "zap",
    difficulty: "intermediate",
    daysPerWeek: 6,
    category: "Split",
    color: "from-blue-500/20 to-cyan-500/20",
    days: [
      {
        name: "Push Day",
        focus: "Chest, Shoulders, Triceps",
        estimatedMinutes: 35,
        exercises: [
          { id: "p1", name: "Push-Ups", sets: 4, reps: "15", restSeconds: 60, muscleGroups: ["Chest", "Triceps"], difficulty: "beginner", instructions: "Keep your body in a straight line. Lower chest to the floor and push back up.", animationId: "pushup" },
          { id: "p2", name: "Diamond Push-Ups", sets: 3, reps: "12", restSeconds: 60, muscleGroups: ["Triceps", "Chest"], difficulty: "intermediate", instructions: "Place hands close together forming a diamond shape. Focus on tricep contraction.", animationId: "diamond-pushup" },
          { id: "p3", name: "Pike Push-Ups", sets: 3, reps: "10", restSeconds: 90, muscleGroups: ["Shoulders", "Triceps"], difficulty: "intermediate", instructions: "Form an inverted V with your body. Lower head toward the ground to target shoulders.", animationId: "pike-pushup" },
          { id: "p4", name: "Tricep Dips (Chair)", sets: 3, reps: "12", restSeconds: 60, muscleGroups: ["Triceps", "Chest"], difficulty: "beginner", instructions: "Use a sturdy chair. Lower your body by bending elbows to 90 degrees.", animationId: "tricep-dip" },
          { id: "p5", name: "Plank to Push-Up", sets: 3, reps: "8 each arm", restSeconds: 60, muscleGroups: ["Core", "Chest", "Triceps"], difficulty: "intermediate", instructions: "Start in forearm plank, push up to full plank one arm at a time.", animationId: "plank" },
        ],
      },
      {
        name: "Pull Day",
        focus: "Back, Biceps, Rear Delts",
        estimatedMinutes: 30,
        exercises: [
          { id: "pl1", name: "Doorframe Rows", sets: 4, reps: "12", restSeconds: 60, muscleGroups: ["Back", "Biceps"], difficulty: "beginner", instructions: "Hold a doorframe edge, lean back, and pull yourself in. Keep body straight.", animationId: "pull-motion" },
          { id: "pl2", name: "Superman Holds", sets: 3, reps: "30s", restSeconds: 45, muscleGroups: ["Lower Back", "Glutes"], difficulty: "beginner", instructions: "Lie face down, simultaneously lift arms and legs off the ground. Hold.", animationId: "superman" },
          { id: "pl3", name: "Reverse Snow Angels", sets: 3, reps: "12", restSeconds: 60, muscleGroups: ["Back", "Rear Delts"], difficulty: "beginner", instructions: "Lie face down, arms at sides. Sweep arms overhead in arc while squeezing back.", animationId: "superman" },
          { id: "pl4", name: "Towel Bicep Curls", sets: 3, reps: "12 each", restSeconds: 45, muscleGroups: ["Biceps"], difficulty: "beginner", instructions: "Step on a towel, hold both ends, curl up against resistance of your foot.", animationId: "pull-motion" },
        ],
      },
      {
        name: "Leg Day",
        focus: "Quads, Hamstrings, Glutes, Calves",
        estimatedMinutes: 40,
        exercises: [
          { id: "l1", name: "Bodyweight Squats", sets: 4, reps: "20", restSeconds: 60, muscleGroups: ["Quads", "Glutes"], difficulty: "beginner", instructions: "Stand shoulder-width apart, squat until thighs are parallel. Drive through heels.", animationId: "squat" },
          { id: "l2", name: "Walking Lunges", sets: 3, reps: "12 each leg", restSeconds: 60, muscleGroups: ["Quads", "Glutes", "Hamstrings"], difficulty: "beginner", instructions: "Step forward into a lunge, alternate legs. Keep torso upright.", animationId: "lunge" },
          { id: "l3", name: "Glute Bridges", sets: 4, reps: "15", restSeconds: 45, muscleGroups: ["Glutes", "Hamstrings"], difficulty: "beginner", instructions: "Lie on back, feet flat. Drive hips up, squeeze glutes at the top.", animationId: "glute-bridge" },
          { id: "l4", name: "Wall Sit", sets: 3, reps: "45s", restSeconds: 60, muscleGroups: ["Quads"], difficulty: "beginner", instructions: "Back against wall, slide down until thighs are parallel to floor. Hold.", animationId: "wall-sit" },
          { id: "l5", name: "Calf Raises", sets: 3, reps: "25", restSeconds: 30, muscleGroups: ["Calves"], difficulty: "beginner", instructions: "Stand on edge of a step. Rise up on toes, lower slowly below step level.", animationId: "squat" },
        ],
      },
    ],
  },
  {
    id: "fullbody",
    name: "Full Body",
    description: "Hit every muscle group in one session. Perfect for beginners or those with limited training days.",
    icon: "flame",
    difficulty: "beginner",
    daysPerWeek: 3,
    category: "Full Body",
    color: "from-orange-500/20 to-red-500/20",
    days: [
      {
        name: "Full Body A",
        focus: "Compound Movements",
        estimatedMinutes: 40,
        exercises: [
          { id: "fb1", name: "Burpees", sets: 3, reps: "10", restSeconds: 90, muscleGroups: ["Full Body"], difficulty: "intermediate", instructions: "Squat down, jump feet back to plank, do a push-up, jump feet in, jump up.", animationId: "burpee" },
          { id: "fb2", name: "Squats", sets: 4, reps: "15", restSeconds: 60, muscleGroups: ["Quads", "Glutes"], difficulty: "beginner", instructions: "Stand shoulder-width, squat deep, keep chest up. Drive through heels.", animationId: "squat" },
          { id: "fb3", name: "Push-Ups", sets: 3, reps: "15", restSeconds: 60, muscleGroups: ["Chest", "Triceps"], difficulty: "beginner", instructions: "Full range of motion. Chest to floor, arms fully extended at top.", animationId: "pushup" },
          { id: "fb4", name: "Superman Holds", sets: 3, reps: "30s", restSeconds: 45, muscleGroups: ["Lower Back"], difficulty: "beginner", instructions: "Lie face down, lift arms and legs. Hold and squeeze back muscles.", animationId: "superman" },
          { id: "fb5", name: "Plank", sets: 3, reps: "45s", restSeconds: 30, muscleGroups: ["Core"], difficulty: "beginner", instructions: "Hold forearm plank with hips level. Engage core throughout.", animationId: "plank" },
          { id: "fb6", name: "Glute Bridges", sets: 3, reps: "15", restSeconds: 45, muscleGroups: ["Glutes"], difficulty: "beginner", instructions: "Drive hips up, squeeze at top for 2 seconds. Lower slowly.", animationId: "glute-bridge" },
        ],
      },
      {
        name: "Full Body B",
        focus: "Strength & Stability",
        estimatedMinutes: 40,
        exercises: [
          { id: "fb7", name: "Lunges", sets: 3, reps: "12 each", restSeconds: 60, muscleGroups: ["Quads", "Glutes"], difficulty: "beginner", instructions: "Step forward, lower back knee toward floor. Alternate legs.", animationId: "lunge" },
          { id: "fb8", name: "Diamond Push-Ups", sets: 3, reps: "10", restSeconds: 60, muscleGroups: ["Triceps", "Chest"], difficulty: "intermediate", instructions: "Hands close together in diamond shape. Slow controlled reps.", animationId: "diamond-pushup" },
          { id: "fb9", name: "Mountain Climbers", sets: 3, reps: "30s", restSeconds: 45, muscleGroups: ["Core", "Cardio"], difficulty: "beginner", instructions: "In plank position, drive knees to chest alternately at a fast pace.", animationId: "mountain-climber" },
          { id: "fb10", name: "Wall Sit", sets: 3, reps: "45s", restSeconds: 60, muscleGroups: ["Quads"], difficulty: "beginner", instructions: "Back flat against wall, thighs parallel to floor. Hold.", animationId: "wall-sit" },
          { id: "fb11", name: "Crunches", sets: 3, reps: "20", restSeconds: 30, muscleGroups: ["Abs"], difficulty: "beginner", instructions: "Hands behind head, curl shoulders off ground. Squeeze abs at top.", animationId: "crunch" },
          { id: "fb12", name: "Jumping Jacks", sets: 3, reps: "30", restSeconds: 30, muscleGroups: ["Cardio", "Full Body"], difficulty: "beginner", instructions: "Jump feet out wide while raising arms overhead. Jump back to start.", animationId: "jumping-jack" },
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    description: "Alternate between upper and lower body days. Great balance of volume and recovery.",
    icon: "target",
    difficulty: "intermediate",
    daysPerWeek: 4,
    category: "Split",
    color: "from-purple-500/20 to-pink-500/20",
    days: [
      {
        name: "Upper Body",
        focus: "Chest, Back, Shoulders, Arms",
        estimatedMinutes: 35,
        exercises: [
          { id: "u1", name: "Push-Ups", sets: 4, reps: "15", restSeconds: 60, muscleGroups: ["Chest", "Triceps"], difficulty: "beginner", instructions: "Standard push-ups with full range of motion.", animationId: "pushup" },
          { id: "u2", name: "Pike Push-Ups", sets: 3, reps: "10", restSeconds: 90, muscleGroups: ["Shoulders"], difficulty: "intermediate", instructions: "Inverted V position. Lower head between hands targeting delts.", animationId: "pike-pushup" },
          { id: "u3", name: "Tricep Dips", sets: 3, reps: "12", restSeconds: 60, muscleGroups: ["Triceps"], difficulty: "beginner", instructions: "Use a chair or step. Keep elbows tracking backward.", animationId: "tricep-dip" },
          { id: "u4", name: "Superman Holds", sets: 3, reps: "30s", restSeconds: 45, muscleGroups: ["Back"], difficulty: "beginner", instructions: "Face down, lift and hold arms and legs off ground.", animationId: "superman" },
          { id: "u5", name: "Diamond Push-Ups", sets: 3, reps: "10", restSeconds: 60, muscleGroups: ["Triceps", "Inner Chest"], difficulty: "intermediate", instructions: "Close-grip push-ups for tricep emphasis.", animationId: "diamond-pushup" },
        ],
      },
      {
        name: "Lower Body",
        focus: "Quads, Hamstrings, Glutes, Calves",
        estimatedMinutes: 40,
        exercises: [
          { id: "lo1", name: "Squats", sets: 4, reps: "20", restSeconds: 60, muscleGroups: ["Quads", "Glutes"], difficulty: "beginner", instructions: "Deep bodyweight squats. Pause at the bottom for 1 second.", animationId: "squat" },
          { id: "lo2", name: "Lunges", sets: 3, reps: "12 each", restSeconds: 60, muscleGroups: ["Quads", "Glutes"], difficulty: "beginner", instructions: "Alternating forward lunges with controlled movement.", animationId: "lunge" },
          { id: "lo3", name: "Glute Bridges", sets: 4, reps: "15", restSeconds: 45, muscleGroups: ["Glutes", "Hamstrings"], difficulty: "beginner", instructions: "Single leg for advanced. Squeeze glutes hard at top.", animationId: "glute-bridge" },
          { id: "lo4", name: "Wall Sit", sets: 3, reps: "60s", restSeconds: 60, muscleGroups: ["Quads"], difficulty: "intermediate", instructions: "Wall sit with perfect 90-degree angle at knees.", animationId: "wall-sit" },
          { id: "lo5", name: "High Knees", sets: 3, reps: "30s", restSeconds: 30, muscleGroups: ["Cardio", "Hip Flexors"], difficulty: "beginner", instructions: "Run in place bringing knees to waist height rapidly.", animationId: "high-knees" },
        ],
      },
    ],
  },
  {
    id: "hiit",
    name: "HIIT Circuit",
    description: "High intensity interval training. Maximum calorie burn in minimum time with bodyweight moves.",
    icon: "flame",
    difficulty: "advanced",
    daysPerWeek: 3,
    category: "Cardio",
    color: "from-red-500/20 to-yellow-500/20",
    days: [
      {
        name: "HIIT Blast",
        focus: "Full Body Cardio",
        estimatedMinutes: 25,
        exercises: [
          { id: "h1", name: "Burpees", sets: 4, reps: "45s work / 15s rest", restSeconds: 15, muscleGroups: ["Full Body"], difficulty: "advanced", instructions: "Maximum intensity. Explosive jump at top, fast transition.", animationId: "burpee" },
          { id: "h2", name: "Mountain Climbers", sets: 4, reps: "45s work / 15s rest", restSeconds: 15, muscleGroups: ["Core", "Cardio"], difficulty: "intermediate", instructions: "Sprint pace. Drive knees as fast as possible.", animationId: "mountain-climber" },
          { id: "h3", name: "Jumping Jacks", sets: 4, reps: "45s work / 15s rest", restSeconds: 15, muscleGroups: ["Cardio"], difficulty: "beginner", instructions: "Full range of motion. Arms touch overhead.", animationId: "jumping-jack" },
          { id: "h4", name: "High Knees", sets: 4, reps: "45s work / 15s rest", restSeconds: 15, muscleGroups: ["Cardio", "Core"], difficulty: "intermediate", instructions: "Sprint intensity. Pump arms with each knee drive.", animationId: "high-knees" },
          { id: "h5", name: "Squat Jumps", sets: 4, reps: "45s work / 15s rest", restSeconds: 15, muscleGroups: ["Quads", "Glutes"], difficulty: "advanced", instructions: "Full squat, explosive jump. Land softly, immediately squat.", animationId: "squat" },
        ],
      },
    ],
  },
  {
    id: "core-abs",
    name: "Core & Abs Focus",
    description: "Dedicated core training to build a strong midsection and improve posture and stability.",
    icon: "target",
    difficulty: "beginner",
    daysPerWeek: 3,
    category: "Core",
    color: "from-emerald-500/20 to-teal-500/20",
    days: [
      {
        name: "Core Sculpt",
        focus: "Abs, Obliques, Lower Back",
        estimatedMinutes: 20,
        exercises: [
          { id: "c1", name: "Plank", sets: 3, reps: "60s", restSeconds: 30, muscleGroups: ["Core"], difficulty: "beginner", instructions: "Forearm plank. Keep body perfectly straight from head to heels.", animationId: "plank" },
          { id: "c2", name: "Crunches", sets: 3, reps: "20", restSeconds: 30, muscleGroups: ["Upper Abs"], difficulty: "beginner", instructions: "Curl shoulders off floor. Keep lower back pressed down.", animationId: "crunch" },
          { id: "c3", name: "Mountain Climbers", sets: 3, reps: "30s", restSeconds: 30, muscleGroups: ["Core", "Hip Flexors"], difficulty: "beginner", instructions: "Controlled pace focusing on core engagement each rep.", animationId: "mountain-climber" },
          { id: "c4", name: "Superman Holds", sets: 3, reps: "30s", restSeconds: 30, muscleGroups: ["Lower Back"], difficulty: "beginner", instructions: "Balance core workout by strengthening the posterior chain.", animationId: "superman" },
          { id: "c5", name: "Glute Bridges", sets: 3, reps: "15", restSeconds: 30, muscleGroups: ["Glutes", "Core"], difficulty: "beginner", instructions: "Focus on pelvic tilt and core engagement throughout.", animationId: "glute-bridge" },
        ],
      },
    ],
  },
];
