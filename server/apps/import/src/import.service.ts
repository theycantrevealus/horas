import { LOVService } from '@core/lov/lov.service'
import { MasterItemAddDTO } from '@core/master/dto/master.item'
import { IMasterItemCategory } from '@core/master/interface/master.item.category'
import { IMasterItemUnit } from '@core/master/interface/master.item.unit'
import { MasterItemCategoryService } from '@core/master/services/master.item.category.service'
import { MasterItemService } from '@core/master/services/master.item.service'
import { MasterItemUnitService } from '@core/master/services/master.item.unit.service'
import { Inject, Injectable } from '@nestjs/common'
import { Account } from '@schemas/account/account.model'
import { ILOV } from '@schemas/lov/lov.join'
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

      await Promise.all(
        arrayContent.map(async (e) => {
          const row = e.split(',')
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

            countProceed++
          }
        })
      )
        .then((result) => {
          resolve(result)
        })
        .catch((error: Error) => {
          reject(error)
        })
    })
  }
}
