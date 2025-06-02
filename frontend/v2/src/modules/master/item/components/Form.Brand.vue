<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <form autocomplete="off" @submit.prevent="submitData">
      <Card>
        <template #content>
          <div class="grid p-fluid">
            <div class="col-3">
              <div class="field">
                <label for="itemFormCode">{{ $t('master.item.brand.label.code.caption') }}</label>
                <InputText
                  id="itemFormCode"
                  v-model.trim="v$.code.$model"
                  :disabled="!allowDispatch('btnMasterItemBrandEdit')"
                  :placeholder="$t('master.item.brand.label.code.placeholder')"
                  type="text"
                />
                <Message v-if="v$.code.$errors.length > 0" severity="error" :closable="false">
                  <div v-for="(error, index) of v$.code.$errors" :key="index" class="error-msg">
                    {{ error.$message }}
                  </div>
                </Message>
              </div>
            </div>
            <div class="col-9">
              <div class="field">
                <label for="itemFormName">{{ $t('master.item.brand.label.name.caption') }}</label>
                <InputText
                  id="itemFormName"
                  v-model.trim="v$.name.$model"
                  :disabled="!allowDispatch('btnMasterItemBrandEdit')"
                  :placeholder="$t('master.item.brand.label.name.placeholder')"
                  type="text"
                />
                <Message v-if="v$.name.$errors.length > 0" severity="error" :closable="false">
                  <div v-for="(error, index) of v$.name.$errors" :key="index" class="error-msg">
                    {{ error.$message }}
                  </div>
                </Message>
              </div>
            </div>
            <div class="col-12">
              <div class="field">
                <label for="itemFormRemark">{{
                  $t('master.item.brand.label.remark.caption')
                }}</label>
                <Editor
                  v-model="v$.remark.$model"
                  :disabled="!allowDispatch('btnMasterItemBrandEdit')"
                  editorStyle="height: 320px"
                />
              </div>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex flex-row-reverse p-6">
            <Button
              label="Save"
              type="submit"
              :disabled="v$.$invalid && !allowDispatch('btnMasterItemBrandEdit')"
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
      <ConfirmPopup group="confirm_changes"></ConfirmPopup>
    </form>
  </div>
</template>
<script lang="ts">
import useVuelidate from '@vuelidate/core'
import { minLength, required } from '@vuelidate/validators'
import { mapActions, mapStores } from 'pinia'
import { storeCore } from '@/store/index.ts'
import { storeMasterItemBrand } from '@/modules/master/item/store'
import type {
  MasterItemBrandAddParameter,
  MasterItemBrandEditParameter,
} from '@/modules/master/item/brand/interfaces'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FormBrand',
  inject: {
    dialogRef: {
      from: 'dialogRef',
      default: () => ({ data: { mode: '', id: '', __v: 0 } }),
    },
  },
  setup() {
    return { v$: useVuelidate() }
  },
  data() {
    return {
      rendered: false,
      submitPermission: false,
      code: '',
      name: '',
      remark: '',
      v: 0,
    }
  },
  computed: {
    ...mapStores(storeMasterItemBrand),
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
    if (this.dialogRef?.data.mode === 'edit') {
      this.submitPermission = this.allowDispatch('btnMasterItemBrandEdit')
      await this.masterItemBrandStore
        .detail(this.dialogRef?.data.id)
        .then((response) => {
          const data = response.payload
          this.code = data?.code
          this.name = data?.name
          this.remark = data?.remark
          this.v = data?.__v
        })
        .catch(() => {
          //
        })
    } else {
      this.submitPermission = this.allowDispatch('btnMasterItemBrandAdd')
    }
    this.rendered = true
  },
  async mounted() {
    this.UIToggleEditingData(true)
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    closeDialog(e: any) {
      this.UIToggleEditingData(false)
      this.dialogRef?.close({
        ...this.dialogRef?.data,
        response: e,
      })
    },
    async submitData(event: MouseEvent) {
      const confirmation = this.$confirm
      confirmation.require({
        group: 'confirm_changes',
        target: event.currentTarget as HTMLElement,
        header: 'Confirmation',
        message: `Process data?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-warning',
        rejectClass: 'p-button-secondary',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          if (this.dialogRef?.data.mode === 'edit') {
            const parameter: MasterItemBrandEditParameter = {
              code: this.code,
              name: this.name,
              remark: this.remark,
              __v: this.v ?? 0,
            }

            await this.masterItemBrandStore
              .edit(this.dialogRef?.data.id, parameter)
              .then((response) => {
                this.closeDialog(response)
              })
          } else {
            const parameter: MasterItemBrandAddParameter = {
              code: this.code,
              name: this.name,
              remark: this.remark,
            }
            await this.masterItemBrandStore.add(parameter).then((response) => {
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
