<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <form autocomplete="off" @submit.prevent="submitData">
      <Card>
        <template #content>
          <div class="grid p-fluid">
            <div class="col-3">
              <div class="field">
                <label for="itemFormCode">{{ $t('master_item_brand.form.code.caption') }}</label>
                <InputText
                  id="itemFormCode"
                  v-model.trim="validator.code.$model"
                  :disabled="!submitPermission"
                  :placeholder="$t('master_item_brand.form.code.placeholder')"
                  type="text"
                />
                <Message
                  v-if="validator.code.$errors.length > 0"
                  severity="error"
                  :closable="false"
                >
                  <div
                    v-for="(error, index) of validator.code.$errors"
                    :key="index"
                    class="error-msg"
                  >
                    {{ error.$message }}
                  </div>
                </Message>
              </div>
            </div>
            <div class="col-9">
              <div class="field">
                <label for="itemFormName">{{ $t('master_item_brand.form.name.caption') }}</label>
                <InputText
                  id="itemFormName"
                  v-model.trim="validator.name.$model"
                  :disabled="!submitPermission"
                  :placeholder="$t('master_item_brand.form.name.placeholder')"
                  type="text"
                />
                <Message
                  v-if="validator.name.$errors.length > 0"
                  severity="error"
                  :closable="false"
                >
                  <div
                    v-for="(error, index) of validator.name.$errors"
                    :key="index"
                    class="error-msg"
                  >
                    {{ error.$message }}
                  </div>
                </Message>
              </div>
            </div>
            <div class="col-12">
              <div class="field">
                <label for="itemFormRemark">{{
                  $t('master_item_brand.form.remark.caption')
                }}</label>
                <Editor v-model="validator.remark.$model" editorStyle="height: 320px" />
              </div>
            </div>
          </div>
        </template>
        <template #footer>
          <Toolbar>
            <template #start>
              <Button
                id="userFormSubmit"
                label="Cancel"
                icon="pi pi-angle-left"
                severity="danger"
                class="button-rounded"
                @click="closeDialog"
              />
            </template>

            <template #end>
              <Button
                v-if="submitPermission"
                label="Save"
                type="submit"
                :disabled="validator.$invalid"
                icon="pi pi-save"
                severity="success"
                class="mr-2 button-rounded"
                @click="submitData"
              />
            </template>
          </Toolbar>
        </template>
      </Card>
    </form>
  </div>
</template>
<script lang="ts">
import useVuelidate from '@vuelidate/core'
import { minLength, required } from '@vuelidate/validators'
import { mapActions, mapStores } from 'pinia'
import { storeCore } from '@/store/index.ts'
import { storeMasterItemBrand } from '@/modules/master/item/brand/store'
import type {
  MasterItemBrandAddParameter,
  MasterItemBrandEditParameter,
} from '@/modules/master/item/brand/interfaces'
import { defineComponent } from 'vue'

export default defineComponent({
  inject: ['dialogRef'],
  // inject: ['dialogRef'] as unknown as {
  //   dialogRef: { data: { mode: string; id?: string; __v?: number } }
  // },
  setup() {
    return { validator: useVuelidate() }
  },
  data() {
    return {
      rendered: false,
      submitPermission: false,
      code: '',
      name: '',
      remark: '',
    }
  },
  computed: {
    ...mapStores(storeMasterItemBrand),
  },
  validations: {
    code: '',
    name: {
      required,
      minLength: minLength(4),
    },
    remark: {},
  },
  unmounted() {},
  async created() {
    if (this.dialogRef?.data.mode === 'edit') {
      this.submitPermission = this.allowDispatch('btnEditMasterItemBrand')
      await this.masterItemBrandStore
        .detail(this.dialogRef.data.id)
        .then((response) => {
          const data = response.payload.data
          this.code = data?.code
          this.name = data?.name
          this.remark = data?.remark
        })
        .catch(() => {
          //
        })
    } else {
      this.submitPermission = this.allowDispatch('btnAddMasterItemBrand')
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
    async submitData() {
      if (this.dialogRef?.data.mode === 'edit') {
        const parameter: MasterItemBrandEditParameter = {
          code: this.code,
          name: this.name,
          remark: this.remark,
          __v: this.dialogRef?.data.__v ?? 0,
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
  },
})
</script>
