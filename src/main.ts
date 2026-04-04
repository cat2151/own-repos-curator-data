import reposData from "../repos.json";
import { createAppController } from "./app-controller";
import { renderApp } from "./render";
import type { ReposData } from "./types";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app not found");
}

const controller = createAppController({
  appRoot: app,
  initialData: reposData as ReposData,
  initialRender: renderApp,
});

controller.mount();

if (import.meta.hot) {
  import.meta.hot.accept(["../repos.json", "./render"], (modules) => {
    const [dataModule, renderModule] = modules;

    if (dataModule?.default) {
      controller.setData(dataModule.default as ReposData);
    }

    if (renderModule?.renderApp) {
      controller.setRender(renderModule.renderApp);
    }

    controller.mount();
  });

  import.meta.hot.dispose(() => {
    controller.dispose();
  });
}
