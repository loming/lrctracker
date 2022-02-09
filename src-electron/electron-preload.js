/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 */

// import { contextBridge, Tray } from "electron";

// contextBridge.exposeInMainWorld("myAPI", {
//   showPrices: (_prices) => {
//     let title = [];
//     let prices = JSON.parse(_prices);

//     for (const [key, value] of Object.entries(prices)) {
//       title.push(key + ":" + value.lastPrice);
//     }
//     // tray && tray.setTitle(title.join(" "), { fontType: "monospacedDigit" });
//   },
// });

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer,
});
