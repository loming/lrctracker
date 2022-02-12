<template>
  <q-page class="flex row" style="height: 1px">
    <q-tabs
      v-model="selectedTab"
      no-caps
      vertical
      align="left"
      class="full-height text-white shadow-2 mdi-border-right q-pa-md"
      style="background-color: #131722"
    >
      <q-tab v-for="(value, key) in tabs" :key="key" :name="key">
        <div>{{ value }}</div>
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
          :symbol-name="value"
          :show-in-tray="favouriteSymbol === key"
          :ref="setPriceRef"
        />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script>
import { defineComponent, ref, reactive, computed } from "vue";
import KLineView from "src/components/KLineView.vue";
import { useBinance, CONNECTION_STATE } from "components/Exchanges/binance";

export default defineComponent({
  name: "PageIndex",
  components: { KLineView },
  setup(props) {
    const tabs = ref({
      lrcusdt: "LRC / USDT",
      lrceth: "LRC / ETH",
      lrcbtc: "LRC / BTC",
    });
    const selectedTab = ref("lrcusdt");
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
