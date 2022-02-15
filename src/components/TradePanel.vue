<template>
  <div class="trader-title flex-center column fit">
    <div class="col-auto full-width">
      <q-img
        src="~assets/icon.png"
        spinner-color="white"
        style="
          height: 32px;
          max-width: 32px;
          margin-right: 10px;
          margin-top: -5px;
        "
      /><strong>LRC</strong> Trader
    </div>
    <div class="col-auto full-width row reverse">
      <q-card class="col trader-card">
        <q-card-section class="q-pb-none">
          <div class="text-h6">{{ selectedPair[0] }}</div>
          <div class="text-h5 cursor-pointer">
            {{ finalBase1 }}
            <q-popup-edit
              :model-value="finalBase1"
              auto-save
              v-slot="scope"
              @update:modelValue="saveFinalBase1"
            >
              <q-input
                v-model="scope.value"
                dense
                autofocus
                @keyup.enter="scope.set"
              />
            </q-popup-edit>
          </div>
          <q-slider
            v-model="base1"
            color="deep-orange"
            trackColor="grey"
            :min="minBase1"
            :max="maxBase1"
          />
          <div class="text-h6 rounded-borders text-red-5 text-center">Sell</div>
        </q-card-section>

        <q-separator dark />

        <q-card-actions class="column">
          <div
            v-for="tradeValue in tradeButtonValues"
            v-bind:key="tradeValue"
            class="col full-width q-pa-xs"
          >
            <q-btn
              class="full-width"
              :label="`${tradeValue * 100}%`"
              color="red-5"
              rounded
              @click="onSell(tradeValue)"
            />
          </div>
        </q-card-actions>
      </q-card>

      <q-card class="col trader-card">
        <q-card-section class="q-pb-none">
          <div class="text-h6">{{ selectedPair[1] }}</div>
          <div class="text-h5 cursor-pointer">
            {{ finalBase2 }}
            <q-popup-edit
              :model-value="finalBase2"
              auto-save
              v-slot="scope"
              @update:modelValue="saveFinalBase2"
            >
              <q-input
                v-model="scope.value"
                dense
                autofocus
                @keyup.enter="scope.set"
              />
            </q-popup-edit>
          </div>
          <q-slider
            v-model="base2"
            color="deep-orange"
            trackColor="grey"
            :min="minBase2"
            :max="maxBase2"
          />
          <div class="text-h6 rounded-borders text-green-5 text-center">
            Buy
          </div>
        </q-card-section>

        <q-separator dark />

        <q-card-actions class="column">
          <div
            v-for="tradeValue in tradeButtonValues"
            v-bind:key="tradeValue"
            class="col full-width q-pa-xs"
          >
            <q-btn
              class="full-width"
              :label="`${tradeValue * 100}%`"
              color="green-5"
              rounded
              @click="onBuy(tradeValue)"
            />
          </div>
        </q-card-actions>
      </q-card>
    </div>
    <div class="col-auto">
      <q-toolbar class="text-white shadow-2">
        <q-toolbar-title>Orders</q-toolbar-title>
      </q-toolbar>
    </div>
    <div class="col fit">
      <q-scroll-area class="col full-width full-height">
        <q-list bordered>
          <q-item
            v-for="order in binanceOrders"
            :key="order.orderId + '_' + updatedBinanceOrders"
            class="q-my-sm"
            clickable
            v-ripple
          >
            <q-item-section avatar>
              <q-avatar
                :color="order.side === 'BUY' ? 'green-5' : 'red-5'"
                size="1.5em"
                text-color="white"
              >
                {{ order.side[0] }}
              </q-avatar>
            </q-item-section>

            <q-item-section class="trade-panel-history">
              <q-item-label class="text-weight-bold">{{
                formatTime(new Date(order.time || order.transactTime))
              }}</q-item-label>
              <q-item-label
                >Type:
                <span class="text-weight-bold">{{
                  order.type
                }}</span></q-item-label
              >
              <q-item-label v-if="order.type !== 'MARKET'"
                >Price: {{ order.price }}</q-item-label
              >
              <q-item-label
                >Orig Qty:
                <span class="text-weight-bold">{{
                  order.origQty
                }}</span></q-item-label
              >
              <q-item-label
                >Exed Qty:
                <span class="text-weight-bold">{{
                  order.executedQty
                }}</span></q-item-label
              >
            </q-item-section>

            <q-item-section side>
              <q-icon
                v-if="order.status === 'FILLED'"
                name="done"
                color="green-5"
                size="1em"
              />
              <q-icon
                v-else-if="order.status === 'CANCELED'"
                name="cancel"
                color="red-5"
                size="1em"
              />
              <q-spinner-orbit v-else color="yellow-5" size="1em" />
              <q-tooltip>
                {{ order.status }}
              </q-tooltip>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, watch, watchEffect } from "vue";
const { ipcRenderer } = window.electron;
import { useMainStore } from "stores/main.pinia";
import { storeToRefs } from "pinia";
import useBinanceMixin from "components/Exchanges/useBinanceMixin";

export default defineComponent({
  name: "TradePanelView",
  components: {},
  setup(props) {
    const mainStore = useMainStore();
    const { selectedPair } = storeToRefs(mainStore);
    const { balances, getAccountInfo } = useBinanceMixin();

    const base1Price = ref(
      balances.value[selectedPair.value[0]]
        ? balances.value[selectedPair.value[0]].free
        : 0
    );
    const base2Price = ref(
      balances.value[selectedPair.value[1]]
        ? balances.value[selectedPair.value[1]].free
        : 0
    );
    const base1 = ref(1);
    const base2 = ref(1);
    const minBase1 = ref(0);
    const minBase2 = ref(0);
    const maxBase1 = ref(100);
    const maxBase2 = ref(100);
    const finalBase1 = ref(null);
    const finalBase2 = ref(null);
    const stepSize = ref(0.1);

    const binanceOrders = ref([]);
    const tradeButtonValues = [0.2, 0.4, 0.6, 0.8, 1.0];

    const loadExchangeInfo = async () => {
      const result = JSON.parse(
        await ipcRenderer.invoke(
          "binanceClient",
          JSON.stringify({
            path: "exchangeInfo",
            params: {
              symbol: selectedPair.value[0] + selectedPair.value[1],
            },
          })
        )
      );

      stepSize.value = parseFloat(
        result.symbols[0].filters.filter((f) => f.filterType === "LOT_SIZE")[0]
          .stepSize
      );
    };

    const allOrders = async () => {
      const result = JSON.parse(
        await ipcRenderer.invoke(
          "binanceClient",
          JSON.stringify({
            path: "allOrders",
            params: {
              symbol: selectedPair.value[0] + selectedPair.value[1],
              limit: 30,
            },
          })
        )
      ).reverse();

      binanceOrders.value = result;
    };

    const formatTime = (d) => {
      var datestring =
        ("0" + d.getDate()).slice(-2) +
        "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) +
        "-" +
        d.getFullYear() +
        " " +
        ("0" + d.getHours()).slice(-2) +
        ":" +
        ("0" + d.getMinutes()).slice(-2);

      return datestring;
    };

    const updateUntilDone = async (orderId) => {
      const result = JSON.parse(
        await ipcRenderer.invoke(
          "binanceClient",
          JSON.stringify({
            path: "getOrder",
            params: {
              symbol: selectedPair.value[0] + selectedPair.value[1],
              orderId,
              // price: '0.0002',
            },
          })
        )
      );

      binanceOrders.value.splice(
        binanceOrders.value.findIndex((o) => o.orderId === orderId),
        1,
        result
      );

      if (result.status !== "FILLED" && result.status !== "CANCELED") {
        setTimeout(() => {
          updateUntilDone(orderId);
        }, 1000);
      } else {
        getAccountInfo();
      }
    };

    const onBuy = async (percentage) => {
      let qty = parseFloat(finalBase2.value.replace(",", "")) * percentage;
      qty = qty - (qty % stepSize.value);

      const result = JSON.parse(
        await ipcRenderer.invoke(
          "binanceClient",
          JSON.stringify({
            path: "order",
            params: {
              symbol: selectedPair.value[0] + selectedPair.value[1],
              side: "BUY",
              quantity: qty.toString(),
              type: "MARKET",
              // price: '0.0002',
            },
          })
        )
      );

      if (result.isSuccess === false) {
        alert(result.errMsg);
      } else {
        getAccountInfo();
        binanceOrders.value.unshift(result);
        setTimeout(() => {
          updateUntilDone(result.orderId);
        }, 1000);
      }
    };

    const onSell = async (percentage) => {
      let qty = parseFloat(finalBase1.value.replace(",", "")) * percentage;
      qty = qty - (qty % stepSize.value);

      const result = JSON.parse(
        await ipcRenderer.invoke(
          "binanceClient",
          JSON.stringify({
            path: "order",
            params: {
              symbol: selectedPair.value[0] + selectedPair.value[1],
              side: "SELL",
              quantity: qty.toString(),
              type: "MARKET",
              // price: '0.0002',
            },
          })
        )
      );

      if (result.isSuccess === false) {
        alert(result.errMsg);
      } else {
        getAccountInfo();
        binanceOrders.value.unshift(result);
        setTimeout(() => {
          updateUntilDone(result.orderId);
        }, 1000);
      }
    };

    //Setup Prices event and functions
    const setupPrices = () => {
      const saveFinalBase1 = (value) => {
        let finalValue = parseFloat(value.replace(",", ""));
        if ((base1Price.value * minBase1.value) / maxBase1.value > finalValue) {
          finalValue = (base1Price.value * minBase1.value) / maxBase1.value;
        }
        if (finalValue > base1Price.value) {
          finalValue = base1Price.value;
        }

        base1.value = (finalValue / base1Price.value) * maxBase1.value;

        finalBase1.value = new Intl.NumberFormat("en-US", {
          maximumSignificantDigits: 4,
        }).format(finalValue);
      };

      const saveFinalBase2 = (value) => {
        let finalValue = parseFloat(value.replace(",", ""));
        if ((base2Price.value * minBase2.value) / maxBase2.value > finalValue) {
          finalValue = (base2Price.value * minBase2.value) / maxBase2.value;
        }
        if (finalValue > base2Price.value) {
          finalValue = base2Price.value;
        }

        base2.value = (finalValue / base2Price.value) * maxBase2.value;

        finalBase2.value = new Intl.NumberFormat("en-US", {
          maximumSignificantDigits: 4,
        }).format(finalValue);
      };

      watchEffect(() => {
        if (balances.value[selectedPair.value[0]]) {
          //save it and re-assign it to keep the same amount with different percent of total amount
          let _finalBase1Price = finalBase1.value;
          base1Price.value = balances.value[selectedPair.value[0]].free;

          if (_finalBase1Price) {
            saveFinalBase1(_finalBase1Price);
          }
        }
      });
      watchEffect(() => {
        if (balances.value[selectedPair.value[1]]) {
          //save it and re-assign it to keep the same amount with different percent of total amount
          let _finalBase2Price = finalBase2.value;
          base2Price.value = balances.value[selectedPair.value[1]].free;
          if (_finalBase2Price) {
            saveFinalBase2(_finalBase2Price);
          }
        }
      });

      watchEffect(() => {
        finalBase1.value = new Intl.NumberFormat("en-US", {
          maximumSignificantDigits: 4,
        }).format((base1Price.value * base1.value) / maxBase1.value);
      });

      watchEffect(() => {
        finalBase2.value = new Intl.NumberFormat("en-US", {
          maximumSignificantDigits: 4,
        }).format((base2Price.value * base2.value) / maxBase2.value);
      });

      return { saveFinalBase1, saveFinalBase2 };
    };

    loadExchangeInfo();
    allOrders();

    const updatedBinanceOrders = ref(0);
    watch([...binanceOrders.value], (value) => {
      updatedBinanceOrders.value = updatedBinanceOrders.value + 1;
    });

    return {
      selectedPair,
      base1Price,
      base2Price,
      base1,
      base2,
      minBase1,
      minBase2,
      maxBase1,
      maxBase2,
      finalBase1,
      finalBase2,
      tradeButtonValues,
      updatedBinanceOrders,
      binanceOrders,
      onBuy,
      onSell,
      formatTime,
      ...setupPrices(),
    };
  },
});
</script>
