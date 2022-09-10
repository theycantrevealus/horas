import axios from 'axios';

class CoreService {
  generateMenu(token: String) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}menu/tree`)
      .then((response) => {
        return Promise.resolve(response);
      });
  }

  generateMenuManager(token: String) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}menu/tree/manager`)
      .then((response) => {
        return Promise.resolve(response);
      });
  }
}

export default new CoreService();
