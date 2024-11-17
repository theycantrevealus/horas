import { HttpStatus } from '@nestjs/common'

export const modCodes = {
  Global: {
    success: 'S0000',
    failed: 'F0000',
  },
  CoreService: 'CFG',
  CoreConfigGroupService: 'CFG-G',
  LicenseService: 'LCS',
  KafkaService: {
    defaultCode: 'KAF',
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
  AccountService: {
    defaultCode: 'ACC',
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
  AuthorityService: {
    defaultCode: 'ATH',
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
    defaultCode: 'PENT',
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
    defaultCode: 'MNU',
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
  MasterReceptionistCounterService: {
    defaultCode: 'MSTRC',
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
  MasterQueueMachineService: {
    defaultCode: 'MSRQM',
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
  MasterDepartmentService: {
    defaultCode: 'MSRD',
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
    defaultCode: 'MSRI',
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
    defaultCode: 'MSRI-STCK',
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
    defaultCode: 'MSRI-UNT',
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
    defaultCode: 'MSRI-SPP',
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
    defaultCode: 'MSRI-BRD',
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
    defaultCode: 'MQ',
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
    defaultCode: 'MSRI-CAT',
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
  MasterTreatmentService: {
    defaultCode: 'MSRTRT',
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
  MasterAssessmentFormService: {
    defaultCode: 'MSRASF',
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
  StockService: {
    defaultCode: 'STO',
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
    defaultCode: 'PO',
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
    defaultCode: 'GRN',
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
    defaultCode: 'LOV',
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
    defaultCode: 'I18N',
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
  GatewayQueueService: {
    defaultCode: 'QUE',
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
    defaultCode: 'BPJS_REF',
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
    defaultCode: 'BPJS_VCLAIM_SEP',
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
    defaultCode: 'BPJS_APPLICARES_SEP',
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
    defaultCode: 'OPR_QUEUE',
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
  VisitService: {
    defaultCode: 'VST',
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
  ConsumerQueueController: {
    defaultCode: 'QUE',
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
  ConsumerQueueService: {
    defaultCode: 'QUE',
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

export function isCustomErrorCode(object: any): object is CustomErrorCode {
  return (
    object &&
    object.defaultCode &&
    object.classCode &&
    object.customCode &&
    'defaultCode' in object &&
    'classCode' in object &&
    'customCode' in object
  )
}
