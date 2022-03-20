import axios from 'axios'

class CoreService {
  menuAdd (menuData: any) {
    return axios.post(`${process.env.VUE_APP_APIGATEWAY}Core`, menuData)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuEdit (menuData: any) {
    return axios.put(`${process.env.VUE_APP_APIGATEWAY}Core`, {
      data: menuData
    })
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuDelete (menuData: any) {
    return axios.delete(`${process.env.VUE_APP_APIGATEWAY}Core`, {
      data: menuData
    })
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuDetail (id) {
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}Core/menu_detail/${id}`)
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
