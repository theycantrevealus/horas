<script setup lang="ts">
import Toast from 'primevue/toast'
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="scale" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
  <Toast :position="'top-right'" />
</template>
