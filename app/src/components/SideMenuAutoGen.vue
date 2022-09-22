<template>
  <ul v-if="items">
    <template v-for="(item, i) of items">
      <li
        v-if="visible(item) && !item.separator && item.show_on_menu === 'Y'"
        :key="item.label || i"
        :class="[{ 'layout-menuitem-category': root, 'sol-active-menuitem': activeIndex === i && !item.to && !item.disabled }]"
        role="none"
      >
        <template v-if="root">
          <div class="layout-menuitem-root-text">{{ item.label }}</div>
          <SideMenuAutoGen
            :items="visible(item) && item.items"
            @menuitem-click="$emit('menuitem-click', $event)"
          >
          </SideMenuAutoGen>
        </template>
        <template v-else>
          <router-link
            v-if="item.to && credential.pages[`page_${item.id}`] !== undefined"
            :to="item.to"
            :class="[item.class, { 'disabled': item.disabled }]"
            :style="item.style"
            :target="item.target"
            role="menuitem"
            @click="onMenuItemClick($event, item, i)"
          >
            <!--i :class="item.icon"></i-->
            <span class="material-icons-outlined">{{ item.icon }}</span>
            <span class="caption">{{ item.label }}</span>
            <!--i v-if="item.items" class="pi pi-fw pi-angle-down menuitem-toggle-icon"></i-->
            <span
              v-if="item.items"
              class="material-icons menuitem-toggle-icon"
            >keyboard_arrow_down</span>
            <span
              v-if="item.badge"
              class="menuitem-badge"
            >{{ item.badge }}</span>
          </router-link>
          <a
            v-if="!item.to"
            :href="item.url || '#'"
            :style="item.style"
            :class="[item.class, { 'disabled': item.disabled }]"
            :target="item.target"
            role="menuitem"
            @click="onMenuItemClick($event, item, i)"
          >
            <span class="material-icons-outlined">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span
              v-if="item.items"
              class="material-icons menuitem-toggle-icon"
            >keyboard_arrow_down</span>
            <span
              v-if="item.badge"
              class="menuitem-badge"
            >{{ item.badge }}</span>
          </a>
          <transition name="layout-submenu-wrapper">
            <SideMenuAutoGen
              v-show="activeIndex === i"
              :items="visible(item) && item.items"
              @menuitem-click="$emit('menuitem-click', $event)"
            ></SideMenuAutoGen>
          </transition>
        </template>
      </li>
      <li
        v-if="visible(item) && item.separator"
        :key="'separator' + i"
        class="menu-separator"
        :style="item.style"
        role="separator"
      ></li>
    </template>
  </ul>
</template>
<script>
import { mapState } from 'vuex'

export default {
  name: 'SideMenuAutoGen',
  props: {
    items: {
      type: Array,
      default: [],
    },
    root: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['menuitem-click'],
  data() {
    return {
      activeIndex: null,
    }
  },
  computed: {
    ...mapState(['credential']),
  },
  created() {
    console.log(this.items)
  },
  methods: {
    onMenuItemClick(event, item, index) {
      if (item.disabled) {
        event.preventDefault()
        return
      }

      if (!item.to && !item.url) {
        event.preventDefault()
      }

      // execute command
      if (item.command) {
        item.command({ originalEvent: event, item: item })
      }

      this.activeIndex = index === this.activeIndex ? null : index

      this.$emit('menuitem-click', {
        originalEvent: event,
        item: item,
      })
    },
    visible(item) {
      return typeof item.visible === 'function'
        ? item.visible()
        : item.visible !== false
    },
  },
}
</script>

<style scoped>
</style>
