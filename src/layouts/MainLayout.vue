<template>
  <q-layout view="lHh Lpr lFf">
    <q-bar
      class="q-electron-drag"
      style="background-color: #131722; color: #ffffff"
    >
      <q-space />
    </q-bar>
    <!-- <q-header
      elevated
      style="-webkit-app-region: drag; height: 40px; background-color: #131722"
    >
    </q-header> -->

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "MainLayout",

  setup() {},
});
</script>
