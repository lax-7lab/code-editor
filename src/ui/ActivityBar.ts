import type { ActivityId } from "../types";

export type { ActivityId };

interface ActivityDef {
  id: ActivityId;
  label: string;
  icon: string;
  group: number;
}

const ACTIVITIES: ActivityDef[] = [
  { id: "explorer", label: "资源管理器", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`, group: 0 },
  { id: "outline", label: "大纲", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`, group: 0 },
  { id: "tasks", label: "任务", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, group: 1 },
  { id: "search", label: "搜索", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`, group: 1 },
  { id: "preview", label: "预览", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`, group: 1 },
  { id: "diff", label: "差异", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 8l3-3 3 3"/><path d="M13 16l3 3 3-3"/></svg>`, group: 1 },
  { id: "settings", label: "设置", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`, group: 1 },
];

export class ActivityBar {
  private container: HTMLElement;
  private onSelect: (activity: ActivityId) => void;
  private onDeselect?: () => void;
  private active: ActivityId | null = null;
  private buttons: Map<ActivityId, HTMLButtonElement> = new Map();

  constructor(
    container: HTMLElement,
    onSelect: (activity: ActivityId) => void,
    onDeselect?: () => void
  ) {
    this.container = container;
    this.onSelect = onSelect;
    this.onDeselect = onDeselect;
    container.classList.add("activity-bar");
    this.render();
  }

  private render(): void {
    let lastGroup = -1;
    for (const activity of ACTIVITIES) {
      if (activity.group !== lastGroup && lastGroup !== -1) {
        const divider = document.createElement("div");
        divider.className = "activity-divider";
        this.container.appendChild(divider);
      }
      lastGroup = activity.group;

      const btn = document.createElement("button");
      btn.className = "activity-btn";
      btn.setAttribute("data-activity", activity.id);
      btn.title = activity.label;
      btn.innerHTML = activity.icon;
      btn.addEventListener("click", () => this.handleClick(activity.id));
      this.container.appendChild(btn);
      this.buttons.set(activity.id, btn);
    }
  }

  private handleClick(activity: ActivityId): void {
    if (this.active === activity) {
      this.active = null;
      this.updateHighlight();
      this.onDeselect?.();
      return;
    }
    this.active = activity;
    this.updateHighlight();
    this.onSelect(activity);
  }

  private updateHighlight(): void {
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle("active", id === this.active);
    }
  }

  setActive(activity: ActivityId | null): void {
    this.active = activity;
    this.updateHighlight();
  }
}
