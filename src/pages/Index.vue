<template>
  <q-page class="flex column">
    <div
      class="column"
      style="position: absolute; margin: 20px; z-index: 100; color: #ffffff"
    >
      <div class="column">
        <div class="row">
          <div style="font-size: 24px">{{ symbolName }}</div>
        </div>
        <div class="flex-center row">
          <div
            :style="`font-size: 22px; font-weight: bold; color: ${
              price.d > 0
                ? 'rgba(0, 250, 136, 0.8)'
                : price.d < 0
                ? 'rgba(255,82,82, 0.8)'
                : '#ffffff'
            }`"
          >
            {{ price.lp }}
          </div>
          <div
            :style="`background-color: ${
              changePercentage > 0
                ? 'rgba(0, 150, 136, 0.8)'
                : 'rgba(255,82,82, 0.8)'
            }; padding 10px; border-radius: 4px; margin-left: 20px`"
          >
            {{ changePercentage }}%
          </div>
        </div>
      </div>
      <div style="margin-top: 10px">
        <q-btn color="secondary" :label="durations[selectedInterval]">
          <q-menu auto-close>
            <q-list style="min-width: 100px">
              <q-item
                v-for="(item, key) in durations"
                :key="key"
                clickable
                @click="selectInterval(key)"
              >
                <q-item-section>{{ item }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>
    <div ref="chartDiv" style="flex: 1; background-color: #131722"></div>
  </q-page>
</template>

<script>
import {
  defineComponent,
  ref,
  toRefs,
  reactive,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watchEffect,
} from "vue";
const { ipcRenderer } = window.electron;
// import { WsAPI, UserAPI, ChainId } from "@loopring-web/loopring-sdk";
import { createChart, CrosshairMode } from "lightweight-charts";
import { useBinance, CONNECTION_STATE } from "components/Exchanges/binance";

export default defineComponent({
  name: "PageIndex",
  components: {},
  setup(props) {
    const symbolName = ref("LRC / USDT");
    const symbol = ref("lrcusdt");
    const defaultInterval = "1d";
    const binance = useBinance();
    const klinesHandler = binance.setupKlines(symbol.value);
    const priceHandler = binance.setupPrice(symbol.value);

    watchEffect(async () => {
      if (binance.connection_state.value === CONNECTION_STATE.Connected) {
        klinesHandler.subscribe(defaultInterval);
        priceHandler.subscribe();
      }
    });

    watchEffect(() => {
      if (priceHandler.lastPrice.value) {
        ipcRenderer.send(
          "price-change",
          JSON.stringify({
            key: symbolName.value,
            ...priceHandler.lastPrice.value,
          })
        );
      }
    });

    watchEffect(() => {
      if (klinesHandler.klines.value) {
        if (candleSeries) {
          candleSeries.setData(klinesHandler.klines.value);
        }
      }
    });

    watchEffect(() => {
      if (klinesHandler.volumes.value) {
        if (volumeSeries) {
          volumeSeries.setData(klinesHandler.volumes.value);
        }
      }
    });

    watchEffect(() => {
      if (klinesHandler.lastKline.value) {
        if (candleSeries) {
          candleSeries.update(klinesHandler.lastKline.value);
        }
      }
    });

    watchEffect(() => {
      if (klinesHandler.lastVolume.value) {
        if (volumeSeries) {
          volumeSeries.update(klinesHandler.lastVolume.value);
        }
      }
    });

    const selectedInterval = ref("1d");
    const durations = {
      "1m": "1 minute",
      "3m": "3 minutes",
      "5m": "5 minutes",
      "15m": "15 minutes",
      "30m": "30 minutes",
      "1h": "1 hour",
      "2h": "2 hours",
      "4h": "4 hours",
      "6h": "6 hours",
      "8h": "8 hours",
      "12h": "12 hours",
      "1d": "1 day",
      "3d": "3 days",
      "1w": "1 week",
      "1M": "1 month",
    };
    const selectInterval = async (key) => {
      klinesHandler.unSubscribe(selectedInterval.value);

      selectedInterval.value = key;
      if (binance.connection_state.value === CONNECTION_STATE.Connected) {
        klinesHandler.subscribe(key);
      }

      if (chart) {
        chart.applyOptions({
          timeScale: {
            timeVisible:
              selectedInterval.value.indexOf("m") > 0 ||
              selectedInterval.value.indexOf("h") > 0
                ? true
                : false,
          },
        });
      }
    };

    const chartDiv = ref(null);
    var candleSeries = null;
    var volumeSeries = null;
    var chart = null;
    var chartHeightDiff = 0;

    // SETUP Loopring
    // const lr_prices = ref({
    //   "LRC-USDT": {
    //     lt: 0, //last tick
    //     lp: 0, //last price
    //     cp: 0, //change percent
    //     d: 0, //differents
    //   },
    // });
    // const setupLoopRing = async () => {
    //   const wsApi = new WsAPI(ChainId.MAINNET);
    //   const wsKey = await wsApi.getWsKey();
    //   const loopring_ws = new WebSocket(
    //     `wss://ws.api3.loopring.io/v3/ws?wsApiKey=${wsKey.wsKey}`
    //   );

    //   const onLoopringMessage = (event) => {
    //     try {
    //       console.log(event);

    //       if (event && event.data === "ping") {
    //         loopring_ws.send("pong");
    //       }

    //       // const msg = JSON.parse(event.data);
    //       // if (msg.data.e === "24hrTicker") {
    //       //   prices.value[msg.data.s] = {
    //       //     lt: parseFloat(msg.data.c), //last tick
    //       //     lp: parseFloat(msg.data.c).toFixed(4), //last price
    //       //     cp: parseFloat(msg.data.P).toFixed(2), //change percent
    //       //     d: parseFloat(msg.data.c) - prices.value[msg.data.s].lt, //differents
    //       //   };
    //       // } else if (msg.data.e === "aggTrade") {
    //       //   prices.value[msg.data.s]
    //       //     ? (prices.value[msg.data.s].lp = parseFloat(msg.data.p).toFixed(
    //       //         4
    //       //       ))
    //       //     : null; //last price
    //       // } else {
    //       //   console.log(msg);
    //       // }
    //     } catch (err) {
    //       console.log(err);
    //     }
    //   };

    //   loopring_ws.onopen = (event) => {
    //     loopring_ws.addEventListener("message", onLoopringMessage);

    //     loopring_ws.send(
    //       JSON.stringify({
    //         op: "sub",
    //         sequence: 10000,
    //         unsubscribeAll: true,
    //         topics: [
    //           {
    //             topic: "ticker",
    //             market: "LRC-USDT",
    //           },
    //         ],
    //       })
    //     );
    //   };

    //   loopring_ws.onclose = (event) => {
    //     loopring_ws.removeEventListener("message", onLoopringMessage);
    //     setTimeout(function () {
    //       setupLoopRing();
    //     }, 1000);
    //   };

    //   loopring_ws.onerror = function (err) {
    //     console.error(
    //       "Socket encountered error: ",
    //       err.message,
    //       "Closing socket"
    //     );
    //     loopring_ws.close();
    //   };
    // };

    const setupChart = () => {
      chartHeightDiff = innerHeight - chartDiv.value.clientHeight;

      chart = createChart(chartDiv.value, {
        width: chartDiv.value.clientWidth, //innerWidth
        height: chartDiv.value.clientHeight, //innerHeight - 30,
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          scaleMargins: {
            top: 0.3,
            bottom: 0.25,
          },
          borderVisible: true,
        },
        layout: {
          backgroundColor: "#131722",
          textColor: "#d1d4dc",
        },
        grid: {
          vertLines: {
            color: "rgba(42, 46, 57, 0)",
          },
          horzLines: {
            color: "rgba(42, 46, 57, 0.6)",
          },
        },
      });

      candleSeries = chart.addCandlestickSeries({
        priceFormat: {
          type: "custom",
          formatter: (price) => {
            return price.toFixed(4);
          },
        },
      });
      // candleSeries.setData(this.klines.value);

      volumeSeries = chart.addHistogramSeries({
        color: "#26a69a",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "",
        scaleMargins: {
          top: 0.9,
          bottom: 0,
        },
      });
      // volumeSeries.setData(this.volumes.value);
    };

    const onSuspend = () => {
      // if (binance && binance.ws) {
      //   binance.ws.close();
      // }
    };

    const onResume = () => {
      binance.connectBinance();
    };

    const onResize = () => {
      chart.resize(innerWidth, innerHeight - chartHeightDiff, true);
    };

    onBeforeUnmount((_) => {
      removeEventListener("resize", onResize);
      // ipcRenderer.removeEventListener("computer-suspend", onSuspend);
      // ipcRenderer.removeEventListener("computer-resume", onResume);
    });
    onMounted(() => {
      addEventListener("resize", onResize);
      addEventListener("online", () => {
        binance.connectBinance();
      });
      // ipcRenderer.on("computer-suspend", onSuspend);
      // ipcRenderer.on("computer-resume", onResume);

      nextTick(function () {
        // Code that will run only after the
        // entire view has been rendered
        setupChart();
      });
    });

    binance.connectBinance();

    return {
      symbolName,
      symbol,
      price: priceHandler.lastPrice,
      changePercentage: priceHandler.lastChangePercentage,
      durations,
      selectedInterval,
      selectInterval,
      chartDiv,
    };
  },
});
</script>
