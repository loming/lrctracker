<template>
  <q-layout view="lHh Lpr lFf">
    <q-header
      elevated
      style="
        -webkit-app-region: drag;
        color: #ffffff;
        background-color: #131722;
      "
    >
      <q-toolbar style="padding-left: 80px; padding-right: 16px">
        <!-- <q-scroll-area class="column bg-white" dark> -->
        <div class="row no-wrap reverse text-amber">
          <div
            v-for="coin in shownBalance"
            :key="coin.asset"
            class="q-pa-sm"
            style="white-space: nowrap"
          >
            {{ coin.asset }} <span class="balance-coin">{{ coin.free }}</span>
          </div>
          <div class="q-pa-sm">Your Balances:</div>
        </div>
        <!-- </q-scroll-area> -->
        <q-space />
        <q-btn
          v-if="isLoggedBinance"
          :color="isShowTrade ? 'deep-orange' : 'green'"
          push
          @click="isShowTrade = !isShowTrade"
        >
          <div class="row items-center no-wrap">
            <q-icon left :name="isShowTrade ? 'cancel' : 'check_circle'" />
            <div class="text-center">
              {{ isShowTrade ? "Hide" : "Show" }} Trade
            </div>
          </div>
        </q-btn>
        <q-btn
          round
          push
          size="12px"
          icon="settings"
          @click="binancePrompt = true"
        />
      </q-toolbar>
      <q-toolbar>
        <q-tabs
          v-model="selectedTab"
          @update:model-value="onTabChanged"
          no-caps
          :vertical="false"
          align="left"
          class="text-white shadow-2 q-px-md"
          style="background-color: #131722"
        >
          <q-tab
            v-for="(value, key) in tabs"
            :key="key"
            :name="key"
            :class="key !== selectedTab ? 'tab-normal' : 'tab-active'"
          >
            <div>{{ `${value[0]} / ${value[1]}` }}</div>
            <div v-if="key !== selectedTab">
              {{ priceRefs[key] }}
            </div>
          </q-tab>
        </q-tabs>
      </q-toolbar>
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

        <q-separator />
        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Reset Cache" color="red" @click="resetCache()" />
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
import useBinanceMixin from "components/Exchanges/useBinanceMixin";

export default defineComponent({
  name: "MainLayout",

  setup() {
    const binancePrompt = ref(false);

    let apiKey = ref("");
    let apiSecret = ref("");

    const mainStore = useMainStore();
    // extract specific store properties
    const {
      isLoggedBinance,
      isShowTrade,
      selectedPair,
      selectedTab,
      tabs,
      priceRefs,
    } = storeToRefs(mainStore);

    const { balances, getAccountInfo } = useBinanceMixin();

    const onTabChanged = (newTab) => {
      selectedPair.value = tabs.value[newTab];
    };

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

    watchEffect(() => {
      if (apiKey.value !== "") {
        getAccountInfo();
        isLoggedBinance.value = true;
      } else {
        isLoggedBinance.value = false;
      }
    });

    const shownBalance = computed(() => {
      return Object.keys(balances.value).reduce((result, key) => {
        if (selectedPair.value.indexOf(key) >= 0) {
          result.push({ asset: key, free: balances.value[key].free });
        }
        return result;
      }, []);
    });

    const resetCache = () => {
      mainStore.reset();
    };
    // watchEffect(async () => {
    //   if (isLoggedBinance.value) {
    //     console.log(
    //       await ipcRenderer.invoke(
    //         "binanceClient",
    //         JSON.stringify({
    //           path: "myTrades",
    //           params: {
    //             symbol: "LRCUSDT",
    //           },
    //         })
    //       )
    //     );
    //   }
    // });
    //await client.accountCoins()
    return {
      binancePrompt,
      isShowTrade,
      isLoggedBinance,
      apiKey,
      apiSecret,
      saveBinance,
      shownBalance,
      tabs,
      selectedTab,
      onTabChanged,
      priceRefs,
      resetCache,
    };
  },
});
</script>
