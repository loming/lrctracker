import {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  ipcMain,
  Menu,
  powerMonitor,
} from "electron";
import path from "path";
import os from "os";
import ansi from "ansicolor";
import Binance from "binance-api-node";
import keytar from "keytar";

let binanceClient = null;

try {
  keytar.getPassword("binance", "key").then((key) => {
    keytar.getPassword("binance", "secret").then((secret) => {
      binanceClient = new Binance({ apiKey: key, apiSecret: secret });
    });
  });
} catch (err) {
  console.log("no binance key / secret found", err);
}

import axios from "axios";
const binance_api = axios.create({
  baseURL: "https://api.binance.com",
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept ",
    "Access-Control-Allow-Methods": "POST, GET, PUT, OPTIONS, DELETE",
    "Access-Control-Max-Age": 3600,
  },
});

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

try {
  if (platform === "win32" && nativeTheme.shouldUseDarkColors === true) {
    require("fs").unlinkSync(
      path.join(app.getPath("userData"), "DevTools Extensions")
    );
  }
} catch (_) {}

let mainWindow;
let isQuiting;
let tray = null;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, "icons/icon.png"), // tray icon
    width: 1000,
    height: 600,
    skipTaskbar: true,
    useContentSize: true,
    frame: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: true,
      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
  });

  app.dock.setIcon(path.resolve(__dirname, "icons/icon.png"));

  mainWindow.loadURL(process.env.APP_URL);

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  mainWindow.on("minimize", function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("close", function (event) {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      app.dock.hide();
      event.returnValue = false;
    }
  });

  // FOR FUTURE NOTIFCATION in MAC DOCK
  // mainWindow.on("blur", () => {
  //   const badgeString = app.dock.getBadge();
  //   if (badgeString === "") {
  //     app.dock.setBadge("1");
  //   } else {
  //     app.dock.setBadge((parseInt(badgeString) + 1).toString());
  //   }
  // });

  // setTimeout(() => {
  //   app.dock.bounce();
  // }, 5000);

  tray = new Tray(path.resolve(__dirname, "icons/logo.png"));
  tray.setTitle("", { fontType: "monospacedDigit" });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show App",
        click: function () {
          mainWindow.show();
          app.dock.show();
        },
      },
      {
        label: "Quit",
        click: function () {
          isQuiting = true;
          app.quit();
        },
      },
    ])
  );
}

app.whenReady().then(() => {
  createWindow();

  // Menu.setApplicationMenu(
  //   Menu.buildFromTemplate([
  //     {
  //       label: "Sample",
  //       submenu: [
  //         { label: "About App", selector: "orderFrontStandardAboutPanel:" },
  //         {
  //           label: "Quit",
  //           accelerator: "CmdOrCtrl+Q",
  //           click: function () {
  //             // Nah nah nah... we are not quitting
  //             isQuiting = false;
  //             mainWindow.hide();
  //             app.dock.hide();
  //           },
  //         },
  //       ],
  //     },
  //   ])
  // );
});
app.on("before-quit", function () {
  isQuiting = true;
});

ipcMain.on("price-change", async (event, _price) => {
  event.reply("price-change-reply", "pong");
  let title = [];
  let price = JSON.parse(_price);

  // for (const [key, value] of Object.entries(prices)) {
  if (price.d > 0) {
    title.push(ansi.black(`${price.key}:${ansi.green(price.lp)}`));
  } else if (price.d === 0) {
    title.push(ansi.black(`${price.key}:${ansi.black(price.lp)}`));
  } else {
    title.push(ansi.black(`${price.key}:${ansi.red(price.lp)}`));
  }
  // }
  tray.setTitle(title.join(" "), { fontType: "monospacedDigit" });
});

ipcMain.handle("binanceGet", async (event, arg) => {
  const { path, params } = JSON.parse(arg);
  return JSON.stringify((await binance_api.get(path, params)).data);
});

ipcMain.handle("binanceGetKey", async (event, arg) => {
  let key = await keytar.getPassword("binance", "key");
  let secret = await keytar.getPassword("binance", "secret");

  return JSON.stringify({ key, secret });
});
ipcMain.handle("binanceSetKey", async (event, arg) => {
  try {
    const { key, secret } = JSON.parse(arg);
    keytar.setPassword("binance", "key", key);
    keytar.setPassword("binance", "secret", secret);

    binanceClient = new Binance({ apiKey: key, apiSecret: secret });

    return "Success";
  } catch (err) {
    console.log(err);
    return "Failure";
  }
});

ipcMain.handle("binanceAccountInfo", async (event, arg) => {
  return JSON.stringify(await binanceClient.accountInfo());
});

app.on("window-all-closed", () => {
  if (platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

powerMonitor.on("suspend", () => {
  ipcMain.emit("computer-suspend");
});

powerMonitor.on("resume", () => {
  ipcMain.emit("computer-resume");
});

powerMonitor.on("shutdown", () => {
  isQuiting = true;
  app.quit();
});
