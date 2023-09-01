import { HttpStatus } from '@nestjs/common'

export const modCodes = {
  Global: {
    success: 'S0000',
    failed: 'F0000',
  },
  CoreService: 'CFG',
  CoreConfigGroupService: 'CFG-G',
  LicenseService: 'LCS',
  AccountService: {
    default: 'ACC',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  PatientService: {
    default: 'PENT',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MenuService: {
    default: 'MNU',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MasterItemService: {
    default: 'MSRI',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MasterStockPointService: {
    default: 'MSRI-STCK',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MasterItemUnitService: {
    default: 'MSRI-UNT',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MasterItemSupplierService: {
    default: 'MSRI-SPP',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MasterItemBrandService: {
    default: 'MSRI-BRD',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MasterQueueService: {
    default: 'MQ',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  MasterItemCategoryService: {
    default: 'MSRI-CAT',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  PurchaseOrderService: {
    default: 'PO',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  GeneralReceiveNoteService: {
    default: 'GRN',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  LOVService: {
    default: 'LOV',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  i18nService: {
    default: 'I18N',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  BPJSVClaumReferenceService: {
    default: 'BPJS_REF',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  BPJSVClaimSEPService: {
    default: 'BPJS_VCLAIM_SEP',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  BPJSApplicaresReferensiService: {
    default: 'BPJS_APPLICARES_SEP',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
  OperationQueueService: {
    default: 'OPR_QUEUE',
    error: {
      databaseError: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: 'E0001',
      },
      isNotFound: {
        defaultCode: HttpStatus.NOT_FOUND,
        customCode: 'E0002',
      },
      isNoAccess: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: 'E0003',
      },
    },
  },
}

export interface CustomErrorCode {
  defaultCode: number
  classCode: string
  customCode: string
}
