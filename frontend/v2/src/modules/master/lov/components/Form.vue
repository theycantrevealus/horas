<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <form autocomplete="off" @submit.prevent="submitLOV">
      <Card>
        <template #content>
          <div class="grid p-fluid">
            <div class="col-3">
              <div class="field">
                <label for="itemFormGroup">Group</label>
                <InputText
                  id="itemFormGroup"
                  v-model.trim="validator.group.$model"
                  :disabled="!submitPermission"
                  placeholder="LOV Group"
                  type="text"
                />
                <Message
                  v-if="validator.group.$errors.length > 0"
                  severity="error"
                  :closable="false"
                >
                  <div
                    v-for="(error, index) of validator.group.$errors"
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
                <label for="itemFormName">Name</label>
                <InputText
                  id="itemFormName"
                  v-model.trim="validator.name.$model"
                  :disabled="!submitPermission"
                  placeholder="LOV Name"
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
            <div class="col-3">
              <div class="field">
                <label for="itemFormParent">Parent</label>
                <DropdownLOV
                  v-if="rendered"
                  :selectedID="parent.id"
                  :selectedName="parent.name"
                  :disabled="!submitPermission"
                  @onSelect="selectedLOV"
                />
              </div>
            </div>
            <div class="col-9">
              <div class="field">
                <label for="itemFormValue">Value</label>
                <InputText
                  id="itemFormValue"
                  v-model.trim="validator.value.$model"
                  :disabled="!submitPermission"
                  placeholder="LOV Value"
                  type="text"
                />
                <Message
                  v-if="validator.value.$errors.length > 0"
                  severity="error"
                  :closable="false"
                >
                  <div
                    v-for="(error, index) of validator.value.$errors"
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
                <label for="itemFormRemark">Remark</label>
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
<script>
import useVuelidate from '@vuelidate/core'
import { minLength, required } from '@vuelidate/validators'
import DropdownLOV from '@/modules/master/lov/components/DropDown.vue'
import { mapActions, mapStores } from 'pinia'
import { storeCore } from '@/store/index.ts'
import { storeLOV } from '@/modules/master/lov/store'

export default {
  components: {
    DropdownLOV,
  },
  inject: ['dialogRef'],
  setup() {
    return { validator: useVuelidate() }
  },
  data() {
    return {
      rendered: false,
      submitPermission: false,
      group: '',
      name: '',
      value: '',
      parent: {
        id: '',
        name: '',
      },
      remark: '',
    }
  },
  computed: {
    ...mapStores(storeLOV),
  },
  validations: {
    name: {
      required,
      minLength: minLength(4),
    },
    parent: {},
    group: {},
    value: {},
    remark: {},
  },
  unmounted() {},
  async created() {
    if (this.dialogRef.data.mode === 'edit') {
      this.submitPermission = this.allowDispatch('btnEditLOV')
      await this.lovStore
        .detail(this.dialogRef.data.id)
        .then((response) => {
          console.log(response)
          const data = response.data.payload.data
          this.group = data?.group
          this.name = data?.name
          this.value = data?.value
          this.parent = data?.parent
          this.remark = data?.remark
        })
        .catch(() => {
          //
        })
    } else {
      this.submitPermission = this.allowDispatch('btnAddLOV')
    }
    this.rendered = true
  },
  async mounted() {
    this.UIToggleEditingData(true)
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    selectedLOV(event) {
      this.parent = event
    },
    closeDialog(e) {
      this.UIToggleEditingData(false)
      this.dialogRef.close({
        ...this.dialogRef.data,
        ...e,
      })
    },
    async submitData() {
      if (this.dialogRef.data.mode === 'edit') {
        // await LOVService.editLOV(this.dialogRef.data.id, {
        //   name: this.name,
        //   group: this.group,
        //   parent: this.parent,
        //   value: this.value,
        //   remark: this.remark
        // }).then(() => {
        //   this.closeDialog()
        // })
      } else {
        // await LOVService.addLOV({
        //   name: this.name,
        //   group: this.group,
        //   parent: this.parent,
        //   value: this.value,
        //   remark: this.remark
        // }).then(() => {
        //   this.closeDialog()
        // })
      }
    },
  },
}
</script>
