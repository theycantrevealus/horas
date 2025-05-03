import { Model } from 'mongoose'

const prime_datatable = async (parameter: any, model: Model<any>) => {
  /*
   * Datetime parsing following to timezone will parse in client side due to performance issue
   * For a specific reason it will just send to client and let the client parse as their condition
   * */

  // if (!parameter.first || !parameter.rows) {
  //   throw new Error('Unmatch filter')
  // }

  try {
    const first: number = parameter.first ? parseInt(parameter.first) : 0
    const rows: number = parameter.rows ? parseInt(parameter.rows) : 20
    const sortField = parameter.sortField ? parameter.sortField : 'created_at'
    const sortOrder = parameter.sortOrder ? parseInt(parameter.sortOrder) : 1
    const projection = parameter.projection ?? {}
    const search_term = parameter.search_term ?? {}
    const filters = parameter.filters
    const custom_filter = parameter.custom_filter || []
    const query = []
    const sort_set = {}

    const filter_builder = { $and: [], $or: [] }
    const filterSet = filters
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {}
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {}
        }

        if (filterSet[a].matchMode === 'contains') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          }
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          }
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          }
        } else if (filterSet[a].matchMode === 'equals') {
          autoColumn[a] = {
            $eq: filterSet[a].value,
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          }
        }

        if (filterSet[a]?.logic === 'or') {
          filter_builder.$or.push(autoColumn)
        } else {
          filter_builder.$and.push(autoColumn)
        }
      }
    }

    if (custom_filter && custom_filter.length > 0) {
      for (const b in custom_filter) {
        if (custom_filter[b]?.logic === 'and') {
          filter_builder.$and.push(custom_filter[b]?.filter)
        } else {
          filter_builder.$or.push(custom_filter[b]?.filter)
        }
      }
    }

    if (filter_builder.$and.length > 0) {
      if (Object.keys(search_term).length) {
        filter_builder.$and.push({
          $text: {
            $search: search_term.value,
          },
        })
      }

      query.push({
        $match: filter_builder,
      })
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      })
    }

    if (filter_builder.$or.length > 0) {
      query[0].$match.$or = filter_builder.$or
    } else {
      delete query[0].$match.$or
    }

    const allNoFilter = await model
      .aggregate([
        ...query,
        {
          $count: 'total',
        },
      ])
      .exec()

    query.push({ $skip: first })

    query.push({ $limit: rows })

    if (sortField && sortOrder) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder
      }

      query.push({
        $sort: sort_set,
      })
    }

    query.push({
      $group: {
        _id: null,
        data: { $push: '$$ROOT' },
      },
    })

    query.push({
      $unwind: {
        path: '$data',
        includeArrayIndex: 'index',
      },
    })

    query.push({
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            '$data',
            { autonum: { $add: ['$index', first + 1] } },
          ],
        },
      },
    })

    if (Object.keys(projection).length)
      query.push({
        $project: projection,
      })

    const data = await model.aggregate(query).exec()
    if (allNoFilter && allNoFilter.length > 0) {
      return {
        totalRecords: allNoFilter[0].total ? allNoFilter[0].total : 0,
        data: data,
      }
    } else {
      return {
        totalRecords: 0,
        data: [],
      }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}
export default prime_datatable
