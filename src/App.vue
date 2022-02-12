<template>
  <router-view />
</template>
<script>
import { defineComponent } from "vue";
import { initBinance } from "components/Exchanges/binance";

initBinance();

export default defineComponent({
  name: "App",
});
</script>
