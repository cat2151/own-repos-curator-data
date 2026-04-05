import { getAppTitle } from "./render";
import type { RenderOptions } from "./render";
import {
  createGroupTabStripController,
  type GroupTabRevealAlignment,
  type MountBehavior,
} from "./group-tab-strip";
import type { ReposData } from "./types";

export type AppRenderer = (data: ReposData, options?: RenderOptions) => string;

export interface AppController {
  dispose(): void;
  mount(behavior?: MountBehavior): void;
  setData(data: ReposData): void;
  setRender(render: AppRenderer): void;
}

interface AppControllerOptions {
  appRoot: HTMLDivElement;
  initialData: ReposData;
  initialRender: AppRenderer;
}

export function createAppController(options: AppControllerOptions): AppController {
  const { appRoot, initialData, initialRender } = options;

  let currentData = initialData;
  let currentRender = initialRender;
  let activeTags: string[] = [];
  let activeGroup: string | null = null;
  let isHelpOpen = false;

  const groupTabs = createGroupTabStripController(appRoot);
  function mount(behavior: MountBehavior = {}): void {
    groupTabs.captureScrollPosition();
    document.title = getAppTitle(currentData);
    appRoot.innerHTML = currentRender(currentData, { activeTags, activeGroup, isHelpOpen });
    groupTabs.setup(behavior);
  }

  function applyGroupChange(nextGroup: string | null, behavior: MountBehavior = {}): void {
    if (activeGroup === nextGroup) {
      return;
    }

    activeGroup = nextGroup;
    activeTags = [];
    mount(behavior);
  }

  function getGroupChangeBehavior(
    groupButton: HTMLElement,
    nextGroupValue: string,
  ): MountBehavior & { isTabButton: boolean } {
    const row = groupButton.closest<HTMLElement>(".group-tab-row");
    const isTabButton = Boolean(row && groupButton instanceof HTMLButtonElement);
    const revealGroupAlignment: GroupTabRevealAlignment = isTabButton ? "center" : "context";
    const restoreGroupTabScrollLeft = isTabButton && row && groupButton instanceof HTMLButtonElement
      ? groupTabs.getTargetScrollLeft(groupButton, row, "center")
      : undefined;

    return {
      isTabButton,
      focusGroupValue: isTabButton ? nextGroupValue : undefined,
      revealGroupValue: nextGroupValue,
      revealGroupAlignment,
      restoreGroupTabScrollLeft,
    };
  }

  function handleGroupButtonClick(groupButton: HTMLElement): void {
    if (groupButton instanceof HTMLButtonElement && groupButton.disabled) {
      return;
    }

    const nextGroupValue = groupButton.dataset.filterGroup;
    if (!nextGroupValue) {
      return;
    }

    const nextGroup = nextGroupValue === "all" ? null : nextGroupValue;
    const { isTabButton, ...behavior } = getGroupChangeBehavior(groupButton, nextGroupValue);

    if (activeGroup === nextGroup) {
      if (isTabButton && groupButton instanceof HTMLButtonElement) {
        groupButton.focus({ preventScroll: true });
        groupTabs.moveIntoContext(groupButton, "smooth", "center");
      }
      return;
    }

    applyGroupChange(nextGroup, behavior);
  }

  function handleTagButtonClick(tagButton: HTMLElement): void {
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

  function handleClick(event: MouseEvent): void {
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
        groupTabs.scroll(direction);
      }
      return;
    }

    const groupButton = target.closest<HTMLElement>("[data-filter-group]");
    if (groupButton) {
      handleGroupButtonClick(groupButton);
      return;
    }

    const tagButton = target.closest<HTMLElement>("[data-filter-tag]");
    if (tagButton) {
      handleTagButtonClick(tagButton);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
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
      groupTabs.moveIntoContext(nextTab);
      return;
    }

    applyGroupChange(nextGroup, {
      focusGroupValue: nextGroupValue,
      revealGroupValue: nextGroupValue,
      restoreGroupTabScrollLeft: groupTabs.getTargetScrollLeft(nextTab, row, "center", tabs, nextIndex),
    });
  }

  appRoot.addEventListener("click", handleClick);
  appRoot.addEventListener("keydown", handleKeydown);

  function dispose(): void {
    groupTabs.dispose();
    appRoot.removeEventListener("click", handleClick);
    appRoot.removeEventListener("keydown", handleKeydown);
  }

  function setData(data: ReposData): void {
    currentData = data;
  }

  function setRender(render: AppRenderer): void {
    currentRender = render;
  }

  return {
    dispose,
    mount,
    setData,
    setRender,
  };
}
