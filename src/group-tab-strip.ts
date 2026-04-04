export type GroupTabRevealAlignment = "context" | "center";

export interface MountBehavior {
  focusGroupValue?: string;
  revealGroupValue?: string;
  revealGroupAlignment?: GroupTabRevealAlignment;
  restoreGroupTabScrollLeft?: number;
}

export interface GroupTabStripController {
  captureScrollPosition(): void;
  dispose(): void;
  getTargetScrollLeft(
    button: HTMLButtonElement,
    row: HTMLElement,
    alignment?: GroupTabRevealAlignment,
    tabs?: HTMLButtonElement[],
    activeIndex?: number,
  ): number;
  moveIntoContext(
    button: HTMLButtonElement,
    behavior?: ScrollBehavior,
    alignment?: GroupTabRevealAlignment,
  ): void;
  scroll(direction: "previous" | "next"): void;
  setup(behavior?: MountBehavior): void;
}

const GROUP_TAB_EDGE_TOLERANCE = 4;

function findGroupTabButton(container: ParentNode, groupValue: string): HTMLButtonElement | null {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>(".group-tab")];
  return buttons.find((button) => button.dataset.filterGroup === groupValue) ?? null;
}

export function createGroupTabStripController(appRoot: ParentNode): GroupTabStripController {
  let groupTabScrollLeft = 0;
  let groupTabResizeObserver: ResizeObserver | null = null;

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

  function getTargetScrollLeft(
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

  function moveIntoContext(
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

    const nextScrollLeft = getTargetScrollLeft(button, row, alignment, tabs, activeIndex);

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

  function captureScrollPosition(): void {
    const currentGroupTabRow = appRoot.querySelector<HTMLElement>(".group-tab-row");
    if (currentGroupTabRow) {
      groupTabScrollLeft = currentGroupTabRow.scrollLeft;
    }
  }

  function setup(behavior: MountBehavior = {}): void {
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
        moveIntoContext(
          button,
          behavior.restoreGroupTabScrollLeft === undefined ? "smooth" : "auto",
          revealGroupAlignment,
        );
      }

      syncGroupTabStripState();
    });
  }

  function scroll(direction: "previous" | "next"): void {
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

  function dispose(): void {
    groupTabResizeObserver?.disconnect();
    groupTabResizeObserver = null;
  }

  return {
    captureScrollPosition,
    dispose,
    getTargetScrollLeft,
    moveIntoContext,
    scroll,
    setup,
  };
}
