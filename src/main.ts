import reposData from "../repos.json";
import { renderApp } from "./render";
import type { ReposData } from "./types";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app not found");
}

const appRoot = app;

let currentData = reposData as ReposData;
let activeTags: string[] = [];
let currentRender = renderApp;

function mount(): void {
  appRoot.innerHTML = currentRender(currentData, { activeTags });
}

function handleAppClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const clearButton = target.closest<HTMLElement>("[data-clear-tag-filter]");
  if (clearButton) {
    activeTags = [];
    mount();
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
