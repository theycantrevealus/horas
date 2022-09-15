<template>
  <div class="grid">
    <div
      class="col-4 col-offset-4"
      style="margin-top: 50px"
    >
      <form
        autocomplete="off"
        @submit.prevent="login"
      >
        <Card>
          <template #header>
            <h1 style="padding: 20px">Login</h1>
          </template>
          <template #content>
            <div class="grid p-fluid">
              <div class="field">
                <label for="loginEmail">Email</label>
                <InputText
                  id="loginEmail"
                  v-model.trim="$v.email.$model"
                  autocomplete="off"
                />
                <Message
                  v-if="$v.email.$errors.length > 0"
                  severity="error"
                  :closable="false"
                >
                  <div
                    v-for="(error, index) of $v.email.$errors"
                    :key="index"
                    class="error-msg"
                  >{{ error.$message }}</div>
                </Message>
              </div>
            </div>
            <div class="grid p-fluid">
              <div class="field">
                <label for="loginPassword">Password</label>
                <Password
                  id="loginPassword"
                  v-model="$v.password.$model"
                  type="password"
                  placeholder="Password"
                />
                <Message
                  v-if="$v.password.$errors.length > 0"
                  severity="error"
                  :closable="false"
                >
                  <div
                    v-for="(error, index) of $v.password.$errors"
                    :key="index"
                    class="error-msg"
                  >{{ error.$message }}</div>
                </Message>
              </div>
            </div>
          </template>
          <template #footer>
            <Message
              v-if="response.message !== ''"
              :severity="response.type"
              :closable="false"
            >{{ response.message }}</Message>
            <Button
              id="submitButton"
              type="submit"
              label="Login"
              icon="pi pi-check"
              :disabled="$v.$invalid"
            />
            <p style="padding: 20px">
              "Dimana-mana masuk sistem itu login lae. Maka dari itu login kau, unang mangalo"
              <br />
              <b>Tanaka, 2021</b>
            </p>
          </template>
        </Card>
      </form>
    </div>
  </div>
</template>

<script>
import { validateEmail } from '@/util/string'
import useVuelidate from '@vuelidate/core'
import { required, minLength } from '@vuelidate/validators'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { mapActions } from 'vuex'

export default {
  name: 'Login',
  components: {
    Card,
    InputText,
    Password,
    Button,
    Message,
  },
  setup() {
    return { $v: useVuelidate() }
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
  methods: {
    ...mapActions({
      sLogin: 'LOGIN',
    }),
    login() {
      return this.sLogin({
        request: 'login',
        email: this.email,
        password: this.password,
      }).then((response) => {
        if (response.status === 200) {
          this.$router.push('/dashboard')
        } else {
          this.response.message = response.message
        }
      })
    },
  },
}
</script>
