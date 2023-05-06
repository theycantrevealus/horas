<template>
  <router-view v-slot="{ Component }">
    <transition name="scale" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>
<script>
import {mapActions} from "vuex"

export default {
  name: 'Builder',
}
</script>
