import { useEffect, useCallback } from "react";

export interface KeyboardShortcuts {
  onLaunch?: () => void;
  onCombat?: () => void;
  onToggleDevTools?: () => void;
  onTogglePerformance?: () => void;
  onToggleMic?: () => void;
  onExport?: () => void;
  onEscape?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for modifier keys
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      // Space: Launch/Abort
      if (event.code === "Space" && !isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        shortcuts.onLaunch?.();
        return;
      }

      // C: Toggle Combat Mode
      if (event.code === "KeyC" && !isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        shortcuts.onCombat?.();
        return;
      }

      // Ctrl/Cmd + K: Command Palette (future)
      if ((event.code === "KeyK" || event.key === "k") && isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        // Command palette can be implemented later
        return;
      }

      // Ctrl/Cmd + D: Toggle Dev Tools
      if ((event.code === "KeyD" || event.key === "d") && isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        shortcuts.onToggleDevTools?.();
        return;
      }

      // Ctrl/Cmd + P: Toggle Performance Profiler
      if ((event.code === "KeyP" || event.key === "p") && isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        shortcuts.onTogglePerformance?.();
        return;
      }

      // Ctrl/Cmd + M: Toggle Microphone
      if ((event.code === "KeyM" || event.key === "m") && isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        shortcuts.onToggleMic?.();
        return;
      }

      // Ctrl/Cmd + E: Export
      if ((event.code === "KeyE" || event.key === "e") && isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        shortcuts.onExport?.();
        return;
      }

      // Escape: Close modals/panels
      if (event.code === "Escape" && !isCtrl && !isShift && !isAlt) {
        shortcuts.onEscape?.();
        return;
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
};

