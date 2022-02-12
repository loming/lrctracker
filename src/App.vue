<template>
  <router-view />
</template>
<script>
import { defineComponent } from "vue";
import { initBinance, useBinance } from "components/Exchanges/binance";

initBinance();
useBinance().connectBinance();

export default defineComponent({
  name: "App",
});
</script>
