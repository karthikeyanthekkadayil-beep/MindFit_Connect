import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";

interface ExerciseDemoProps {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  exerciseName: string;
  autoPlay?: boolean;
}

const ExerciseDemo = ({ videoUrl, thumbnailUrl, exerciseName, autoPlay = true }: ExerciseDemoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Check if URL is a GIF
  const isGif = videoUrl?.toLowerCase().includes('.gif');

  useEffect(() => {
    if (videoRef.current && !isGif) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setHasError(true));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isGif]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // If no video URL, show placeholder or thumbnail
  if (!videoUrl || hasError) {
    return (
      <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={`${exerciseName} demonstration`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No demonstration video available
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Follow the instructions below
            </p>
          </div>
        )}
      </div>
    );
  }

  // For GIFs
  if (isGif) {
    return (
      <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden">
        <img 
          src={videoUrl}
          alt={`${exerciseName} demonstration`}
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-2 right-2">
          <span className="text-xs bg-black/60 text-white px-2 py-1 rounded">
            GIF
          </span>
        </div>
      </div>
    );
  }

  // For videos
  return (
    <div 
      className="relative aspect-video w-full bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        loop
        muted={isMuted}
        playsInline
        autoPlay={autoPlay}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-8 w-8 text-black ml-1" />
          </div>
        </div>
      )}
      
      {/* Controls Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={restartVideo}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseDemo;
