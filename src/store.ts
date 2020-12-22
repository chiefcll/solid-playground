import { createStore } from "solid-utils";
import { uid, parseHash } from "./utils";

const defaultTabs: Tab[] = [
  {
    id: uid(),
    name: "app",
    type: "tsx",
    source:
      "import { render } from 'solid-js/web'\n\nconst App = () => <h1>Hello world</h1>\n\nrender(App, document.getElementById('app'))",
  },
];

export const compileMode = {
  SSR: { generate: "ssr", hydratable: true },
  DOM: { generate: "dom", hydratable: false },
  HYDRATABLE: { generate: "dom", hydratable: true },
} as const;

type ValueOf<T> = T[keyof T];

const [Store, useStore] = createStore(
  () => {
    const url = new URL(location.href);
    const initialTabs = url.hash && parseHash(url.hash.slice(1), defaultTabs);
    const params = Object.fromEntries(url.searchParams.entries());
    const tabs: Tab[] = initialTabs || defaultTabs;

    const [noHeader, noInteractive] = ["noHeader", "noInteractive"].map(
      (key) => key in params
    );

    return {
      current: tabs[0].id,
      currentCode: "",
      tabs,
      error: "",
      compiled: "",
      mode: "DOM" as keyof typeof compileMode,
      header: !noHeader,
      interactive: !noInteractive,
      isCompiling: false,
      get compileMode(): ValueOf<typeof compileMode> {
        return compileMode[this.mode];
      },
    };
  },

  (set, store) => ({
    resetError: () => set("error", ""),
    setCurrentTab: (current: string) => {
      set({ current });

      const idx = store.tabs.findIndex((tab) => tab.id === current);
      if (idx < 0) return;

      set({ currentCode: store.tabs[idx].source });
    },
    setTabName(id: string, name: string) {
      // FIXME: Use the below function, at the moment TS is not content
      // ref: https://github.com/ryansolid/solid/blob/master/documentation/store.md#setpath-changes
      // set("tabs", (tabs) => tabs.id === id, "name", name);

      const idx = store.tabs.findIndex((tab) => tab.id === id);
      if (idx < 0) return;

      set("tabs", idx, "name", name);
    },
    removeTab(id: string) {
      const idx = store.tabs.findIndex((tab) => tab.id === id);
      const tab = store.tabs[idx];

      if (!tab) return;

      const confirmDeletion = confirm(
        `Are you sure you want to delete ${tab.name}.${tab.type}?`
      );
      if (!confirmDeletion) return;

      // We want to redirect to another tab if we are deleting the current one
      if (store.current === id) {
        set({
          current: store.tabs[idx - 1].id,
          currentCode: store.tabs[idx - 1].source,
        });
      }

      set("tabs", (tabs) => [...tabs.slice(0, idx), ...tabs.slice(idx + 1)]);
    },
    getCurrentSource() {
      const idx = store.tabs.findIndex((tab) => tab.id === store.current);
      if (idx < 0) return;

      return store.tabs[idx].source;
    },
    setCurrentSource(source: string) {
      const idx = store.tabs.findIndex((tab) => tab.id === store.current);
      if (idx < 0) return;

      set("tabs", idx, "source", source);
    },
    addTab() {
      const nextId = uid();

      set({
        tabs: [
          ...store.tabs,
          {
            id: nextId,
            name: `tab${store.tabs.length}`,
            type: "tsx",
            source: "",
          },
        ],
        current: nextId,
        currentCode: "",
      });
    },
  })
);

export { Store, useStore };

export interface Tab {
  id: string;
  name: string;
  type: string;
  source: string;
}

export type ReplTab = Pick<Tab, "name" | "source">;
