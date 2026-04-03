import { motion } from "framer-motion";

interface ExerciseAnimationDemoProps {
  exerciseId: string;
  className?: string;
}

// CSS-animated stick figure exercise demos
const exerciseAnimations: Record<string, { name: string; keyframes: string; figure: JSX.Element }> = {};

// Reusable stick figure parts
const StickFigure = ({ 
  bodyTransform = "", 
  leftArmTransform = "", 
  rightArmTransform = "",
  leftLegTransform = "",
  rightLegTransform = "",
  animationClass = "",
}: {
  bodyTransform?: string;
  leftArmTransform?: string;
  rightArmTransform?: string;
  leftLegTransform?: string;
  rightLegTransform?: string;
  animationClass?: string;
}) => (
  <svg viewBox="0 0 100 120" className={`w-full h-full ${animationClass}`}>
    {/* Head */}
    <circle cx="50" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
    {/* Body */}
    <line x1="50" y1="28" x2="50" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: bodyTransform, transformOrigin: '50px 28px' }} />
    {/* Left Arm */}
    <line x1="50" y1="38" x2="30" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: leftArmTransform, transformOrigin: '50px 38px' }} />
    {/* Right Arm */}
    <line x1="50" y1="38" x2="70" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: rightArmTransform, transformOrigin: '50px 38px' }} />
    {/* Left Leg */}
    <line x1="50" y1="65" x2="35" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: leftLegTransform, transformOrigin: '50px 65px' }} />
    {/* Right Leg */}
    <line x1="50" y1="65" x2="65" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: rightLegTransform, transformOrigin: '50px 65px' }} />
  </svg>
);

// Animated exercise component with CSS keyframe animations
export const ExerciseAnimationDemo = ({ exerciseId, className = "" }: ExerciseAnimationDemoProps) => {
  return (
    <motion.div
      className={`relative aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center overflow-hidden text-primary ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-3/4 h-3/4">
        <AnimatedExercise id={exerciseId} />
      </div>
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
    </motion.div>
  );
};

// Individual animated exercises using CSS animations
const AnimatedExercise = ({ id }: { id: string }) => {
  switch (id) {
    case "pushup":
      return <PushupAnimation />;
    case "squat":
      return <SquatAnimation />;
    case "lunge":
      return <LungeAnimation />;
    case "plank":
      return <PlankAnimation />;
    case "burpee":
      return <BurpeeAnimation />;
    case "mountain-climber":
      return <MountainClimberAnimation />;
    case "jumping-jack":
      return <JumpingJackAnimation />;
    case "pull-motion":
      return <PullMotionAnimation />;
    case "pike-pushup":
      return <PikePushupAnimation />;
    case "glute-bridge":
      return <GluteBridgeAnimation />;
    case "superman":
      return <SupermanAnimation />;
    case "tricep-dip":
      return <TricepDipAnimation />;
    case "high-knees":
      return <HighKneesAnimation />;
    case "crunch":
      return <CrunchAnimation />;
    case "wall-sit":
      return <WallSitAnimation />;
    case "diamond-pushup":
      return <DiamondPushupAnimation />;
    default:
      return <PushupAnimation />;
  }
};

// --- Push exercises ---
const PushupAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full animate-[pushup_2s_ease-in-out_infinite]">
    <style>{`
      @keyframes pushup {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(10px); }
      }
      @keyframes pushup-arms {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(15deg); }
      }
    `}</style>
    {/* Ground */}
    <line x1="5" y1="70" x2="115" y2="70" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    {/* Body in plank - horizontal */}
    <circle cx="90" cy="35" r="6" fill="none" stroke="currentColor" strokeWidth="2" className="animate-[pushup_2s_ease-in-out_infinite]" />
    <line x1="84" y1="37" x2="35" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-[pushup_2s_ease-in-out_infinite]" />
    {/* Arms */}
    <line x1="75" y1="40" x2="75" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-[pushup_2s_ease-in-out_infinite]" />
    <line x1="60" y1="41" x2="60" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-[pushup_2s_ease-in-out_infinite]" />
    {/* Legs */}
    <line x1="35" y1="42" x2="15" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-[pushup_2s_ease-in-out_infinite]" />
  </svg>
);

const DiamondPushupAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full">
    <style>{`
      @keyframes diamondpush {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(12px); }
      }
    `}</style>
    <line x1="5" y1="70" x2="115" y2="70" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[diamondpush_2s_ease-in-out_infinite]">
      <circle cx="90" cy="35" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="84" y1="37" x2="35" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Hands close together - diamond */}
      <line x1="68" y1="40" x2="65" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="65" y1="41" x2="68" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Diamond shape between hands */}
      <polygon points="64,68 67,64 70,68 67,72" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="35" y1="42" x2="15" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

const PikePushupAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full">
    <style>{`
      @keyframes pikepush {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(8px); }
      }
    `}</style>
    <line x1="5" y1="72" x2="115" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[pikepush_2s_ease-in-out_infinite]">
      {/* Head pointing down */}
      <circle cx="65" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Body in V-shape */}
      <line x1="65" y1="28" x2="50" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="15" x2="30" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms to ground */}
      <line x1="60" y1="25" x2="70" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="25" x2="55" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

const TricepDipAnimation = () => (
  <svg viewBox="0 0 120 100" className="w-full h-full">
    <style>{`
      @keyframes tricdip {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(15px); }
      }
    `}</style>
    {/* Chair/bench */}
    <rect x="55" y="35" width="55" height="5" rx="2" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    <line x1="60" y1="40" x2="60" y2="90" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <line x1="105" y1="40" x2="105" y2="90" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <g className="animate-[tricdip_2s_ease-in-out_infinite]">
      <circle cx="50" cy="18" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="50" y1="25" x2="50" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms on bench */}
      <line x1="50" y1="32" x2="62" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="32" x2="60" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs extended */}
      <line x1="50" y1="55" x2="25" y2="88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="55" x2="30" y2="88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

// --- Pull exercises ---
const PullMotionAnimation = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <style>{`
      @keyframes pullup {
        0%, 100% { transform: translateY(15px); }
        50% { transform: translateY(0); }
      }
    `}</style>
    {/* Bar */}
    <line x1="15" y1="12" x2="85" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <g className="animate-[pullup_2.5s_ease-in-out_infinite]">
      <circle cx="50" cy="30" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="50" y1="37" x2="50" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms up to bar */}
      <line x1="50" y1="42" x2="35" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="42" x2="65" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs */}
      <line x1="50" y1="70" x2="40" y2="100" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="70" x2="60" y2="100" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

const SupermanAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full">
    <style>{`
      @keyframes superlift {
        0%, 100% { transform: translateY(5px) rotate(0deg); }
        50% { transform: translateY(-5px) rotate(-3deg); }
      }
    `}</style>
    <line x1="5" y1="65" x2="115" y2="65" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[superlift_2s_ease-in-out_infinite]">
      {/* Lying face down */}
      <circle cx="85" cy="48" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="79" y1="50" x2="30" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms extended forward */}
      <line x1="85" y1="48" x2="110" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs extended back and lifted */}
      <line x1="30" y1="55" x2="10" y2="45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

// --- Leg exercises ---
const SquatAnimation = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <style>{`
      @keyframes squat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(20px); }
      }
      @keyframes squat-legs {
        0%, 100% { transform: scaleY(1); }
        50% { transform: scaleY(0.7); }
      }
    `}</style>
    <line x1="10" y1="110" x2="90" y2="110" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[squat_2s_ease-in-out_infinite]">
      <circle cx="50" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="50" y1="27" x2="50" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms forward for balance */}
      <line x1="50" y1="38" x2="72" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="38" x2="28" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs */}
      <line x1="50" y1="60" x2="35" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="60" x2="65" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Feet */}
      <line x1="35" y1="90" x2="30" y2="108" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="65" y1="90" x2="70" y2="108" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

const LungeAnimation = () => (
  <svg viewBox="0 0 120 110" className="w-full h-full">
    <style>{`
      @keyframes lunge {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(15px); }
      }
    `}</style>
    <line x1="5" y1="100" x2="115" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[lunge_2s_ease-in-out_infinite]">
      <circle cx="60" cy="15" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="60" y1="22" x2="60" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms at sides */}
      <line x1="60" y1="32" x2="48" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="32" x2="72" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Front leg bent */}
      <line x1="60" y1="55" x2="80" y2="75" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="75" x2="80" y2="98" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Back leg extended */}
      <line x1="60" y1="55" x2="35" y2="75" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="35" y1="75" x2="25" y2="98" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

const GluteBridgeAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full">
    <style>{`
      @keyframes bridge {
        0%, 100% { transform: translateY(5px); }
        50% { transform: translateY(-8px); }
      }
    `}</style>
    <line x1="5" y1="68" x2="115" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[bridge_2s_ease-in-out_infinite]">
      {/* Head on ground */}
      <circle cx="20" cy="55" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Back arching up */}
      <line x1="26" y1="55" x2="60" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms flat */}
      <line x1="30" y1="52" x2="25" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Bent legs, feet on ground */}
      <line x1="60" y1="40" x2="80" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="55" x2="85" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="40" x2="72" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="72" y1="55" x2="75" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

const WallSitAnimation = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    {/* Wall */}
    <line x1="75" y1="5" x2="75" y2="110" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    {/* Person sitting against wall */}
    <g className="animate-pulse" style={{ animationDuration: '3s' }}>
      <circle cx="55" cy="25" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Back against wall */}
      <line x1="55" y1="32" x2="65" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Thighs horizontal */}
      <line x1="65" y1="60" x2="40" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Shins vertical */}
      <line x1="40" y1="60" x2="40" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="45" y1="60" x2="45" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms */}
      <line x1="60" y1="42" x2="50" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    {/* Timer indicator */}
    <circle cx="30" cy="25" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    <text x="30" y="29" textAnchor="middle" fill="currentColor" fontSize="8" opacity="0.5">⏱</text>
  </svg>
);

// --- Full body exercises ---
const BurpeeAnimation = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <style>{`
      @keyframes burpee {
        0%, 100% { transform: translateY(0) scaleY(1); }
        25% { transform: translateY(25px) scaleY(0.7); }
        50% { transform: translateY(30px) scaleY(0.6); }
        75% { transform: translateY(-15px) scaleY(1.1); }
      }
    `}</style>
    <line x1="10" y1="110" x2="90" y2="110" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[burpee_3s_ease-in-out_infinite]">
      <circle cx="50" cy="15" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="50" y1="22" x2="50" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="35" x2="30" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="35" x2="70" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="35" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="65" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="35" y1="90" x2="32" y2="108" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="65" y1="90" x2="68" y2="108" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

const MountainClimberAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full">
    <style>{`
      @keyframes climber-left {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(20px) translateY(-10px); }
      }
      @keyframes climber-right {
        0%, 100% { transform: translateX(20px) translateY(-10px); }
        50% { transform: translateX(0); }
      }
    `}</style>
    <line x1="5" y1="70" x2="115" y2="70" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    {/* Plank position */}
    <circle cx="90" cy="30" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="84" y1="33" x2="40" y2="45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Arms */}
    <line x1="78" y1="36" x2="78" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="70" y1="38" x2="70" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Alternating legs */}
    <line x1="40" y1="45" x2="20" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-[climber-left_1s_ease-in-out_infinite]" />
    <line x1="40" y1="45" x2="15" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-[climber-right_1s_ease-in-out_infinite]" />
  </svg>
);

const JumpingJackAnimation = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <style>{`
      @keyframes jj-arms {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-60deg); }
      }
      @keyframes jj-arms-r {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(60deg); }
      }
      @keyframes jj-legs {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-15deg); }
      }
      @keyframes jj-legs-r {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(15deg); }
      }
      @keyframes jj-body {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
    `}</style>
    <line x1="10" y1="110" x2="90" y2="110" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-[jj-body_0.8s_ease-in-out_infinite]">
      <circle cx="50" cy="18" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="50" y1="25" x2="50" y2="62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms */}
      <line x1="50" y1="35" x2="30" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '50px 35px' }} className="animate-[jj-arms_0.8s_ease-in-out_infinite]" />
      <line x1="50" y1="35" x2="70" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '50px 35px' }} className="animate-[jj-arms-r_0.8s_ease-in-out_infinite]" />
      {/* Legs */}
      <line x1="50" y1="62" x2="38" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '50px 62px' }} className="animate-[jj-legs_0.8s_ease-in-out_infinite]" />
      <line x1="50" y1="62" x2="62" y2="95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '50px 62px' }} className="animate-[jj-legs-r_0.8s_ease-in-out_infinite]" />
    </g>
  </svg>
);

const HighKneesAnimation = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <style>{`
      @keyframes hk-left {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-70deg); }
      }
      @keyframes hk-right {
        0%, 100% { transform: rotate(-70deg); }
        50% { transform: rotate(0deg); }
      }
    `}</style>
    <line x1="10" y1="110" x2="90" y2="110" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <circle cx="50" cy="15" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="50" y1="22" x2="50" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="50" y1="35" x2="35" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="50" y1="35" x2="65" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Alternating high knees */}
    <line x1="50" y1="58" x2="38" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '50px 58px' }} className="animate-[hk-left_0.6s_ease-in-out_infinite]" />
    <line x1="50" y1="58" x2="62" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: '50px 58px' }} className="animate-[hk-right_0.6s_ease-in-out_infinite]" />
  </svg>
);

// --- Core exercises ---
const PlankAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full">
    <line x1="5" y1="68" x2="115" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <g className="animate-pulse" style={{ animationDuration: '4s' }}>
      <circle cx="90" cy="35" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="84" y1="38" x2="30" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Forearms on ground */}
      <line x1="75" y1="40" x2="80" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="68" y1="41" x2="73" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs */}
      <line x1="30" y1="42" x2="15" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="42" x2="22" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    {/* Timer symbol */}
    <circle cx="55" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <text x="55" y="24" textAnchor="middle" fill="currentColor" fontSize="8" opacity="0.4">⏱</text>
  </svg>
);

const CrunchAnimation = () => (
  <svg viewBox="0 0 120 80" className="w-full h-full">
    <style>{`
      @keyframes crunch {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-25deg); }
      }
    `}</style>
    <line x1="5" y1="68" x2="115" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    {/* Lying down, upper body crunching up */}
    <g style={{ transformOrigin: '60px 60px' }} className="animate-[crunch_2s_ease-in-out_infinite]">
      <circle cx="85" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="79" y1="52" x2="55" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Hands behind head */}
      <line x1="80" y1="48" x2="88" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    {/* Bent legs (stay still) */}
    <line x1="55" y1="58" x2="35" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="35" y1="50" x2="30" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="55" y1="58" x2="40" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="40" y1="50" x2="38" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export default ExerciseAnimationDemo;
