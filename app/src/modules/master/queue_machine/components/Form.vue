<template>
  <div>
    <form
      autocomplete="off"
      @submit.prevent="queueMachineFormSubmit"
    >
      <Card>
        <template #content>
          <div class="grid p-fluid">
            <div class="col-3">
              <div class="field">
                <label for="itemFormCode">Code</label>
                <InputText
                  id="itemFormCode"
                  v-model.trim="validator.code.$model"
                  placeholder="Queue Code"
                  type="text"
                />
                <Message
                  v-if="validator.code.$errors.length > 0"
                  severity="error"
                  :closable="false"
                >
                  <div
                    v-for="(error, index) of validator.group.$errors"
                    :key="index"
                    class="error-msg"
                  >{{ error.$message }}</div>
                </Message>
              </div>
            </div>
            <div class="col-3">
              <div class="field">
                <label for="itemFormType">Type</label>
                <DropdownLOV
                  v-if="rendered"
                  :selectedID="queue_type.id"
                  :selectedName="queueu_type.name"
                  @onSelect="selectedType" />
              </div>
            </div>
          </div>
        </template>
        <template #footer>
          <Toolbar>
            <template #start>
              <Button
                id="queueMachineFormSubmit"
                label="Cancel"
                icon="pi pi-angle-left"
                severity="danger"
                class="button-rounded"
                @click="closeDialog"
              />
            </template>

            <template #end>
              <Button
                v-if="credential.permission['btnEditItemBrand'] !== undefined"
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
import {mapGetters, mapState} from "vuex";
import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment'
import Card from "primevue/card"
import Button from "primevue/button"
import Toolbar from "primevue/toolbar"
import InputText from "primevue/inputtext"
import Message from "primevue/message"
import useVuelidate from "@vuelidate/core"
import {minLength, required} from "@vuelidate/validators"
import EssentialsPlugin from "@ckeditor/ckeditor5-essentials/src/essentials"
import BoldPlugin from "@ckeditor/ckeditor5-basic-styles/src/bold"
import ItalicPlugin from "@ckeditor/ckeditor5-basic-styles/src/italic"
import LinkPlugin from "@ckeditor/ckeditor5-link/src/link"
import ParagraphPlugin from "@ckeditor/ckeditor5-paragraph/src/paragraph"
import LOVService from "@/modules/lov/service"
import DropdownLOV from '@/modules/lov/components/DropDown.vue'

export default {
  components: {
    Card,
    Toolbar,
    Button,
    InputText,
    Message,
    DropdownLOV
  },
  inject: ['dialogRef'],
  setup() {
    return { validator: useVuelidate() }
  },
  data() {
    return {
      rendered: false,
      editor: ClassicEditor,
      editorData: '',
      editorConfig: {
        plugins: [
          EssentialsPlugin,
          BoldPlugin,
          ItalicPlugin,
          LinkPlugin,
          ParagraphPlugin,
          Alignment,
        ],

        toolbar: {
          items: ['bold', 'italic', 'link', 'undo', 'redo', 'alignment'],
        },
      },
      group: '',
      name: '',
      value: '',
      parent: {
        id: '',
        name: ''
      },
      remark: '',
    }
  },
  computed: {
    ...mapGetters({
      application: 'storeApplication/Getter___applicationConfig',
    }),
    ...mapState('storeCredential', {
      credential: state => state
    }),
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
  unmounted() {

  },
  async created() {
    if(this.dialogRef.data.mode === 'edit') {
      await LOVService.getLOVDetail(this.dialogRef.data.id).then((response) => {
        const data = response.data.payload.data
        this.group = data?.group
        this.name = data?.name
        this.value = data?.value
        this.parent = data?.parent
        this.remark = data?.remark
      }).catch(() => {
        //
      })
    }
    this.rendered = true
  },
  async mounted() {
    //
  },
  methods: {
    selectedLOV(event) {
      this.parent = event
    },
    closeDialog(e) {
      this.dialogRef.close({
        ...this.dialogRef.data,
        ...e,
      });
    },
    async submitData() {
      if(this.dialogRef.data.mode === 'edit') {
        await LOVService.editLOV(this.dialogRef.data.id, {
          name: this.name,
          group: this.group,
          parent: this.parent,
          value: this.value,
          remark: this.remark
        }).then(() => {
          this.closeDialog()
        })
      } else {
        await LOVService.addLOV({
          name: this.name,
          group: this.group,
          parent: this.parent,
          value: this.value,
          remark: this.remark
        }).then(() => {
          this.closeDialog()
        })
      }
    }
  },
}
</script>
