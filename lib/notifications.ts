"use client";

// Request notification permission from user
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch {
      return false;
    }
  }

  return false;
}

// Play notification sound chime
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

// Send Native Browser Push Notification (works on Android / Desktop / Mobile browsers)
export function sendBrowserNotification(title: string, options?: { body?: string; icon?: string; tag?: string }) {
  if (typeof window === "undefined") return;

  // 1. Play chime sound
  playNotificationSound();

  // 2. Trigger mobile vibration
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {}
  }

  // 3. Trigger native Notification if granted
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body: options?.body || "New update on One Hour Friend",
        icon: options?.icon || "/favicon.ico",
        tag: options?.tag || "onehourfriend",
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {}
  }

  // 4. Flash Tab Title
  flashTabTitle(`💬 ${title}`);
}

let titleFlashTimer: any = null;
let originalTitle = typeof document !== "undefined" ? document.title : "One Hour Friend";

export function flashTabTitle(alertText: string) {
  if (typeof document === "undefined") return;

  if (titleFlashTimer) clearInterval(titleFlashTimer);
  originalTitle = "One Hour Friend";

  let isAlert = true;
  let flashes = 0;

  titleFlashTimer = setInterval(() => {
    document.title = isAlert ? alertText : originalTitle;
    isAlert = !isAlert;
    flashes += 1;
    if (flashes >= 12) {
      clearInterval(titleFlashTimer);
      document.title = originalTitle;
    }
  }, 1000);

  const resetOnFocus = () => {
    clearInterval(titleFlashTimer);
    document.title = originalTitle;
    window.removeEventListener("focus", resetOnFocus);
  };
  window.addEventListener("focus", resetOnFocus);
}
