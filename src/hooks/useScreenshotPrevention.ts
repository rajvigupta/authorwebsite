import { useEffect, useRef } from 'react';

type ScreenshotPreventionOptions = {
  userEmail?: string;
  contentType: 'pdf' | 'text';
  onAttempt?: () => void;
};

export function useScreenshotPrevention({
  userEmail,
  contentType,
  onAttempt,
}: ScreenshotPreventionOptions) {
  const isBlurredRef = useRef(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const devtoolsOpenRef = useRef(false);
  const hasInitializedRef = useRef(false); // ✅ NEW: Prevent initial blur

  useEffect(() => {
    // ✅ FIXED: Central blur controller with safeguards
    const triggerBlur = (duration = 800, source?: string) => {
      // Don't blur during initial mount (first 2 seconds)
      if (!hasInitializedRef.current) {
        console.log('⏭️ Skipping blur during initialization from:', source);
        return;
      }

      if (isBlurredRef.current) return;

      console.log('🔒 Blur triggered by:', source);
      isBlurredRef.current = true;
      document.body.classList.add('screenshot-blur');

      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }

      blurTimeoutRef.current = window.setTimeout(() => {
        document.body.classList.remove('screenshot-blur');
        isBlurredRef.current = false;
      }, duration);
    };

    // ✅ FIXED: Allow initialization period
    setTimeout(() => {
      hasInitializedRef.current = true;
      console.log('✅ Screenshot prevention initialized');
    }, 2000);

    // === KEYBOARD PREVENTION ===
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      const prevented =
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) ||
        (e.key === 'Meta' && e.shiftKey && e.code === 'KeyS') ||
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) ||
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) &&
          ['c', 'C', 'a', 'A', 's', 'S'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) &&
          (e.key === 'p' || e.key === 'P'));

      if (prevented) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showWarning();
        logAttempt('keyboard');
        onAttempt?.();
        triggerBlur(800, 'keyboard-shortcut');
      }
    };

    // === CONTEXT MENU PREVENTION ===
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showWarning();
      logAttempt('right-click');
      onAttempt?.();
      triggerBlur(800, 'right-click');
    };

    // === CLIPBOARD PREVENTION ===
    const preventClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', '');
      showWarning();
      logAttempt('clipboard');
      onAttempt?.();
      triggerBlur(800, 'clipboard');
    };

    // === DRAG PREVENTION ===
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
    };

    // ✅ FIXED: Visibility change - only trigger after init + when actually hidden
    const handleVisibilityChange = () => {
      if (!hasInitializedRef.current) return; // Skip during init
      
      if (document.hidden) {
        triggerBlur(300, 'visibility-hidden');
        logAttempt('visibility-change');
        navigator.clipboard?.writeText('').catch(() => {});
      }
    };

    // ✅ FIXED: DevTools detection with better threshold
    const detectDevTools = () => {
      if (!hasInitializedRef.current) return; // Skip during init

      // More conservative threshold - only trigger if VERY different
      const threshold = 200; // Increased from 160
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
      
      // Only trigger if BOTH dimensions are significantly different
      const open = widthDiff > threshold && heightDiff > threshold;

      if (open && !devtoolsOpenRef.current) {
        devtoolsOpenRef.current = true;
        triggerBlur(1200, 'devtools-open');
        console.clear();
        logAttempt('devtools-open');
      }

      if (!open && devtoolsOpenRef.current) {
        devtoolsOpenRef.current = false;
      }
    };

    // === MOBILE SCREENSHOT DETECTION ===
    let volumePressed = false;
    let powerPressed = false;

    const handleVolumeButton = (e: KeyboardEvent) => {
      if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
        volumePressed = true;
        setTimeout(() => (volumePressed = false), 500);
      }
      if (e.key === 'Power') {
        powerPressed = true;
        setTimeout(() => (powerPressed = false), 500);
      }

      if (volumePressed && powerPressed) {
        showWarning();
        logAttempt('mobile-hardware-buttons');
        triggerBlur(1000, 'mobile-screenshot');
      }
    };

    // === TOUCHSCREEN GESTURE DETECTION ===
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 3) {
        touchStartTime = Date.now();
        e.preventDefault();
        showWarning();
        logAttempt('multi-touch-gesture');
      }
    };

    const handleTouchEnd = () => {
      const duration = Date.now() - touchStartTime;
      if (duration > 50 && duration < 500) {
        triggerBlur(500, 'multi-touch');
      }
    };

    // === LONG PRESS PREVENTION (iOS) ===
    const preventLongPress = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setTimeout(() => e.preventDefault(), 500);
      }
    };

    // === WARNING OVERLAY ===
    const showWarning = () => {
      if (document.getElementById('screenshot-warning-overlay')) return;

      const warning = document.createElement('div');
      warning.id = 'screenshot-warning-overlay';
      warning.className = 'screenshot-warning-overlay';
      warning.innerHTML = `
        <div class="screenshot-warning-content">
          <div class="text-6xl mb-4">⚠️</div>
          <h3 class="text-2xl font-bold mb-2">Protected Content</h3>
          <p>Screenshots and downloads are disabled</p>
          ${userEmail ? `<p class="text-xs mt-4 opacity-50">${userEmail}</p>` : ''}
        </div>
      `;
      document.body.appendChild(warning);
      setTimeout(() => warning.remove(), 2500);
    };

    // === LOGGING ===
    const logAttempt = (method: string) => {
      console.warn('🚨 Screenshot attempt detected:', {
        user: userEmail || 'Unknown',
        method,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    };

    // === APPLY LISTENERS ===
    document.addEventListener('keydown', preventKeyboardShortcuts, true);
    document.addEventListener('keyup', preventKeyboardShortcuts, true);
    document.addEventListener('contextmenu', preventContextMenu, true);
    document.addEventListener('copy', preventClipboard, true);
    document.addEventListener('cut', preventClipboard, true);
    document.addEventListener('paste', preventClipboard, true);
    document.addEventListener('dragstart', preventDrag, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleVolumeButton, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchstart', preventLongPress, { passive: false });

    // ✅ FIXED: Less aggressive DevTools checking (every 2s instead of 1s)
    const devToolsInterval = setInterval(detectDevTools, 2000);

    return () => {
      // Remove ALL event listeners
      document.removeEventListener('keydown', preventKeyboardShortcuts, true);
      document.removeEventListener('keyup', preventKeyboardShortcuts, true);
      document.removeEventListener('contextmenu', preventContextMenu, true);
      document.removeEventListener('copy', preventClipboard, true);
      document.removeEventListener('cut', preventClipboard, true);
      document.removeEventListener('paste', preventClipboard, true);
      document.removeEventListener('dragstart', preventDrag, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleVolumeButton, true);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchstart', preventLongPress);
      
      // Clear timers and blur
      clearInterval(devToolsInterval);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      document.body.classList.remove('screenshot-blur');
      isBlurredRef.current = false;
    };
  }, [userEmail, contentType, onAttempt]);
}
