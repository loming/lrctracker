import { app, BrowserWindow, nativeTheme, Tray, ipcMain, Menu } from "electron";
import path from "path";
import os from "os";
import ansi from "ansicolor";

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

app.whenReady().then(createWindow);
app.on("before-quit", function () {
  isQuiting = true;
});

ipcMain.on("price-change", async (event, _prices) => {
  event.reply("price-change-reply", "pong");
  let title = [];
  let prices = JSON.parse(_prices);

  for (const [key, value] of Object.entries(prices)) {
    if (value.d > 0) {
      title.push(`${ansi.black(key)}:${ansi.green(value.lp)}`);
    } else if (value.d === 0) {
      title.push(`${ansi.black(key)}:${ansi.black(value.lp)}`);
    } else {
      title.push(`${ansi.black(key)}:${ansi.red(value.lp)}`);
    }
  }
  tray.setTitle(title.join(" "), { fontType: "monospacedDigit" });
});

ipcMain.handle("binanceGet", async (event, arg) => {
  const { path, params } = JSON.parse(arg);
  return JSON.stringify((await binance_api.get(path, params)).data);
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
