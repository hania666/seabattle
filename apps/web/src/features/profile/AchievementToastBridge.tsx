import { useEffect } from "react";
import { getDef, type AchievementId } from "../../lib/achievements";
import { useToast } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { sfx } from "../../lib/audio";

/**
 * Listens for `ach:unlocked` window events and surfaces a success toast.
 * Mounted once near the App root so any unlock from any screen is shown.
 */
export function AchievementToastBridge() {
  const toast = useToast();
  const t = useT();

  useEffect(() => {
    function onUnlock(ev: Event) {
      const detail = (ev as CustomEvent<{ id: AchievementId; reward: number }>).detail;
      if (!detail) return;
      const def = getDef(detail.id);
      if (!def) return;
      toast.push({
        tone: "success",
        title: `${def.icon} ${t("ach.toast.title")}`,
        message: t("ach.toast.body", {
          title: t(def.titleKey),
          reward: detail.reward,
        }),
      });
      try {
        sfx.victory();
      } catch {
        /* audio may be muted */
      }
    }
    window.addEventListener("ach:unlocked", onUnlock as EventListener);
    return () => window.removeEventListener("ach:unlocked", onUnlock as EventListener);
  }, [toast, t]);

  return null;
}
