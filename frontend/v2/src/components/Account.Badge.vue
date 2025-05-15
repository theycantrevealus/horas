<template>
  <div class="flex overflow-hidden">
    <div
      class="border-circle w-2rem h-2rem m-2 font-bold flex align-items-center justify-content-center"
      :style="{ background: generateRandomColor(parse(first_name, last_name)), color: '#fff' }"
    >
      {{ parse(first_name, last_name) }}
    </div>
    <div class="flex-grow-1 flex align-items-center justify-content-center m-2">
      {{ last_name }}, {{ first_name }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'AccountBadge',
  props: {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
  },
  emits: ['display'],
  mounted() {},
  methods: {
    parse(first_name: string, last_name: string) {
      return `${first_name.charAt(0).toUpperCase()}${last_name.charAt(0).toUpperCase()}`
    },
    generateRandomColor(initial: string) {
      const hash = Array.from(initial.toUpperCase()).reduce(
        (acc, char) => acc + char.charCodeAt(0),
        0,
      )
      const hue = hash % 360
      const saturation = 50 + (hash % 50) // Random saturation between 50 and 100
      const lightness = 20 + (hash % 30) // Darker lightness between 20 and 50

      const hslToHex = (h: number, s: number, l: number) => {
        h /= 360
        s /= 100
        l /= 100
        let r, g, b
        if (s === 0) {
          r = g = b = l
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
          }
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s
          const p = 2 * l - q
          r = hue2rgb(p, q, h + 1 / 3)
          g = hue2rgb(p, q, h)
          b = hue2rgb(p, q, h - 1 / 3)
        }
        const toHex = (x: number) => {
          const hex = Math.round(x * 255).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        }
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`
      }

      return hslToHex(hue, saturation, lightness)
    },
  },
})
</script>
