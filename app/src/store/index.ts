import { createStore } from 'vuex'
import PersistedState from 'vuex-persistedstate'
import SecureLS from 'secure-ls'
import { CredentialStore } from '@/store/modules/credential'
import { MenuStore } from '@/store/modules/menu'
import {task} from "@/store/states/task";
import {ApplicationStore} from "@/store/modules/application";
import {SocketStore} from "@/store/modules/socket";
import {i18nStore} from "@/store/modules/i18n";

const ls = new SecureLS({ isCompression: false })
const store = createStore({
  state: {
    ...task,
    message: '',
  },
  plugins: [
    PersistedState({
      storage: {
        getItem: (key) => ls.get(key),
        setItem: (key, value) => ls.set(key, value),
        removeItem: (key) => ls.remove(key),
      },
    })
  ],
  actions: {
    test: async ({commit}) => {
      commit('update_state', 'Hello Horas')
    },
  },
  getters: {
    getMessage: (state) => {
      return state.message
    },
    getTask: (state) => {
      return state.task
    },
  },
  mutations: {
    update_state: (state, data: any) => {
      state.message = data
    },
    mutateUpdateTask: (state, data: any) => {
      if(!state.task[data.identifier]) {
        state.task[data.identifier] = []
      }

      state.task[data.identifier].push(data.task)
    },
  },
  modules: {
    storeApplication: ApplicationStore,
    storeCredential: CredentialStore,
    storeSocket: SocketStore,
    storeMenu: MenuStore,
    storei18n: i18nStore,
  },
})

export default store
