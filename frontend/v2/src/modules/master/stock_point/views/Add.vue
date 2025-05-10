<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Form
        :initialValues
        :resolver
        ref="form"
        :validateOnValueUpdate="true"
        :validateOnBlur="true"
        @submit="submit($event)"
        class="flex flex-col gap-4 w-full sm:w-56"
      >
        <Card class="slim">
          <template #header>
            <Panel :toggleable="false">
              <template #header>
                <p class="font-bold text-2xl w-10">
                  {{ $t('master.stock_point.label.add.title.caption') }}
                </p>
                <p class="text-blue-600">Doc Ver. {{ v }}</p>
              </template>
              <template #icons>
                <Button
                  class="p-button-secondary p-button-rounded p-button-raised button-sm"
                  @click="back"
                  ><span class="material-icons">arrow_back</span>
                  {{ $t('master.stock_point.button.add.back.caption') }}</Button
                >
              </template>
            </Panel>
          </template>
          <template #content>
            <div class="grid">
              <div class="col-2 form-mode">
                <FormField
                  v-slot="$field"
                  :initialValue="initialValues.code"
                  name="code"
                  :resolver="codeResolver"
                  class="flex flex-col gap-1"
                >
                  <FloatLabel variant="on">
                    <InputText id="code" v-model="initialValues.code" autocomplete="off" />
                    <label for="code">{{ $t('master.stock_point.input.code.caption') }}</label>
                  </FloatLabel>
                  <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                    $field.error?.message
                  }}</Message>
                </FormField>
              </div>
              <div class="col-10 form-mode">
                <FormField
                  v-slot="$field"
                  :initialValue="initialValues.name"
                  name="name"
                  :resolver="nameResolver"
                  class="flex flex-col gap-1"
                >
                  <FloatLabel variant="on">
                    <InputText id="name" v-model="initialValues.name" autocomplete="off" />
                    <label for="name">{{ $t('master.stock_point.input.name.caption') }}</label>
                  </FloatLabel>
                  <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                    $field.error?.message
                  }}</Message>
                </FormField>
              </div>
              <div class="col-2 form-mode">
                <div class="flex flex-col gap-2">
                  <label for="allow-grn">{{
                    $t('master.stock_point.input.allow_grn.caption')
                  }}</label>
                  <ToggleButton
                    id="allow_grn"
                    v-model="initialValues.configuration.allow_grn"
                    onLabel="Yes"
                    offLabel="No"
                  />
                </div>
              </div>
              <div class="col-2 form-mode">
                <div class="flex flex-col gap-2">
                  <label for="allow-incoming">{{
                    $t('master.stock_point.input.allow_incoming.caption')
                  }}</label>
                  <ToggleButton
                    id="allow-incoming"
                    v-model="initialValues.configuration.allow_incoming"
                    onLabel="Yes"
                    offLabel="No"
                  />
                </div>
              </div>
              <div class="col-2 form-mode">
                <div class="flex flex-col gap-2">
                  <label for="allow-outgoing">{{
                    $t('master.stock_point.input.allow_outgoing.caption')
                  }}</label>
                  <ToggleButton
                    id="allow-outgoing"
                    v-model="initialValues.configuration.allow_outgoing"
                    onLabel="Yes"
                    offLabel="No"
                  />
                </div>
              </div>
              <div class="col-2 form-mode">
                <div class="flex flex-col gap-2">
                  <label for="allow-destruction">{{
                    $t('master.stock_point.input.allow_destruction.caption')
                  }}</label>
                  <ToggleButton
                    id="allow-destruction"
                    v-model="initialValues.configuration.allow_destruction"
                    onLabel="Yes"
                    offLabel="No"
                  />
                </div>
              </div>
              <div class="col-12 form-mode">
                <Editor name="remark" v-model="initialValues.remark" editorStyle="height: 320px" />
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex flex-row-reverse p-6">
              <Button
                class="p-button-success p-button-rounded p-button-raised button-sm m-2"
                label="Save"
                type="submit"
              />
              <Button
                class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
                label="Cancel"
                v-on:click="back"
              />
            </div>
          </template>
        </Card>
      </Form>
      <ConfirmDialog group="confirm_changes"></ConfirmDialog>
    </div>
  </div>
</template>
<script lang="ts">
import * as valibot from 'valibot'
import { defineComponent } from 'vue'
import { storeCore } from '@/store/index'
import { storeMasterStockPoint } from '../store'
import { mapStores, mapActions } from 'pinia'
import type { CoreResponse } from '@/interfaces/api'
import { valibotResolver } from '@primevue/forms/resolvers/valibot'

export default defineComponent({
  name: 'MasterStockPointAdd',
  data() {
    return {
      initialValues: {
        code: '',
        name: '',
        remark: '',
        configuration: {
          allow_grn: false,
          allow_incoming: false,
          allow_outgoing: false,
          allow_destruction: false,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      resolver: valibotResolver(
        valibot.object({
          //
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      codeResolver: valibotResolver(
        valibot.pipe(valibot.string(), valibot.minLength(1, 'Code is required.')),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      nameResolver: valibotResolver(
        valibot.pipe(valibot.string(), valibot.minLength(1, 'Name is required')),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      id: '',
      v: 0,
    }
  },
  async mounted() {
    await this.detail(this.$route.params.id.toString())
    this.id = this.$route.params.id.toString()
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
        this.initialValues.code = data.code
        this.initialValues.name = data.name
        this.initialValues.remark = data.remark
        this.initialValues.configuration = data.configuration
        this.v = data.__v

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const refs: any = this.$refs.form
        refs.setValues({
          code: data.code,
          name: data.name,
        })
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async submit(event: any) {
      if (event.valid) {
        console.clear()
        console.log(this.initialValues)
        const confirmation = this.$confirm
        confirmation.require({
          group: 'confirm_changes',
          target: event.originalEvent.submitter,
          header: 'Confirmation',
          message: `Please make sure the data is correct. Update data?`,
          acceptClass: 'p-button-warning',
          rejectClass: 'p-button-secondary',
          acceptIcon: 'pi pi-check-circle',
          acceptLabel: 'Yes',
          rejectLabel: 'Abort',
          rejectIcon: 'pi pi-times-circle',
          accept: async () => {
            await this.masterStockPointStore.add({ ...this.initialValues }).then(async () => {
              this.$router.push('/master/stock_point')
            })
          },
        })
      }
    },
  },
})
</script>
