<template>
  <q-page class="flex row" style="height: 1px">
    <q-tab-panels v-model="selectedTab" animated keep-alive style="width: 100%">
      <q-tab-panel
        v-for="(value, key) in tabs"
        :key="key"
        :name="key"
        class="q-pa-none"
      >
        <k-line-view
          v-if="isConnected"
          :symbol="key"
          :symbol-name="`${value[0]} / ${value[1]}`"
          :show-in-tray="favouriteSymbol === key"
          :ref="setPriceRef"
        />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script>
import { defineComponent, ref, reactive, computed } from "vue";
import KLineView from "components/KLineView.vue";
import { useBinance, CONNECTION_STATE } from "components/Exchanges/binance";
import { useMainStore } from "stores/main.pinia";
import { storeToRefs } from "pinia";

export default defineComponent({
  name: "PageIndex",
  components: { KLineView },
  setup(props) {
    const mainStore = useMainStore();

    // extract specific store properties
    const { tabs, selectedTab, priceRefs, favouriteSymbol } =
      storeToRefs(mainStore);

    // const selectedTab = ref("lrcusdt");

    const setPriceRef = (el) => {
      if (el) {
        priceRefs.value[el.symbol] = el.price.lp;
      }
    };

    return {
      tabs,
      selectedTab,
      setPriceRef,
      favouriteSymbol,
      isConnected: computed(
        () => useBinance().connection_state.value === CONNECTION_STATE.Connected
      ),
    };
  },
});
</script>
