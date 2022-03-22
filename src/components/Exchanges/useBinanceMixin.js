import { defineComponent } from "vue";
const { ipcRenderer } = window.electron;
import { useMainStore } from "stores/main.pinia";
import { storeToRefs } from "pinia";

export default function () {
  const mainStore = useMainStore();
  // extract specific store properties
  const { balances } = storeToRefs(mainStore);

  const getAccountInfo = async () => {
    const accountInfo = JSON.parse(
      await ipcRenderer.invoke(
        "binanceClient",
        JSON.stringify({
          path: "accountInfo",
        })
      )
    );
    console.log(accountInfo);
    accountInfo.balances.map((b) => {
      balances.value[b.asset] = {
        free: b.free,
        locked: b.locked,
      };
    });
    // balances.value = accountInfo.value.balances.filter((b) => b.free > 0);
  };

  return { balances, getAccountInfo };
}
