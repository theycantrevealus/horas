import { AccountService } from "../../src/account/account.service"
import { AccountController } from "../../src/account/account.controller"
import { AccountLoginResponseDTO } from "../../src/account/dto/account"
import { accountMockAdd, accountMockLoginFailed, accountMockLoginSuccess, authorityMockAdd } from "../../test/mocks/account.mock"
import { AccountAuthorityModel } from "../../src/model/account.authority.model"
import { AuthService } from "../../src/auth/auth.service"
import { AccountModel } from "../../src/model/account.model"
import { AccountModule } from "../../src/account/account.module"
import { Test, TestingModule } from "@nestjs/testing"
import { JwtModule } from '@nestjs/jwt'
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm'
import { configService } from '../../src/config/orm'
import { Repository } from "typeorm"
import { HttpStatus, INestApplication } from "@nestjs/common"
import { AccountAuthorityAddDTO } from "../../src/account/dto/account.authority.add.dto"
import { AccountAddDTO } from "../../src/account/dto/account.add.dto"
import { sample } from "rxjs"

describe('Account Login Test', () => {
    let accountController: AccountController
    let accountService: AccountService
    let accountRepo: Repository<AccountModel>
    let authorityRepo: Repository<AccountAuthorityModel>
    let app: INestApplication

    beforeAll(async () => {
        const accountModule: TestingModule = await Test.createTestingModule({
            imports: [
                JwtModule.register({
                    secret: `${process.env.JWT_SECRET}`
                }),
                TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
                TypeOrmModule.forFeature([AccountAuthorityModel, AccountModel], 'default')
            ],
            controllers: [AccountController],
            providers: [AccountService, AuthService]
        }).compile()

        app = accountModule.createNestApplication()

        accountService = accountModule.get<AccountService>(AccountService)
        accountController = accountModule.get<AccountController>(AccountController)
        accountRepo = accountModule.get<Repository<AccountModel>>(getRepositoryToken(AccountModel))
        authorityRepo = accountModule.get<Repository<AccountAuthorityModel>>(getRepositoryToken(AccountAuthorityModel))
    })

    describe('Login test', () => {
        it('should check if service is running well', () => {
            expect(accountService).toBeDefined()
        })

        it('should logged in succesfully with correct credential', async () => {
            let result
            //const testRC = jest.spyOn(accountService, 'account_login').mockResolvedValueOnce(result)

            //console.log(testRC.mock.results)

            // const proc = await accountService.account_login(accountMockLoginSuccess)
            // console.log(proc)
            // expect(proc.status).toBe(HttpStatus.OK)
        })

        // it('should prevent log in if the credential is incorrect', async () => {
        //     const proc = await accountService.account_login(accountMockLoginFailed)
        //     expect(proc.status).toBe(HttpStatus.BAD_REQUEST)
        // })
    })

    // describe('Authority Data Test', () => {
    //     it('should add new authority successfully', async () => {
    //         let dto: AccountAuthorityAddDTO = new AccountAuthorityAddDTO()
    //         dto = authorityMockAdd
    //         const proc = await accountService.create_authority(dto)
    //         expect(proc.status).toBe(HttpStatus.OK)
    //     })

    //     it('should delete recent added authority', async () => {
    //         let dto: AccountAuthorityAddDTO = new AccountAuthorityAddDTO()
    //         dto = authorityMockAdd
    //         const proc = await accountService.create_authority(dto)
    //         expect(proc.status).toBe(HttpStatus.OK)
    //     })
    // })

    // describe('Account Data Test', () => {
    //     it('should add new account successfully', async () => {
    //         let dto: AccountAddDTO = new AccountAddDTO()
    //         dto.email = accountMockAdd.email
    //         dto.first_name = accountMockAdd.first_name
    //         dto.last_name = accountMockAdd.last_name
    //         dto.password = accountMockAdd.password

    //         const sampleAuth: AccountAuthorityModel = await authorityRepo.findOne({
    //             where: {
    //                 name: 'God'
    //             }
    //         })
    //         expect(sampleAuth).not.toEqual(null)

    //         dto.authority = sampleAuth

    //         const proc = await accountService.create_account(dto)
    //         expect(proc.status).toBe(HttpStatus.OK)
    //     })
    // })

    //After Test Delete All Mock Data


    afterAll(async () => {
        await app.close()
    })
})