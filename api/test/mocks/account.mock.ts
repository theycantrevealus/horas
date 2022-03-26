import { AccountAuthorityModel } from "src/model/account.authority.model"

export const accountMockAdd = {
    email: 'example@horas.com',
    password: '123456',
    first_name: 'Hendry Example',
    last_name: 'Tanaka Example',
}

export const accountMockLoginSuccess = {
    email: 'takashitanaka@horas.com',
    password: '123456',
}

export const accountMockLoginFailed = {
    email: 'hendrytanaka@pondokcoder.com',
    password: 'test11111',
}

export const authorityMockAdd = {
    name: 'Administrator'
}
