import api from '@/util/api'

class CoreService {
  async menuAdd(menuData: any) {
    return await api({ requiresAuth: true })
      .post(`${process.env.VUE_APP_APIGATEWAY}v1/menu`, menuData)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuPermissionAdd(menuData: any) {
    return await api({ requiresAuth: true })
      .post(`${process.env.VUE_APP_APIGATEWAY}v1/menu_permission/add`, menuData)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuEdit(id: number, menuData: any) {
    return await api({ requiresAuth: true })
      .patch(`${process.env.VUE_APP_APIGATEWAY}v1/menu/${id}`, menuData)
      .then((response) => {
        return Promise.resolve(response)
      })
      .catch((e) => {
        //
      })
  }

  async menuDelete(menuData: any) {
    return await api({ requiresAuth: true })
      .delete(`${process.env.VUE_APP_APIGATEWAY}v1/menu/${menuData}`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/${id}`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuPermission() {
    return api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/Core/menu_permission`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuTreeEnd() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/Core/menu_manager_treeend`)
      .then((response) => {
        return Promise.resolve(response.data.response_package)
      })
  }
}

export default new CoreService()
