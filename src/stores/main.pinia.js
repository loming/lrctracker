import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";

// main is the name of the store. It is unique across your application
// and will appear in devtools
export const useMainStore = defineStore("main", {
  // a function that returns a fresh state
  state: () => ({
    selectedTab: useLocalStorage("selectedTab", "lrcusdt"),
    selectedPair: useLocalStorage("selectedPair", ["LRC", "USDT"]),
  }),
  // optional getters
  getters: {
    // getters receive the state as first parameter
  },
  // optional actions
  actions: {
    reset() {
      // `this` is the store instance
      this.selectedTab = "lrcusdt";
    },
  },
});
