<template>
  <ul v-if="items">
    <template v-for="(item, i) of items">
      <li
        v-if="visible(item) && !item.separator && item.show_on_menu"
        :key="item.label || i"
        :class="[
          {
            'layout-menuitem-category': root,
            'sol-active-menuitem': activeIndex === i && !item.to && !item.disabled,
          },
        ]"
        role="none"
      >
        <template v-if="root">
          <div :class="(getMenuModeStatus ? 'open' : '') + ' layout-menuitem-root-text'">
            <b>{{ getMenuModeStatus ? item.name : '' }}</b>
            <span class="material-icons-outlined material-symbols-outlined"> more_horiz </span>
          </div>
          <SideMenuAutoGen
            :items="visible(item) && item.items"
            @menuitem-click="$emit('menuitem-click', $event)"
          >
          </SideMenuAutoGen>
        </template>
        <template v-else>
          <RouterLink
            v-if="item.to && credential.pages[`page_${item.id}`] !== undefined"
            v-tooltip.right="item.name"
            :to="item.to"
            :class="[item.class, { disabled: item.disabled }]"
            :style="item.style"
            :target="item.target"
            role="menuitem"
            @click="onMenuItemClick($event, item, i)"
          >
            <i :class="item.icon"></i>
            <span class="material-icons-outlined material-symbols-outlined">{{ item.icon }}</span>
            <!-- This is a label -->
            <span :class="(getMenuModeStatus ? 'open' : '') + ' caption'">{{ item.name }}</span>
            <span v-if="item.items" class="material-icons menuitem-toggle-icon"
              >keyboard_arrow_down</span
            >
            <span v-if="item.badge" class="menuitem-badge">{{ item.badge }}</span>
          </RouterLink>
          <!--          :href="item.url || '#'"-->
          <a
            v-if="!item.to"
            :style="item.style"
            :class="[item.class, { disabled: item.disabled }]"
            :target="item.target"
            role="menuitem"
            @click="onMenuItemClick($event, item, i)"
          >
            <span class="material-icons-outlined material-symbols-outlined">{{ item.icon }}</span>
            <span :class="(getMenuModeStatus ? 'open' : '') + ' caption'">{{ item.name }}</span>
            <i
              v-if="item.items.length && getMenuModeStatus"
              class="pi pi-fw pi-angle-down menuitem-toggle-icon"
            ></i>
            <span v-if="item.badge" class="menuitem-badge">{{ item.badge }}</span>
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
<script lang="ts">
import { mapState, mapStores } from 'pinia'
import { storeCore } from '@/store'
import type { SideMenuItem } from '@/interfaces/side.menu'
import type { UICredential } from '@/interfaces/ui/credential'

export default {
  name: 'SideMenuAutoGen',
  props: {
    items: {
      type: Array as () => SideMenuItem[],
      default: () => [],
    },
    root: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['menuitem-click'],
  data() {
    return {
      credential: {} as UICredential,
      activeIndex: 0,
    }
  },
  computed: {
    ...mapStores(storeCore),
    ...mapState(storeCore, {
      getMenuModeStatus: 'getSidePanel',
    }),
  },
  mounted() {
    //
  },
  created() {
    this.coreStore.$subscribe((mutation, state) => {
      this.credential = {
        pages: state.setting.pages,
      }
    })
  },
  methods: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMenuItemClick(event, item: any, index: number) {
      if (item.disabled) {
        event.preventDefault()
        return
      }

      if (!item.to && !item.url) {
        event.preventDefault()
      } else {
        // This will load router without reload page
        this.$router.push(item.url)
        // this.toogleMenuStatus()
      }

      // execute command
      if (item.command) {
        item.command({ originalEvent: event, item: item })
      }

      this.activeIndex = index === this.activeIndex ? 0 : index

      this.$emit('menuitem-click', {
        originalEvent: event,
        item: item,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visible(item: any) {
      return typeof item.visible === 'function' ? item.visible() : item.visible !== false
    },
  },
}
</script>

<style scoped></style>
