<template>
  <q-page class="flex column">
    <div
      class="column"
      style="position: absolute; margin: 20px; z-index: 100; color: #ffffff"
    >
      <div class="row">
        <div v-for="(item, key) in prices" :key="key">
          <div class="row">
            <div style="font-size: 24px">{{ key }}</div>
          </div>
          <div class="flex-center row">
            <div
              :style="`font-size: 22px; font-weight: bold; color: ${
                item.d > 0
                  ? 'rgba(0, 250, 136, 0.8)'
                  : item.d < 0
                  ? 'rgba(255,82,82, 0.8)'
                  : '#ffffff'
              }`"
            >
              {{ item.lp }}
            </div>
            <div
              :style="`background-color: ${
                item.cp > 0 ? 'rgba(0, 150, 136, 0.8)' : 'rgba(255,82,82, 0.8)'
              }; padding 10px; border-radius: 4px; margin-left: 20px`"
            >
              {{ item.cp }}%
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top: 10px">
        <q-btn color="secondary" :label="durations[selectedDuration]">
          <q-menu auto-close>
            <q-list style="min-width: 100px">
              <q-item
                v-for="(item, key) in durations"
                :key="key"
                clickable
                @click="selectDuration(key)"
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
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
const { ipcRenderer, binanceGet } = window.electron;
// import { WsAPI, UserAPI, ChainId } from "@loopring-web/loopring-sdk";
import { createChart, CrosshairMode } from "lightweight-charts";
// import { binance_api } from "boot/axios";

export default defineComponent({
  name: "PageIndex",
  components: {},
  setup(props) {
    const prices = ref({
      LRCUSDT: {
        lt: 0, //last tick
        lp: 0, //last price
        cp: 0, //change percent
        d: 0, //differents
      },
    });

    let binanceId = 1;

    const getTimestamp = (timestamp) => {
      return timestamp / 1000;
    };

    const selectedDuration = ref("1d");
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
    const selectDuration = (key) => {
      binance.unSubscribe([`lrcusdt@kline_${selectedDuration.value}`]);
      selectedDuration.value = key;
      binance.subKlines(`LRCUSDT`, key);

      if (chart) {
        chart.applyOptions({
          timeScale: {
            timeVisible:
              selectedDuration.value.indexOf("m") > 0 ||
              selectedDuration.value.indexOf("h") > 0
                ? true
                : false,
          },
        });
      }
    };

    const klines = ref([]);
    const volumes = ref([]);
    const chartDiv = ref(null);
    var candleSeries = null;
    var volumeSeries = null;
    var chart = null;

    const setupBinance = () => {
      const ws = new WebSocket("wss://stream.binance.com:9443/stream");

      const subKlines = async (symbol, interval) => {
        const result = JSON.parse(
          await ipcRenderer.invoke(
            "binanceGet",
            JSON.stringify({
              path: "/api/v3/klines",
              params: {
                params: {
                  symbol,
                  interval,
                },
              },
            })
          )
        );

        klines.value = result.map((r) => {
          return {
            time: getTimestamp(parseInt(r[0])), // Open time
            open: parseFloat(r[1]), // Open
            high: parseFloat(r[2]), // High
            low: parseFloat(r[3]), // Low
            close: parseFloat(r[4]), // Close
            // msg.data.v, // Volume
            // msg.data.T, // Close time
            // msg.data.q, // Quote asset volume
            // msg.data.n, // Number of trades
            // msg.data.V, // Taker buy base asset volume
            // msg.data.Q, // Taker buy quote asset volume
            // msg.data.B, // Ignore.
          };
        });
        volumes.value = result.map((r) => {
          return {
            time: getTimestamp(parseInt(r[0])),
            value: parseFloat(r[5]),
            color:
              parseFloat(r[4]) - parseFloat(r[1]) > 0
                ? "rgba(0, 150, 136, 0.8)"
                : "rgba(255,82,82, 0.8)",
          };
        });

        if (candleSeries) {
          candleSeries.setData(klines.value);
          volumeSeries.setData(volumes.value);
        }

        subscribe([`${symbol}@kline_${selectedDuration.value}`.toLowerCase()]);
      };

      const subscribe = (params) => {
        console.log("Subscribing", params);
        ws.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: params,
            id: binanceId++,
          })
        );
      };

      const unSubscribe = (params) => {
        ws.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: params,
            id: binanceId++,
          })
        );
      };

      const onMessage = (event) => {
        try {
          if (event && event.data === "PING") {
            ws.send("PONG");
          } else if (event && event.data === "ping") {
            ws.send("pong");
          }

          const msg = JSON.parse(event.data);
          if (msg.data) {
            if (msg.data.e === "24hrTicker") {
              prices.value[msg.data.s] = {
                lt: parseFloat(msg.data.c), //last tick
                lp: parseFloat(msg.data.c).toFixed(4), //last price
                cp: parseFloat(msg.data.P).toFixed(2), //change percent
                d: parseFloat(msg.data.c) - prices.value[msg.data.s].lt, //differents
              };
              ipcRenderer.send("price-change", JSON.stringify(prices.value));
            } else if (msg.data.e === "aggTrade") {
              if (prices.value[msg.data.s]) {
                prices.value[msg.data.s].lp = parseFloat(msg.data.p).toFixed(4);
                prices.value[msg.data.s].d =
                  parseFloat(msg.data.p) - prices.value[msg.data.s].lp;
              }
              ipcRenderer.send("price-change", JSON.stringify(prices.value));
            } else if (msg.data.e === "kline") {
              if (klines.value.length > 0) {
                let kValues = msg.data.k;
                if (
                  klines.value[klines.value.length - 1].time ==
                  getTimestamp(parseInt(kValues.t))
                ) {
                  klines.value[klines.value.length - 1] = {
                    time: getTimestamp(parseInt(kValues.t)), // Open time
                    open: parseFloat(kValues.o), // Open
                    high: parseFloat(kValues.h), // High
                    low: parseFloat(kValues.l), // Low
                    close: parseFloat(kValues.c), // Close
                    // msg.data.v, // Volume
                    // msg.data.T, // Close time
                    // msg.data.q, // Quote asset volume
                    // msg.data.n, // Number of trades
                    // msg.data.V, // Taker buy base asset volume
                    // msg.data.Q, // Taker buy quote asset volume
                    // msg.data.B, // Ignore.
                  };
                  volumes.value[volumes.value.length - 1] = {
                    time: getTimestamp(parseInt(kValues.t)), // Open time
                    value: parseFloat(kValues.v), // Volume
                    color:
                      parseFloat(kValues.c) - parseFloat(kValues.o) > 0
                        ? "rgba(0, 150, 136, 0.8)"
                        : "rgba(255,82,82, 0.8)",
                  };
                } else {
                  klines.value.push({
                    time: getTimestamp(parseInt(kValues.t)), // Open time
                    open: parseFloat(kValues.o), // Open
                    high: parseFloat(kValues.h), // High
                    low: parseFloat(kValues.l), // Low
                    close: parseFloat(kValues.c), // Close
                    // msg.data.v, // Volume
                    // msg.data.T, // Close time
                    // msg.data.q, // Quote asset volume
                    // msg.data.n, // Number of trades
                    // msg.data.V, // Taker buy base asset volume
                    // msg.data.Q, // Taker buy quote asset volume
                    // msg.data.B, // Ignore.
                  });

                  volumes.value.push({
                    time: getTimestamp(parseInt(kValues.t)), // Open time
                    value: parseFloat(kValues.v), // Volume
                    color:
                      parseFloat(kValues.c) - parseFloat(kValues.o) > 0
                        ? "rgba(0, 150, 136, 0.8)"
                        : "rgba(255,82,82, 0.8)",
                  });
                }

                if (candleSeries) {
                  candleSeries.update(klines.value[klines.value.length - 1]);
                }
                if (volumeSeries) {
                  volumeSeries.update(volumes.value[volumes.value.length - 1]);
                }
              }
            } else {
              console.log("unhandled topic", msg);
            }
          } else {
            console.log(msg);
          }
        } catch (err) {
          console.log(err);
        }
      };

      ws.onopen = (event) => {
        ws.addEventListener("message", onMessage);
        subscribe(["lrcusdt@ticker", "lrcusdt@aggTrade"]);
        subKlines(`LRCUSDT`, selectedDuration.value);
      };
      ws.onclose = (event) => {
        ws.removeEventListener("message", onMessage);
        setTimeout(function () {
          setupBinance();
        }, 1000);
      };

      ws.onerror = function (err) {
        console.error(
          "Socket encountered error: ",
          err.message,
          "Closing socket"
        );
        ws.close();
      };

      return { subKlines, subscribe, unSubscribe };
    };

    // SETUP Loopring
    const lr_prices = ref({
      "LRC-USDT": {
        lt: 0, //last tick
        lp: 0, //last price
        cp: 0, //change percent
        d: 0, //differents
      },
    });
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
      chart = createChart(chartDiv.value, {
        width: innerWidth,
        height: innerHeight - 30,
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
    const onResize = () => {
      chart.resize(innerWidth, innerHeight - 30, true);

      console.log("width", "height", innerWidth, innerHeight);
    };

    onBeforeUnmount((_) => removeEventListener("resize", onResize));
    onMounted(() => {
      addEventListener("resize", onResize);

      nextTick(function () {
        // Code that will run only after the
        // entire view has been rendered
        setupChart();
      });
    });

    // setupLoopRing();
    const binance = setupBinance();

    return {
      prices,
      lr_prices,
      durations,
      selectedDuration,
      selectDuration,
      klines,
      volumes,
      chartDiv,
    };
  },
});
</script>
