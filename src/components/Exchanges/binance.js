import { ref, reactive } from "vue";
const { ipcRenderer } = window.electron;

export const CONNECTION_STATE = {
  Connecting: 0,
  Connected: 1,
  Disconnected: 2,
};

const binanceGet = async (path, params) => {
  return JSON.parse(
    await ipcRenderer.invoke(
      "binanceGet",
      JSON.stringify({
        path,
        params,
      })
    )
  );
};

let binanceStore = {};

export const useBinance = () => binanceStore;

export function initBinance() {
  const connection_state = ref(CONNECTION_STATE.Disconnected);

  let ws = null;

  const msgProcessors = {}; // It's for subscribe function to process the websocket's message, and return it's own reactive object
  let binanceId = 1;

  const connectBinance = () => {
    connection_state.value = CONNECTION_STATE.Disconnected;
    ws = new WebSocket("wss://stream.binance.com:9443/stream");
    connection_state.value = CONNECTION_STATE.Connecting;

    ws.onopen = (event) => {
      ws.addEventListener("message", onMessage);
      connection_state.value = CONNECTION_STATE.Connected;
    };
    ws.onclose = (event) => {
      ws.removeEventListener("message", onMessage);
      connection_state.value = CONNECTION_STATE.Disconnected;
      setTimeout(function () {
        connection_state.value = CONNECTION_STATE.Connecting;
        // binance = setupBinance();
        ws = new WebSocket("wss://stream.binance.com:9443/stream");
      }, 1000);
    };

    ws.onerror = function (err) {
      connection_state.value = CONNECTION_STATE.Disconnected;
      console.error(
        "Socket encountered error: ",
        err.message,
        "Closing socket"
      );
      ws.close();
    };
  };

  const _subscribe = (params) => {
    console.log("Subscribing", params);
    ws.send(
      JSON.stringify({
        method: "SUBSCRIBE",
        params: params,
        id: binanceId++,
      })
    );
  };

  const _unSubscribe = (params) => {
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
        if (msgProcessors[msg.stream]) {
          msgProcessors[msg.stream](msg.data);
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

  // Sub and Get KLine records
  const setupKlines = (symbol) => {
    const _lowerSymbol = symbol.toLowerCase();

    const lastKline = ref({});
    const lastVolume = ref({});
    const klines = ref([]);
    const volumes = ref([]);

    const subscribe = async (interval) => {
      // Get the KLine records from Binance's Restful API
      const result = await binanceGet("/api/v3/klines", {
        params: {
          symbol: symbol.toUpperCase(),
          interval,
        },
      });

      klines.value = result.map((r) => {
        return {
          time: parseInt(r[0]) / 1000, // Open time
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
          time: parseInt(r[0]) / 1000,
          value: parseFloat(r[5]),
          color:
            parseFloat(r[4]) - parseFloat(r[1]) > 0
              ? "rgba(0, 150, 136, 0.8)"
              : "rgba(255,82,82, 0.8)",
        };
      });

      // Subscribe latest KLine records from Binance's Websocket
      const _topicName = `${_lowerSymbol}@kline_${interval}`;
      _subscribe([_topicName]);

      // Define the processor
      const kLineProcessor = (data) => {
        if (data.e === "kline") {
          if (klines.value.length > 0) {
            let kValues = data.k;
            lastKline.value = {
              time: parseInt(kValues.t) / 1000, // Open time
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
            lastVolume.value = {
              time: parseInt(kValues.t) / 1000, // Open time
              value: parseFloat(kValues.v), // Volume
              color:
                parseFloat(kValues.c) - parseFloat(kValues.o) > 0
                  ? "rgba(0, 150, 136, 0.8)"
                  : "rgba(255,82,82, 0.8)",
            };
          }
        }
      };
      // Register the processor for websocket's messages
      msgProcessors[_topicName] = kLineProcessor;
    };

    // Provide unsubscribe function
    const unSubscribe = (interval) => {
      const _topicName = `${_lowerSymbol}@kline_${interval}`;

      // De-register the processor for websocket's messages
      delete msgProcessors[_topicName];

      _unSubscribe([_topicName]);
    };

    return { klines, volumes, lastKline, lastVolume, subscribe, unSubscribe };
  };

  // Subscribe latest Ticker and AggTrade records from Binance's Websocket
  const setupPrice = (symbol) => {
    const _lowerSymbol = symbol.toLowerCase();

    const lastPrice = ref({
      d: 0,
      lp: 0,
    });
    const lastChangePercentage = ref(0);

    const subscribe = () => {
      _subscribe([`${_lowerSymbol}@ticker`, `${_lowerSymbol}@aggTrade`]);

      const aggTradeProcessor = (data) => {
        if (data.e === "aggTrade") {
          lastPrice.value = {
            d: parseFloat(data.p).toFixed(6) - lastPrice.value.lp,
            lp: parseFloat(data.p).toFixed(6),
          };
        }
      };

      const tickerProcessor = (data) => {
        if (data.e === "24hrTicker") {
          if (lastPrice.value.d === 0) {
            lastPrice.value = {
              lp: parseFloat(data.c).toFixed(6),
              d: 0,
            };
          }

          lastChangePercentage.value = parseFloat(data.P).toFixed(2); //change percent
        }
      };

      // Register the processor for websocket's messages
      msgProcessors[`${_lowerSymbol}@ticker`] = tickerProcessor;
      msgProcessors[`${_lowerSymbol}@aggTrade`] = aggTradeProcessor;
    };

    const unSubscribe = () => {
      // De-register the processor for websocket's messages
      delete msgProcessors[`${_lowerSymbol}@ticker`];
      delete msgProcessors[`${_lowerSymbol}@aggTrade`];

      _unSubscribe([`${_lowerSymbol}@ticker`, `${_lowerSymbol}@aggTrade`]);
    };

    return { lastPrice, lastChangePercentage, subscribe, unSubscribe };
  };

  binanceStore = {
    connectBinance,
    connection_state,
    setupKlines,
    setupPrice,
  };
}
