<template>
  <q-page class="flex column">
    <q-tabs
      v-model="selectedTab"
      no-caps
      align="left"
      class="bg-black text-white shadow-2"
    >
      <q-tab
        v-for="(value, key) in tabs"
        :key="key"
        :name="key"
        :label="value + showPrice(priceRefs[key])"
      />
    </q-tabs>
    <q-tab-panels v-model="selectedTab" animated keep-alive>
      <q-tab-panel
        v-for="(value, key) in tabs"
        :key="key"
        :name="key"
        :label="value"
        class="q-pa-none"
      >
        <k-line-view
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
import { defineComponent, ref, reactive, toRefs } from "vue";
import KLineView from "src/components/KLineView.vue";

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
        return ` ${data.lp}`;
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
    };
  },
});
</script>
