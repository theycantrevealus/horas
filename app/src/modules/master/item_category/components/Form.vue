<template>
  <div>
    <form
      autocomplete="off"
      @submit.prevent="submitItemCategory"
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
                  placeholder="xxxxxxxx"
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
                  placeholder="Category Name"
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
            <div class="col-12">
              <div class="field">
                <label for="itemFormRemark">Remark</label>
                <ckeditor
                  id="itemFormRemark"
                  v-model="validator.remark.$model"
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
                v-if="credential.permission['btnEditItemCategory'] !== undefined"
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
  import MasterItemCategoryService from "@/modules/master/item_category/service"

  export default {
    components: {
      Card,
      Toolbar,
      Button,
      InputText,
      Message,
    },
    inject: ['dialogRef'],
    setup() {
      return { validator: useVuelidate() }
    },
    data() {
      return {
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
        code: '',
        name: '',
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
      code: {
        required,
      },
      name: {
        required,
        minLength: minLength(4),
      },
      remark: {},
    },
    unmounted() {

    },
    mounted() {
      if(this.dialogRef.data.mode === 'edit') {
        MasterItemCategoryService.getItemCategoryDetail(this.dialogRef.data.id).then((response) => {
          const data = response.data.payload.data
          this.code = data?.code
          this.name = data?.name
          this.remark = data?.remark
        }).catch(() => {
          //
        })
      }
    },
    methods: {
      closeDialog(e) {
        this.dialogRef.close({
          ...this.dialogRef.data,
          ...e,
        });
      },
      async submitData() {
        if(this.dialogRef.data.mode === 'edit') {
          await MasterItemCategoryService.editItemCategory(this.dialogRef.data.id, {
            code: this.code,
            name: this.name,
            remark: this.remark
          }).then(() => {
            this.closeDialog()
          })
        } else {
          await MasterItemCategoryService.addItemCategory({
            code: this.code,
            name: this.name,
            remark: this.remark
          }).then(() => {
            this.closeDialog()
          })
        }
      }
    },
  }
</script>
