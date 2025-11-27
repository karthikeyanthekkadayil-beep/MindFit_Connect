import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw } from "lucide-react";

interface BreathingExerciseProps {
  exercise: {
    id: string;
    name: string;
    inhale_seconds: number;
    hold_seconds: number | null;
    exhale_seconds: number;
    rest_seconds: number | null;
    cycles: number;
  };
  onComplete: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale' | 'rest';

export const BreathingExercise = ({ exercise, onComplete }: BreathingExerciseProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [timeLeft, setTimeLeft] = useState(exercise.inhale_seconds);
  const [totalTime, setTotalTime] = useState(exercise.inhale_seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const phaseSequence: Phase[] = ['inhale', 'hold', 'exhale', 'rest'].filter(p => {
    if (p === 'hold') return exercise.hold_seconds && exercise.hold_seconds > 0;
    if (p === 'rest') return exercise.rest_seconds && exercise.rest_seconds > 0;
    return true;
  }) as Phase[];

  const getPhaseTime = (p: Phase): number => {
    switch (p) {
      case 'inhale': return exercise.inhale_seconds;
      case 'hold': return exercise.hold_seconds || 0;
      case 'exhale': return exercise.exhale_seconds;
      case 'rest': return exercise.rest_seconds || 0;
    }
  };

  const getPhaseText = (p: Phase): string => {
    switch (p) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'rest': return 'Rest';
    }
  };

  const getPhaseColor = (p: Phase): string => {
    switch (p) {
      case 'inhale': return 'from-blue-500 to-cyan-500';
      case 'hold': return 'from-yellow-500 to-orange-500';
      case 'exhale': return 'from-green-500 to-emerald-500';
      case 'rest': return 'from-purple-500 to-pink-500';
    }
  };

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            moveToNextPhase();
            return totalTime;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, phase, currentCycle]);

  const moveToNextPhase = () => {
    const currentIndex = phaseSequence.indexOf(phase);
    if (currentIndex < phaseSequence.length - 1) {
      const nextPhase = phaseSequence[currentIndex + 1];
      setPhase(nextPhase);
      const nextTime = getPhaseTime(nextPhase);
      setTimeLeft(nextTime);
      setTotalTime(nextTime);
    } else {
      if (currentCycle < exercise.cycles) {
        setCurrentCycle(prev => prev + 1);
        setPhase('inhale');
        const nextTime = getPhaseTime('inhale');
        setTimeLeft(nextTime);
        setTotalTime(nextTime);
      } else {
        setIsActive(false);
        onComplete();
      }
    }
  };

  const toggleExercise = () => {
    setIsActive(!isActive);
  };

  const resetExercise = () => {
    setIsActive(false);
    setCurrentCycle(1);
    setPhase('inhale');
    setTimeLeft(exercise.inhale_seconds);
    setTotalTime(exercise.inhale_seconds);
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const circleScale = phase === 'inhale' ? 1.5 : phase === 'exhale' ? 0.7 : 1;

  return (
    <Card className="w-full">
      <CardContent className="p-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-2">{exercise.name}</h3>
            <p className="text-muted-foreground">
              Cycle {currentCycle} of {exercise.cycles}
            </p>
          </div>

          <div className="relative w-64 h-64 flex items-center justify-center">
            <div
              className={`absolute w-48 h-48 rounded-full bg-gradient-to-br ${getPhaseColor(phase)} opacity-30 transition-transform duration-1000 ease-in-out`}
              style={{ transform: `scale(${circleScale})` }}
            />
            <div className="relative z-10 text-center">
              <div className="text-4xl font-bold mb-2">{timeLeft}s</div>
              <div className="text-xl text-muted-foreground">{getPhaseText(phase)}</div>
            </div>
          </div>

          <Progress value={progress} className="w-full" />

          <div className="flex gap-4">
            <Button
              onClick={toggleExercise}
              size="lg"
              className="w-32"
            >
              {isActive ? (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start
                </>
              )}
            </Button>
            <Button
              onClick={resetExercise}
              size="lg"
              variant="outline"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};