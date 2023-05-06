import AccountService from "@/service/account";
import {CoreResponse, CoreResponseLib} from "@/model/Response";
import CoreService from "@/service/core/sidemenu";

export const CredentialStore = {
  namespaced: true,
  state: {
    id: '',
    first_name: '',
    last_name: '',
    permission: {},
    profile_photo: '',
    pages: {},
    routes: [],
    routeMap: {},
    token: null,
  },
  getters: {
    Getter___credential: (state: any) => {
      return state;
    },
    Getter___token: (state: any) => {
      return state.token
    }
  },
  actions: {
    Action___signIn: async ({ state, commit, rootState }, payload) => {
      return await AccountService.signIn(payload).then((response: CoreResponse) => {
        if (response.statusCode === CoreResponseLib.Login.success) {
          commit('Mutation___updateToken', response.payload.token)
          commit('Mutation___updateSession', response.payload.account)
          commit('Mutation___updatePermission', response.payload.account)
          commit('Mutation___updatePage', response.payload.account)
          commit('storeApplication/Mutation___updateConfiguration', response.payload.config, { root: true })
        }
        return state
      })
    },
    Action___signOut: async ({ commit }) => {
      commit('Mutation___signOut')
    },
    Action___updateAccess: async ({ commit }) => {
      await CoreService.refreshAccess().then((response: any) => {
        response = response.data
        commit('mutateUpdateAccess', response)
      })
    },
  },
  mutations: {
    Mutation___updateSession: (state, payload) => {
      state.id = payload.id
      state.first_name = payload.first_name
      state.last_name = payload.last_name
    },
    Mutation___updateToken: (state, payload) => {
      state.token = payload
    },
    Mutation___signIn: (state, payload) => {
      state = payload
    },
    Mutation___signOut: (state) => {
      state.id = ''
      state.first_name = ''
      state.last_name = ''
      state.permission = {}
      state.profile_photo = ''
      state.pages = {}
      state.routes = []
      state.routeMap = {}
      state.token = null
    },
    Mutation___updatePage: (state, payload) => {
      const routes: string[] = ['Login']
      const routeMap = {}
      const grantedPage = payload.access
      const buildPage = {}

      for (let a in grantedPage) {
        if(grantedPage[a]) {
          if (buildPage[`page_${grantedPage[a].id}`]) {
            buildPage[`page_${grantedPage[a].id}`] = {}
          }
          buildPage[`page_${grantedPage[a].id}`] = grantedPage[a]
          if(routes.indexOf(grantedPage[a].identifier) < 0) routes.push(grantedPage[a].identifier)
          if(grantedPage[a].identifier !== '') {
            if(!routeMap[grantedPage[a].identifier]) {
              routeMap[grantedPage[a].identifier] = {}
            }
            routeMap[grantedPage[a].identifier] = grantedPage[a]
          }
        }
      }

      state.pages = buildPage
      state.routes = routes
    },
    Mutation___updatePermission: (state, payload) => {
      const routeMap = {}
      const grantedPerm = payload.permission
      const buildPermission = {}
      for (let a in grantedPerm) {
        if (buildPermission[grantedPerm[a].domIdentity]) {
          buildPermission[grantedPerm[a].domIdentity] = {}
        }
        buildPermission[grantedPerm[a].domIdentity] = grantedPerm[a]
        if(routeMap[grantedPerm[a].menu.identifier]) {
          if(!routeMap[grantedPerm[a].menu.identifier].permission) {
            routeMap[grantedPerm[a].menu.identifier].permission = []
          }

          if(routeMap[grantedPerm[a].menu.identifier].permission.indexOf(grantedPerm[a].dispatchName) < 0) {
            routeMap[grantedPerm[a].menu.identifier].permission.push(grantedPerm[a].dispatchName)
          }

          if(!routeMap[grantedPerm[a].dispatchName]) {
            routeMap[grantedPerm[a].dispatchName] = {}
          }
        }
      }
      state.permission = buildPermission
      state.routeMap = routeMap
    },
    Mutation___updatePages: async(state, payload) => {
      state.pages = payload
    }
  },
};
