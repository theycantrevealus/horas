<template>
  <div class="p-grid">
    <div class="p-col-4 p-offset-4" style="margin-top: 50px">
      <form autocomplete="off" @submit.prevent="login">
        <Card>
          <template #header>
            <h1 style="padding: 20px">Login</h1>
          </template>
          <template #content>
            <div class="p-fluid">
              <div class="p-field">
                <label for="loginEmail">Email</label>
                <InputText autocomplete="off" id="loginEmail" v-model.trim="$v.email.$model" />
                <Message severity="error" v-if="$v.email.$errors.length > 0" :closable="false">
                  <div
                    class="error-msg"
                    v-for="(error, index) of $v.email.$errors"
                    :key="index"
                  >{{ error.$message }}</div>
                </Message>
              </div>
              <div class="p-field">
                <label for="loginPassword">Password</label>
                <Password
                  type="password"
                  id="loginPassword"
                  placeholder="Password"
                  v-model="$v.password.$model"
                />
                <Message severity="error" v-if="$v.password.$errors.length > 0" :closable="false">
                  <div
                    class="error-msg"
                    v-for="(error, index) of $v.password.$errors"
                    :key="index"
                  >{{ error.$message }}</div>
                </Message>
              </div>
            </div>
          </template>
          <template #footer>
            <Message
              :severity="response.type"
              :closable="false"
              v-if="response.message !== ''"
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
    Card, InputText, Password, Button, Message
  },
  setup () {
    return { $v: useVuelidate() }
  },
  data () {
    return {
      email: '',
      password: '',
      response: {
        type: 'errors',
        message: ''
      }
    }
  },
  validations: {
    email: {
      required,
      name_validation: {
        $validator: validateEmail,
        $message: 'Invalid Email Format'
      },
      minLength: minLength(4)
    },
    password: {
      required,
      minLength: minLength(4)
    }
  },
  methods: {
    ...mapActions({
      sLogin: 'LOGIN'
    }),
    login () {
      return this.sLogin({
        request: 'login',
        email: this.email,
        password: this.password
      }).then((response) => {
        if (response.response_result > 0) {
          this.$router.push('/dashboard')
        } else {
          this.response.type = 'error'
          this.response.message = response.response_message
        }
      })
    }
  }
}
</script>
