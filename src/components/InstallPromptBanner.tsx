import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user dismissed the banner before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);

    // Show banner for iOS if not dismissed recently (within 7 days)
    if (iOS && !standalone && daysSinceDismissed > 7) {
      setShowBanner(true);
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      if (daysSinceDismissed > 7) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or banner is hidden
  if (isStandalone || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 safe-area-bottom">
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-4 shadow-lg border border-white/10">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-white" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm">Install MindFit Connect</h3>
            {isIOS ? (
              <p className="text-white/80 text-xs mt-0.5">
                Tap <span className="inline-flex items-center"><svg className="w-4 h-4 mx-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L12 14M12 14L8 10M12 14L16 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg></span> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-white/80 text-xs mt-0.5">
                Add to home screen for the best experience
              </p>
            )}
          </div>
          
          {!isIOS && deferredPrompt && (
            <Button
              onClick={handleInstall}
              size="sm"
              className="flex-shrink-0 bg-white text-primary hover:bg-white/90 font-semibold"
            >
              <Download className="h-4 w-4 mr-1" />
              Install
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
