<template>
  <q-layout view="lHh Lpr lFf">
    <q-header
      class="flex"
      elevated
      style="
        -webkit-app-region: drag;
        padding: 8px;
        padding-right: 16px;
        color: #ffffff;
        background-color: #131722;
        padding-left: 80px;
      "
    >
      <q-scroll-area class="col">
        <div class="row no-wrap">
          <div
            v-for="coin in shownBalance"
            :key="coin.asset"
            class="q-pa-sm text-amber"
            style="white-space: nowrap"
          >
            {{ coin.asset }} - {{ coin.free }}
          </div>
        </div>
      </q-scroll-area>
      <q-space />
      <q-btn
        round
        push
        size="12px"
        icon="settings"
        @click="binancePrompt = true"
      />
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-dialog v-model="binancePrompt" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">API Key</div>
          <q-input dense autofocus type="password" v-model="apiKey" />
        </q-card-section>

        <q-card-section>
          <div class="text-h6">API Secret</div>
          <q-input dense autofocus type="password" v-model="apiSecret" />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Save" @click="saveBinance()" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script>
import { defineComponent, ref, watchEffect, computed } from "vue";
const { ipcRenderer } = window.electron;
import { useMainStore } from "stores/main.pinia";
import { storeToRefs } from "pinia";

export default defineComponent({
  name: "MainLayout",

  setup() {
    let binancePrompt = ref(false);
    let apiKey = ref("");
    let apiSecret = ref("");
    const accountInfo = ref({});
    const balances = ref([]);

    const main = useMainStore();
    // extract specific store properties
    const { selectedPair } = storeToRefs(main);

    const getBinanceKey = async () => {
      let result = await ipcRenderer.invoke("binanceGetKey");
      let { key, secret } = JSON.parse(result);
      apiKey.value = key;
      apiSecret.value = secret;
    };

    const saveBinance = async () => {
      await ipcRenderer.invoke(
        "binanceSetKey",
        JSON.stringify({
          key: apiKey.value,
          secret: apiSecret.value,
        })
      );

      binancePrompt.value = false;
    };

    getBinanceKey();

    const getAccountInfo = async () => {
      accountInfo.value = JSON.parse(
        await ipcRenderer.invoke("binanceAccountInfo")
      );
      balances.value = accountInfo.value.balances;
      // balances.value = accountInfo.value.balances.filter((b) => b.free > 0);
    };

    watchEffect(() => {
      if (apiKey.value !== "") {
        getAccountInfo();
      }
    });

    const shownBalance = computed(() => {
      return balances.value.filter((b) => {
        return selectedPair.value.indexOf(b.asset) >= 0;
      });
    });
    //await client.accountCoins()
    return { binancePrompt, apiKey, apiSecret, saveBinance, shownBalance };
  },
});
</script>
