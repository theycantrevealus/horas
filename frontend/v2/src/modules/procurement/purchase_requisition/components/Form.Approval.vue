<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <Form autocomplete="off" @submit.prevent="submitData">
    <Card>
      <template #content>
        <div class="field">
          <label for="itemFormRemark">Remark</label>
          <Editor v-model="remark" editorStyle="height: 220px" />
        </div>
      </template>
      <template #footer>
        <div class="flex flex-row-reverse">
          <Button
            label="Save"
            type="submit"
            icon="pi pi-save"
            class="p-button-success p-button-rounded p-button-raised button-sm m-2"
            @click="submitData($event)"
          />
          <Button
            id="userFormSubmit"
            label="Cancel"
            icon="pi pi-angle-left"
            class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
            @click="closeDialog"
          />
        </div>
      </template>
    </Card>
    <ConfirmPopup group="confirm_approval_changes"></ConfirmPopup>
  </Form>
</template>
<script lang="ts">
import { minLength, required } from '@vuelidate/validators'
import { mapActions, mapStores } from 'pinia'
import { storeCore } from '@/store/index.ts'
import { defineComponent } from 'vue'
import type { ProcurementPurchaseRequisitionApproval } from '../interfaces'
import { storeProcurementPurchaseRequisition } from '../store'

export default defineComponent({
  name: 'FormPurchaseRequisitionApproval',
  inject: {
    dialogRef: {
      from: 'dialogRef',
      default: () => ({ data: { mode: '', id: '', code: '', __v: 0 } }),
    },
  },
  data() {
    return {
      rendered: false,
      submitPermission: false,
      remark: '',
    }
  },
  computed: {
    ...mapStores(storeProcurementPurchaseRequisition),
  },
  validations() {
    return {
      code: '',
      name: {
        required,
        minLength: minLength(4),
      },
      remark: {},
    }
  },
  unmounted() {},
  async created() {
    this.rendered = true
  },
  async mounted() {
    this.UIToggleEditingData(true)
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    closeDialog(e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dialogRef: any = this.dialogRef
      this.UIToggleEditingData(false)
      dialogRef?.close({
        ...dialogRef?.data,
        response: e,
      })
    },
    async submitData(event: MouseEvent) {
      const confirmation = this.$confirm
      confirmation.require({
        group: 'confirm_approval_changes',
        target: event.currentTarget as HTMLElement,
        header: 'Confirmation',
        message: `Process data?`,
        acceptClass: 'p-button-warning',
        rejectClass: 'p-button-secondary',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dialogRef: any = this.dialogRef

          const parameter: ProcurementPurchaseRequisitionApproval = {
            remark: this.remark,
            __v: dialogRef?.data.v ?? 0,
          }

          if (dialogRef?.data.mode === 'ask_approval') {
            await this.procurementPurchaseRequisitionStore
              .askApproval(dialogRef?.data.id, parameter)
              .then((response) => {
                this.closeDialog(response)
              })
          } else if (dialogRef?.data.mode === 'approve') {
            await this.procurementPurchaseRequisitionStore
              .approve(dialogRef?.data.id, parameter)
              .then((response) => {
                this.closeDialog(response)
              })
          } else if (dialogRef?.data.mode === 'decline') {
            await this.procurementPurchaseRequisitionStore
              .decline(dialogRef?.data.id, parameter)
              .then((response) => {
                this.closeDialog(response)
              })
          }
        },
        reject: () => {
          //
        },
      })
    },
  },
})
</script>
