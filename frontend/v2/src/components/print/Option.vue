<template>
  <Drawer
    v-model:visible="ui.drawer.visibility"
    header="Print Options"
    position="right"
    class="w-3"
    @update:visible="updateVisibility"
  >
    <div class="p-3">
      <FloatLabel class="w-full md:w-56" variant="on">
        <Select
          inputId="paper_size"
          v-model="ui.drawer.selectedPaperSize"
          :options="ui.drawer.paperSizes"
          optionLabel="name"
          placeholder="Select a paper size"
          class="w-full md:w-56"
          @change="updateInformation"
        /><label for="paper_size">Paper Size</label>
      </FloatLabel>

      <Message
        class="my-4"
        severity="info"
        icon="pi pi-info-circle"
        :pt="{ icon: { class: 'message-icon-top' } }"
      >
        <strong>Tractor feed margin:</strong> usually 1/4 inch (6-8 mm) to 1/2 inch (12-15 mm) on
        each side.
        <br />
        <strong>Holes:</strong> typically 1/4 inch (6 mm) in diameter, spaced 1/2 inch (12 mm) apart
        <Divider v-if="ui.hint !== ''" />
        {{ ui.hint }}
      </Message>

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
        hint: '',
        drawer: {
          visibility: false,
          selectedPaperSize: {
            code: 'con_small',
            name: 'Continuous Small',
            orientation: 'landscape',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          paperSizes: [
            {
              code: 'con_small',
              name: 'Continuous Short (241mm ⨉ 93mm)',
              orientation: 'landscape',
              description: 'Continuous form 241mm ⨉ 93mm',
            },
            {
              code: 'con_medium',
              name: 'Continuous Medium (241mm ⨉ 140mm)',
              orientation: 'landscape',
              description: 'Continuous form 241mm ⨉ 140mm',
            },
            {
              code: 'con_long',
              name: 'Continuous Long (241mm ⨉ 280mm)',
              orientation: 'portrait',
              description: 'Continuous form 241mm ⨉ 280mm',
            },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateInformation(event: any) {
      this.ui.hint = event.value.description
    },
    updateVisibility() {
      this.$emit('update-visibility', this.ui.drawer.visibility)
    },
    processPrint() {
      this.$emit('process-print', this.ui.drawer.selectedPaperSize)
    },
  },
})
</script>
