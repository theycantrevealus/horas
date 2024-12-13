<template>
  <div>
    <form
      autocomplete="off"
      @submit.prevent="submitLOV"
    >
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
                  >{{ error.$message }}</div>
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
                  placeholder="Brand Name"
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
                  >{{ error.$message }}</div>
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
                  @onSelect="selectedLOV" />
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
                  >{{ error.$message }}</div>
                </Message>
              </div>
            </div>
            <div class="col-12">
              <div class="field">
                <label for="itemFormRemark">Remark</label>
                <ckeditor
                  id="itemFormRemark"
                  v-model="validator.remark.$model"
                  :disabled="!submitPermission"
                  :editor="editor"
                  :config="editorConfig"
                ></ckeditor>
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
      submitPermission: false,
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
      this.submitPermission = this.credential.permission['btnEditLOV'] !== undefined
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
    } else {
      this.submitPermission = this.credential.permission['btnAddLOV'] !== undefined
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
