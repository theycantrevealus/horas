import { Account } from '@core/account/schemas/account.model'
import { LOVService } from '@core/lov/lov.service'
import { ILOV } from '@core/lov/schemas/lov.join'
import { MasterItemAddDTO } from '@core/master/dto/master.item'
import { MasterItemCategoryService } from '@core/master/master.item.category.service'
import { MasterItemService } from '@core/master/master.item.service'
import { MasterItemUnitService } from '@core/master/master.item.unit.service'
import { IMasterItemCategory } from '@core/master/schemas/master.item.category.join'
import { IMasterItemUnit } from '@core/master/schemas/master.item.unit.join'
import { Inject, Injectable } from '@nestjs/common'
import * as fs from 'fs'

@Injectable()
export class ImportService {
  constructor(
    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService,

    @Inject(MasterItemUnitService)
    private readonly masterItemUnitService: MasterItemUnitService,

    @Inject(MasterItemCategoryService)
    private readonly masterItemCategoryService: MasterItemCategoryService,

    @Inject(LOVService)
    private readonly lovService: LOVService
  ) {} // private masterItemModel: Model<MasterItemDocument> // @InjectModel(MasterItem.name)
  proceed_import(file: string, account: Account) {
    return new Promise(async (resolve, reject) => {
      let countProceed = 0

      const content = fs.readFileSync(file, 'utf-8')
      const arrayContent = content.split('\n')
      const countTotalLine = arrayContent.length
      const bulkWrite = 100
      let bulkData: MasterItemAddDTO[] = []

      for (let i = 1; i < arrayContent.length - 1; i++) {
        const row = arrayContent[i].split(',')
        const code = row[0]?.toString().trim()
        const unit = row[1]?.toString().trim()
        const alias = row[2]?.toString().trim()
        const name = row[3]?.toString().trim()
        const route = row[4]?.toString().trim()

        if (
          bulkData.length === bulkWrite ||
          countTotalLine - countProceed < bulkWrite
        ) {
          if (bulkData.length > 0) {
            await this.masterItemService.bulk(bulkData).then(() => {
              bulkData = []
            })
          }
          bulkData = []
        } else {
          const targetUnit: IMasterItemUnit =
            await this.masterItemUnitService.upsert({ name: unit }, account)

          const targetCategory: IMasterItemCategory =
            await this.masterItemCategoryService.upsert(
              {
                name: 'Drugs',
                parent: '',
                remark: '',
              },
              account
            )

          const targetLOV: ILOV = await this.lovService.upsert(
            {
              name: 'Route',
              parent: '',
              remark: '',
            },
            account
          )

          bulkData.push({
            code: code,
            name: name,
            alias: alias,
            unit: targetUnit,
            category: [targetCategory],
            configuration: {
              allow_sell: true,
            },
            brand: null,
            storing: [],
            remark: '',
            properties: [
              {
                ...targetLOV,
                value: route,
              },
            ],
          })

          // bulkData.push({
          //   updateMany: {
          //     filter: {
          //       code: code,
          //     },
          //     update: {
          //       code: code,
          //       name: name,
          //       alias: alias,
          //       unit: targetUnit,
          //       category: [targetCategory],
          //       properties: [
          //         {
          //           ...targetLOV,
          //           value: route,
          //         },
          //       ],
          //       created_by: account,
          //     },
          //     upsert: true,
          //   },
          // })

          countProceed++
        }
      }
    })
  }
}
