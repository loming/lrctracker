<template>
  <q-page class="flex row" style="height: 1px">
    <q-tabs
      v-model="selectedTab"
      @update:model-value="onTabChanged"
      no-caps
      vertical
      align="left"
      class="full-height text-white shadow-2 mdi-border-right q-pa-md"
      style="background-color: #131722"
    >
      <q-tab
        v-for="(value, key) in tabs"
        :key="key"
        :name="key"
        :class="key !== selectedTab ? 'tab-normal' : 'tab-active'"
      >
        <div>{{ `${value[0]} / ${value[1]}` }}</div>
        <div v-if="key !== selectedTab">{{ showPrice(priceRefs[key]) }}</div>
      </q-tab>
    </q-tabs>
    <q-tab-panels v-model="selectedTab" animated keep-alive class="col">
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
import { storeToRefs, mapWritableState } from "pinia";

export default defineComponent({
  name: "PageIndex",
  components: { KLineView },
  setup(props) {
    const tabs = ref({
      lrcusdt: ["LRC", "USDT"],
      lrceth: ["LRC", "ETH"],
      lrcbtc: ["LRC", "BTC"],
    });

    const mainStore = useMainStore();

    // extract specific store properties
    const { selectedTab, selectedPair } = storeToRefs(mainStore);

    const onTabChanged = (newTab) => {
      selectedPair.value = tabs.value[newTab];
    };

    // const selectedTab = ref("lrcusdt");
    const favouriteSymbol = ref("lrcusdt");

    const priceRefs = reactive({
      lrcusdt: 0,
      lrceth: 0,
      lrcbtc: 0,
    });
    const setPriceRef = (el) => {
      if (el) {
        priceRefs[el.symbol] = el.price;
      }
    };
    const showPrice = (data) => {
      if (data) {
        return `${data.lp}`;
      }

      return "";
    };

    return {
      tabs,
      selectedTab,
      onTabChanged,
      favouriteSymbol,
      setPriceRef,
      priceRefs: priceRefs,
      showPrice,
      isConnected: computed(
        () => useBinance().connection_state.value === CONNECTION_STATE.Connected
      ),
    };
  },
});
</script>
