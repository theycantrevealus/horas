<template>
  <div class="main-container p-grid vertical-container">
    <div class="col-4 col-offset-4" style="margin-top: 50px">
      <form autocomplete="off" @submit.prevent="login">
        <Card>
          <template #header>
            <h1 class="text-center" style="padding: 20px">Login</h1>
          </template>
          <template #content>
            <div class="p-grid p-fluid">
              <div class="field">
                <label for="loginEmail">Email</label>
                <InputText
                  class="mb-2 block"
                  id="loginEmail"
                  placeholder="your.email@domain.xyz"
                  v-model.trim="v$.email.$model"
                  autocomplete="off"
                />
                <Message v-if="v$.email.$errors.length > 0" severity="error" :closable="false">
                  <div v-for="(error, index) of v$.email.$errors" :key="index" class="error-msg">
                    {{ error.$message }}
                  </div>
                </Message>
              </div>
            </div>
            <div class="p-grid p-fluid">
              <div class="field">
                <label for="loginPassword">Password</label>
                <Password
                  id="loginPassword"
                  class="mb-2 block"
                  v-model="v$.password.$model"
                  type="password"
                  placeholder="*******"
                />
                <Message v-if="v$.password.$errors.length > 0" severity="error" :closable="false">
                  <div v-for="(error, index) of v$.password.$errors" :key="index" class="error-msg">
                    {{ error.$message }}
                  </div>
                </Message>
              </div>
            </div>
          </template>
          <template #footer>
            <Message v-if="response.message !== ''" :severity="response.type" :closable="false">{{
              response.message
            }}</Message>
            <Button
              id="submitButton"
              class="p-button-success"
              type="submit"
              label="Login"
              icon="pi pi-check"
              :disabled="v$.$invalid"
            />
          </template>
        </Card>
      </form>
    </div>
  </div>
</template>
<script lang="ts">
import useVuelidate from '@vuelidate/core'
import { validateEmail } from '@/utils/core/string'
import { required, minLength } from '@vuelidate/validators'
import { storeLogin } from '@/modules/core/login/store.ts'

import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import Button from 'primevue/button'
import { storeCore } from '@/store'
import { mapStores, storeToRefs } from 'pinia'

export default {
  components: {
    Card, InputText, Password, Message, Button
  },
  setup() {
    return { v$: useVuelidate() }
  },
  data() {
    return {
      email: '',
      password: '',
      response: {
        type: 'errors',
        message: '',
      },
    }
  },
  computed: {
    ...mapStores(storeLogin, storeCore)
  },
  validations: {
    email: {
      required,
      name_validation: {
        $validator: validateEmail,
        $message: 'Invalid Email Format',
      },
      minLength: minLength(4),
    },
    password: {
      required,
      minLength: minLength(4),
    },
  },
  mounted() {
    //
  },
  methods: {
    async login() {
      this.signInStore.signIn({
        email: this.email,
        password: this.password
      })
    }
  }
}
</script>
