declare class MasterItemService {
    /**
     * @brief List all item data with pagination
     * @param parsedData Object Base. request: parsedData.default is 'list'
     * {
     *  request: 'list' <Default is 'list'>,
     *  first: 0,
     *  rows: 10 'or this.$refs.dt.rows',
     *  sortField: null,
     *  sortOrder: null,
     *  filters: {
          columnName: { value: '', matchMode: 'contains' },
          anotherColumnName: { value: '', matchMode: 'contains' }
        }
     * }
     * @returns
     */
    getItemList(parsedData: any): Promise<any>;
    getItemDetail(id: any): Promise<any>;
}
declare const _default: MasterItemService;
export default _default;
//# sourceMappingURL=service.d.ts.map