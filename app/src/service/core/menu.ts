import axios from 'axios'

class CoreService {
  menuAdd (menuData: any) {
    return axios.post(`${process.env.VUE_APP_APIGATEWAY}menu/add`, menuData)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  async menuPermissionAdd (menuData: any) {
    return axios.post(`${process.env.VUE_APP_APIGATEWAY}menu_permission/add`, menuData)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuEdit (id: number, menuData: any) {
    return axios.put(`${process.env.VUE_APP_APIGATEWAY}menu/${id}/edit`, menuData)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuDelete (menuData: any) {
    return axios.delete(`${process.env.VUE_APP_APIGATEWAY}menu/${menuData}/delete`)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuDetail (id) {
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}menu/${id}/detail`)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuPermission () {
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}Core/menu_permission`)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuTreeEnd () {
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}Core/menu_manager_treeend`)
      .then(response => {
        return Promise.resolve(response.data.response_package)
      })
  }
}

export default new CoreService()
