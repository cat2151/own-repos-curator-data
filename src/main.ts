import reposData from "../repos.json";
import { getAppTitle, renderApp } from "./render";
import type { ReposData } from "./types";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app not found");
}

const appRoot = app;

type GroupTabRevealAlignment = "context" | "center";

let currentData = reposData as ReposData;
let activeTags: string[] = [];
let activeGroup: string | null = null;
let isHelpOpen = false;
let currentRender = renderApp;
let groupTabScrollLeft = 0;
let groupTabResizeObserver: ResizeObserver | null = null;
const GROUP_TAB_EDGE_TOLERANCE = 4;

interface MountBehavior {
  focusGroupValue?: string;
  revealGroupValue?: string;
  revealGroupAlignment?: GroupTabRevealAlignment;
  restoreGroupTabScrollLeft?: number;
}

function findGroupTabButton(container: ParentNode, groupValue: string): HTMLButtonElement | null {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>(".group-tab")];
  return buttons.find((button) => button.dataset.filterGroup === groupValue) ?? null;
}

function getGroupTabElements(): {
  strip: HTMLElement;
  row: HTMLElement;
  previousButton: HTMLButtonElement | null;
  nextButton: HTMLButtonElement | null;
} | null {
  const strip = appRoot.querySelector<HTMLElement>("[data-group-tab-strip]");
  const row = strip?.querySelector<HTMLElement>(".group-tab-row");

  if (!strip || !row) {
    return null;
  }

  return {
    strip,
    row,
    previousButton: strip.querySelector<HTMLButtonElement>('[data-scroll-group-tabs="previous"]'),
    nextButton: strip.querySelector<HTMLButtonElement>('[data-scroll-group-tabs="next"]'),
  };
}

function syncGroupTabStripState(): void {
  const elements = getGroupTabElements();
  if (!elements) {
    return;
  }

  const { strip, row, previousButton, nextButton } = elements;
  const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
  const hasOverflow = maxScrollLeft > 1;
  const canScrollStart = hasOverflow && row.scrollLeft > 1;
  const canScrollEnd = hasOverflow && row.scrollLeft < maxScrollLeft - 1;

  groupTabScrollLeft = row.scrollLeft;
  strip.classList.toggle("is-scrollable", hasOverflow);
  strip.classList.toggle("can-scroll-start", canScrollStart);
  strip.classList.toggle("can-scroll-end", canScrollEnd);

  if (previousButton) {
    previousButton.disabled = !canScrollStart;
  }

  if (nextButton) {
    nextButton.disabled = !canScrollEnd;
  }
}

function getGroupTabVisibleInsets(row: HTMLElement): { start: number; end: number } {
  const strip = row.closest<HTMLElement>("[data-group-tab-strip]");
  if (!strip) {
    return { start: 0, end: 0 };
  }

  const rowRect = row.getBoundingClientRect();
  const previousButton = strip.querySelector<HTMLButtonElement>('[data-scroll-group-tabs="previous"]');
  const nextButton = strip.querySelector<HTMLButtonElement>('[data-scroll-group-tabs="next"]');
  const start = previousButton && !previousButton.disabled
    ? Math.max(0, previousButton.getBoundingClientRect().right - rowRect.left)
    : 0;
  const end = nextButton && !nextButton.disabled
    ? Math.max(0, rowRect.right - nextButton.getBoundingClientRect().left)
    : 0;

  return { start, end };
}

function setGroupTabScrollLeft(row: HTMLElement, scrollLeft: number): void {
  const previousScrollBehavior = row.style.scrollBehavior;
  row.style.scrollBehavior = "auto";
  row.scrollLeft = scrollLeft;
  row.style.scrollBehavior = previousScrollBehavior;
}

function getGroupTabCenterDelta(button: HTMLButtonElement, row: HTMLElement): number {
  const rowRect = row.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const { start, end } = getGroupTabVisibleInsets(row);
  const visibleWidth = Math.max(0, row.clientWidth - start - end);
  const targetCenter = rowRect.left + start + visibleWidth / 2;
  const buttonCenter = buttonRect.left + buttonRect.width / 2;

  return buttonCenter - targetCenter;
}

function scheduleGroupTabCenterCorrection(button: HTMLButtonElement): void {
  const row = button.closest<HTMLElement>(".group-tab-row");
  if (!row) {
    return;
  }

  const correctAlignment = (): void => {
    if (!button.isConnected) {
      return;
    }

    const currentRow = button.closest<HTMLElement>(".group-tab-row");
    if (!currentRow) {
      return;
    }

    const maxScrollLeft = Math.max(0, currentRow.scrollWidth - currentRow.clientWidth);
    const correctedScrollLeft = Math.max(
      0,
      Math.min(currentRow.scrollLeft + getGroupTabCenterDelta(button, currentRow), maxScrollLeft),
    );

    if (Math.abs(correctedScrollLeft - currentRow.scrollLeft) < 1) {
      syncGroupTabStripState();
      return;
    }

    currentRow.scrollTo({ left: correctedScrollLeft, behavior: "auto" });
    syncGroupTabStripState();
  };

  if ("onscrollend" in row) {
    row.addEventListener("scrollend", correctAlignment, { once: true });
    return;
  }

  window.setTimeout(correctAlignment, 180);
}

function moveGroupTabIntoContext(
  button: HTMLButtonElement,
  behavior: ScrollBehavior = "smooth",
  alignment: GroupTabRevealAlignment = "context",
): void {
  const row = button.closest<HTMLElement>(".group-tab-row");
  if (!row) {
    return;
  }

  const tabs = [...row.querySelectorAll<HTMLButtonElement>(".group-tab")];
  const activeIndex = tabs.indexOf(button);
  if (activeIndex < 0) {
    return;
  }

  const nextScrollLeft = getGroupTabTargetScrollLeft(button, row, alignment, tabs, activeIndex);

  if (Math.abs(nextScrollLeft - row.scrollLeft) < 1) {
    syncGroupTabStripState();
    return;
  }

  row.scrollTo({ left: nextScrollLeft, behavior });
  if (alignment === "center" && behavior === "smooth") {
    scheduleGroupTabCenterCorrection(button);
  }
  requestAnimationFrame(() => {
    syncGroupTabStripState();
  });
}

function getGroupTabTargetScrollLeft(
  button: HTMLButtonElement,
  row: HTMLElement,
  alignment: GroupTabRevealAlignment = "context",
  tabs: HTMLButtonElement[] = [...row.querySelectorAll<HTMLButtonElement>(".group-tab")],
  activeIndex: number = tabs.indexOf(button),
): number {
  if (activeIndex < 0) {
    return row.scrollLeft;
  }

  const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
  const activeLeft = button.offsetLeft;
  const activeRight = activeLeft + button.offsetWidth;
  let nextScrollLeft = row.scrollLeft;

  if (alignment === "center") {
    nextScrollLeft = row.scrollLeft + getGroupTabCenterDelta(button, row);
  } else {
    if (activeLeft < nextScrollLeft + GROUP_TAB_EDGE_TOLERANCE) {
      nextScrollLeft = activeLeft;
    } else if (activeRight > nextScrollLeft + row.clientWidth - GROUP_TAB_EDGE_TOLERANCE) {
      nextScrollLeft = activeRight - row.clientWidth;
    }

    const previousTab = activeIndex > 0 ? tabs[activeIndex - 1] : null;
    const nextTab = activeIndex < tabs.length - 1 ? tabs[activeIndex + 1] : null;
    const projectedStart = nextScrollLeft;
    const projectedEnd = nextScrollLeft + row.clientWidth;

    if (
      nextTab &&
      activeRight >= projectedEnd - GROUP_TAB_EDGE_TOLERANCE &&
      nextTab.offsetLeft + nextTab.offsetWidth > projectedEnd + GROUP_TAB_EDGE_TOLERANCE
    ) {
      nextScrollLeft = nextTab.offsetLeft + nextTab.offsetWidth - row.clientWidth;
    } else if (
      previousTab &&
      activeLeft <= projectedStart + GROUP_TAB_EDGE_TOLERANCE &&
      previousTab.offsetLeft < projectedStart - GROUP_TAB_EDGE_TOLERANCE
    ) {
      nextScrollLeft = previousTab.offsetLeft;
    }
  }

  return Math.max(0, Math.min(nextScrollLeft, maxScrollLeft));
}

function setupGroupTabStrip(behavior: MountBehavior = {}): void {
  groupTabResizeObserver?.disconnect();
  groupTabResizeObserver = null;

  const elements = getGroupTabElements();
  if (!elements) {
    return;
  }

  const { strip, row } = elements;
  const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
  const initialScrollLeft = Math.max(
    0,
    Math.min(behavior.restoreGroupTabScrollLeft ?? groupTabScrollLeft, maxScrollLeft),
  );
  setGroupTabScrollLeft(row, initialScrollLeft);
  row.addEventListener("scroll", syncGroupTabStripState, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    groupTabResizeObserver = new ResizeObserver(() => {
      syncGroupTabStripState();
    });
    groupTabResizeObserver.observe(strip);
    groupTabResizeObserver.observe(row);
  }

  const revealGroupValue = behavior.revealGroupValue;
  const focusGroupValue = behavior.focusGroupValue;
  const revealGroupAlignment = behavior.revealGroupAlignment ?? "context";

  syncGroupTabStripState();

  if (!revealGroupValue && !focusGroupValue) {
    return;
  }

  requestAnimationFrame(() => {
    const nextElements = getGroupTabElements();
    const nextRow = nextElements?.row;

    if (!nextRow) {
      return;
    }

    const groupValue = revealGroupValue ?? focusGroupValue;
    if (!groupValue) {
      return;
    }

    const button = findGroupTabButton(nextRow, groupValue);
    if (!button) {
      return;
    }

    if (focusGroupValue === groupValue) {
      button.focus({ preventScroll: true });
    }

    if (revealGroupValue === groupValue) {
      moveGroupTabIntoContext(
        button,
        behavior.restoreGroupTabScrollLeft === undefined ? "smooth" : "auto",
        revealGroupAlignment,
      );
    }

    syncGroupTabStripState();
  });
}

function mount(behavior: MountBehavior = {}): void {
  const currentGroupTabRow = appRoot.querySelector<HTMLElement>(".group-tab-row");
  if (currentGroupTabRow) {
    groupTabScrollLeft = currentGroupTabRow.scrollLeft;
  }

  document.title = getAppTitle(currentData);
  appRoot.innerHTML = currentRender(currentData, { activeTags, activeGroup, isHelpOpen });
  setupGroupTabStrip(behavior);
}

function scrollGroupTabs(direction: "previous" | "next"): void {
  const elements = getGroupTabElements();
  if (!elements) {
    return;
  }

  const { row } = elements;
  const tabs = [...row.querySelectorAll<HTMLButtonElement>(".group-tab")];
  if (tabs.length === 0) {
    return;
  }

  const rowStart = row.scrollLeft;
  const rowEnd = rowStart + row.clientWidth;
  let targetTab: HTMLButtonElement | undefined;

  if (direction === "next") {
    targetTab = tabs.find(
      (tab) => tab.offsetLeft + tab.offsetWidth > rowEnd + GROUP_TAB_EDGE_TOLERANCE,
    );
  } else {
    for (const tab of tabs) {
      if (tab.offsetLeft < rowStart - GROUP_TAB_EDGE_TOLERANCE) {
        targetTab = tab;
        continue;
      }
      break;
    }
  }

  if (targetTab) {
    targetTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    return;
  }

  const fallbackOffset = Math.max(row.clientWidth * 0.75, 160);
  row.scrollBy({
    left: direction === "next" ? fallbackOffset : -fallbackOffset,
    behavior: "smooth",
  });
}

function applyGroupChange(nextGroup: string | null, behavior: MountBehavior = {}): void {
  if (activeGroup === nextGroup) {
    return;
  }

  activeGroup = nextGroup;
  activeTags = [];
  mount(behavior);
}

function handleAppClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const helpToggle = target.closest<HTMLElement>("[data-help-toggle]");
  if (helpToggle) {
    isHelpOpen = !isHelpOpen;
    mount();
    return;
  }

  const clearButton = target.closest<HTMLElement>("[data-clear-tag-filter]");
  if (clearButton) {
    activeTags = [];
    mount();
    return;
  }

  const scrollButton = target.closest<HTMLButtonElement>("[data-scroll-group-tabs]");
  if (scrollButton) {
    const direction = scrollButton.dataset.scrollGroupTabs;
    if (direction === "previous" || direction === "next") {
      scrollGroupTabs(direction);
    }
    return;
  }

  const groupButton = target.closest<HTMLElement>("[data-filter-group]");
  if (groupButton) {
    if (groupButton instanceof HTMLButtonElement && groupButton.disabled) {
      return;
    }

    const nextGroupValue = groupButton.dataset.filterGroup;
    if (!nextGroupValue) {
      return;
    }

    const nextGroup = nextGroupValue === "all" ? null : nextGroupValue;
    const isTabButton = Boolean(groupButton.closest(".group-tab-row"));
    const targetGroupTabScrollLeft = isTabButton && groupButton instanceof HTMLButtonElement
      ? getGroupTabTargetScrollLeft(groupButton, groupButton.closest<HTMLElement>(".group-tab-row")!, "center")
      : undefined;
    if (activeGroup === nextGroup) {
      if (groupButton instanceof HTMLButtonElement && isTabButton) {
        groupButton.focus({ preventScroll: true });
        moveGroupTabIntoContext(groupButton, "smooth", "center");
      }
      return;
    }

    applyGroupChange(nextGroup, {
      focusGroupValue: isTabButton ? nextGroupValue : undefined,
      revealGroupValue: nextGroupValue,
      revealGroupAlignment: isTabButton ? "center" : "context",
      restoreGroupTabScrollLeft: targetGroupTabScrollLeft,
    });
    return;
  }

  const tagButton = target.closest<HTMLElement>("[data-filter-tag]");
  if (!tagButton) {
    return;
  }

  if (tagButton instanceof HTMLButtonElement && tagButton.disabled) {
    return;
  }

  const nextTag = tagButton.dataset.filterTag;
  if (!nextTag) {
    return;
  }

  activeTags = activeTags.includes(nextTag)
    ? activeTags.filter((tag) => tag !== nextTag)
    : [...activeTags, nextTag];
  mount();
}

appRoot.addEventListener("click", handleAppClick);

function handleAppKeydown(event: KeyboardEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const currentTab = target.closest<HTMLButtonElement>(".group-tab");
  const row = currentTab?.closest<HTMLElement>(".group-tab-row");
  if (!currentTab || !row) {
    return;
  }

  const tabs = [...row.querySelectorAll<HTMLButtonElement>(".group-tab")];
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < 0) {
    return;
  }

  let nextIndex = currentIndex;

  switch (event.key) {
    case "ArrowLeft":
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      break;
    case "ArrowRight":
      nextIndex = (currentIndex + 1) % tabs.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = tabs.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();

  const nextTab = tabs[nextIndex];
  const nextGroupValue = nextTab.dataset.filterGroup;
  if (!nextGroupValue) {
    return;
  }

  const nextGroup = nextGroupValue === "all" ? null : nextGroupValue;
  if (activeGroup === nextGroup) {
    nextTab.focus({ preventScroll: true });
    moveGroupTabIntoContext(nextTab);
    return;
  }

  applyGroupChange(nextGroup, {
    focusGroupValue: nextGroupValue,
    revealGroupValue: nextGroupValue,
    restoreGroupTabScrollLeft: getGroupTabTargetScrollLeft(nextTab, row, "center", tabs, nextIndex),
  });
}

appRoot.addEventListener("keydown", handleAppKeydown);

mount();

if (import.meta.hot) {
  import.meta.hot.accept(["../repos.json", "./render"], (modules) => {
    const [dataModule, renderModule] = modules;

    if (dataModule?.default) {
      currentData = dataModule.default as ReposData;
    }

    if (renderModule?.renderApp) {
      currentRender = renderModule.renderApp;
    }

    mount();
  });
}
