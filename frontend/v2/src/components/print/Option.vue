<template>
  <Drawer v-model:visible="ui.drawer.visibility" header="Print Options" position="right">
    <div class="p-3">
      <FloatLabel class="w-full md:w-56" variant="on">
        <Select
          inputId="paper_size"
          v-model="ui.drawer.selectedPaperSize"
          :options="ui.drawer.paperSizes"
          optionLabel="name"
          placeholder="Select a paper size"
          class="w-full md:w-56"
        /><label for="paper_size">Paper Size</label>
      </FloatLabel>

      <div class="flex flex-row-reverse p-6">
        <Button
          class="p-button-info p-button-rounded p-button-raised button-sm"
          @click="processPrint"
          ><span class="material-icons">print</span> Print</Button
        >
      </div>
    </div>
  </Drawer>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'PrintOptions',
  data() {
    return {
      ui: {
        drawer: {
          visibility: false,
          selectedPaperSize: {
            code: 'con_small',
            name: 'Continuous Small',
            orientation: 'landscape',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          paperSizes: [
            { code: 'con_small', name: 'Continuous Small', orientation: 'landscape' },
            { code: 'con_medium', name: 'Continuous Medium', orientation: 'landscape' },
            { code: 'con_long', name: 'Continuous Long', orientation: 'portrait' },
          ],
        },
      },
    }
  },
  props: {
    visibility: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  watch: {
    visibility(newState) {
      this.ui.drawer.visibility = newState
    },
  },
  methods: {
    processPrint() {
      this.$emit('process-print', this.ui.drawer.selectedPaperSize)
    },
  },
})
</script>
