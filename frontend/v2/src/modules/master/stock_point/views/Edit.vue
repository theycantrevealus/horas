<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">
                {{ $t('master.stock_point.label.edit.title.caption') }}
              </p>
              <p class="text-blue-600">Doc Ver. {{ form.v }}</p>
            </template>
            <template #icons>
              <Button
                class="p-button-secondary p-button-rounded p-button-raised button-sm"
                @click="back"
                ><span class="material-icons">arrow_back</span>
                {{ $t('master.stock_point.button.edit.back.caption') }}</Button
              >
            </template>
          </Panel>
        </template>
        <template #content>
          <div class="grid">
            <div class="col-6 form-mode">
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  &nbsp;
                  <small>{{ $t('master.stock_point.input.code.caption') }}</small>
                </span>
                <div class="flex flex-col">
                  <InputText
                    class="inputtext-sm"
                    v-model="form.code"
                    :invalid="v$.form.code.$error"
                    @blur="v$.form.code.$touch()"
                    :placeholder="$t('master.stock_point.input.code.placeholder')"
                  />
                  <Message size="small" severity="secondary" variant="simple">
                    <p v-for="error of v$.form.code.$errors" :key="error.$uid">
                      {{ error.$message }}
                    </p>
                  </Message>
                </div>
              </div>
            </div>
            <div class="col-6 form-mode">
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  &nbsp;
                  <small>{{ $t('master.stock_point.input.name.caption') }}</small>
                </span>
                <div class="flex flex-col">
                  <InputText
                    class="inputtext-sm"
                    v-model="form.name"
                    :invalid="v$.form.name.$error"
                    @blur="v$.form.name.$touch()"
                    :placeholder="$t('master.stock_point.input.name.placeholder')"
                  />
                  <Message size="small" severity="secondary" variant="simple">
                    <p v-for="error of v$.form.name.$errors" :key="error.$uid">
                      {{ error.$message }}
                    </p>
                  </Message>
                </div>
              </div>
            </div>
            <div class="col-2 form-mode">
              <div class="flex flex-col gap-2">
                <label for="allow-grn">{{
                  $t('master.stock_point.input.allow_grn.caption')
                }}</label>
                <ToggleButton
                  id="allow_grn"
                  v-model="form.configuration.allow_grn"
                  onLabel="Yes"
                  offLabel="No"
                />
              </div>
            </div>
            <div class="col-2 form-mode">
              <div class="flex flex-col gap-2">
                <label for="allow-grn">{{
                  $t('master.stock_point.input.allow_incoming.caption')
                }}</label>
                <ToggleButton
                  id="allow_grn"
                  v-model="form.configuration.allow_incoming"
                  onLabel="Yes"
                  offLabel="No"
                />
              </div>
            </div>
            <div class="col-2 form-mode">
              <div class="flex flex-col gap-2">
                <label for="allow-grn">{{
                  $t('master.stock_point.input.allow_outgoing.caption')
                }}</label>
                <ToggleButton
                  id="allow_grn"
                  v-model="form.configuration.allow_outgoing"
                  onLabel="Yes"
                  offLabel="No"
                />
              </div>
            </div>
            <div class="col-2 form-mode">
              <div class="flex flex-col gap-2">
                <label for="allow-grn">{{
                  $t('master.stock_point.input.allow_destruction.caption')
                }}</label>
                <ToggleButton
                  id="allow_grn"
                  v-model="form.configuration.allow_destruction"
                  onLabel="Yes"
                  offLabel="No"
                />
              </div>
            </div>
            <div class="col-12 form-mode">
              <Editor v-model="form.remark" editorStyle="height: 320px" />
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex flex-row-reverse p-6">
            <Button
              class="p-button-success p-button-rounded p-button-raised button-sm m-2"
              label="Save"
              v-on:click="submit($event)"
            />
            <Button
              class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
              label="Cancel"
              v-on:click="back"
            />
          </div>
        </template>
      </Card>
      <ConfirmPopup group="confirm_changes"></ConfirmPopup>
      <ConfirmDialog group="keep_editing"></ConfirmDialog>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { storeCore } from '@/store/index'
import { storeMasterStockPoint } from '../store'
import { mapStores, mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import type { CoreResponse } from '@/interfaces/api'
import { required, minLength } from '@vuelidate/validators'

export default defineComponent({
  name: 'MasterStockPointEdit',
  setup() {
    return { v$: useVuelidate() }
  },
  data() {
    return {
      form: {
        id: '',
        code: '',
        name: '',
        remark: '',
        configuration: {
          allow_grn: false,
          allow_incoming: false,
          allow_outgoing: false,
          allow_destruction: false,
        },
        v: 0,
      },
    }
  },
  validations() {
    return {
      form: {
        code: { required, minLength: minLength(8) },
        name: { required },
      },
    }
  },
  mounted() {
    this.detail(this.$route.params.id)
    this.form.id = this.$route.params.id
  },
  computed: {
    ...mapStores(storeMasterStockPoint),
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    back() {
      this.$router.push({
        path: `/master/stock_point`,
      })
    },
    async detail(id: string) {
      await this.masterStockPointStore.detail(id).then((response: CoreResponse) => {
        const data = response.payload
        this.form.code = data.code
        this.form.name = data.name
        this.form.remark = data.remark
        this.form.configuration = data.configuration
        this.form.v = data.__v
      })
    },
    async submit(event: MouseEvent) {
      const result = await this.v$.$validate()
      if (result) {
        const confirmation = this.$confirm
        confirmation.require({
          group: 'confirm_changes',
          target: event.currentTarget as HTMLElement,
          header: 'Confirmation',
          message: `Update data?`,
          icon: 'pi pi-exclamation-triangle',
          acceptClass: 'p-button-warning',
          rejectClass: 'p-button-secondary',
          acceptIcon: 'pi pi-check-circle',
          acceptLabel: 'Yes',
          rejectLabel: 'Abort',
          rejectIcon: 'pi pi-times-circle',
          accept: async () => {
            await this.masterStockPointStore
              .edit(this.form.id.toString(), { ...this.form, __v: this.form.v })
              .then(async (response) => {
                this.$confirm.require({
                  group: 'keep_editing',
                  message: `${response.message}. Back to data list?`,
                  header: 'Keep editting?',
                  icon: 'pi pi-exclamation-triangle',
                  acceptClass: 'p-button-success',
                  rejectClass: 'p-button-secondary',
                  acceptLabel: 'Yes',
                  acceptIcon: 'pi pi-check-circle',
                  rejectLabel: 'Keep Editing',
                  rejectIcon: 'pi pi-times-circle',
                  accept: () => {
                    this.$router.push('/master/stock_point')
                  },
                  reject: () => {
                    //
                  },
                  onHide: () => {
                    //
                  },
                })
              })
          },
          reject: () => {
            //
          },
        })
      }
    },
  },
})
</script>
