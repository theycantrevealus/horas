import { HttpStatus } from '@nestjs/common'

export const modCodes = {
  Global: {
    success: 'S0000',
    failed: 'F0000',
    error: {
      generalError: {
        defaultCode: HttpStatus.INTERNAL_SERVER_ERROR,
        customCode: 'E0000',
      },
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
  Authority: {
    defaultCode: 'AUTH',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Authority fetched successfully',
        transaction_classify: 'AUTHORITY_GET',
      },
      fetch: {
        responseCode: HttpStatus.OK,
        message: 'Authority fetched successfully',
        transaction_classify: 'AUTHORITY_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Authority detail fetched successfully',
        transaction_classify: 'AUTHORITY_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Authority created successfully',
        transaction_classify: 'AUTHORITY_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Authority updated successfully',
        transaction_classify: 'AUTHORITY_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Authority deleted successfully',
        transaction_classify: 'AUTHORITY_DELETE',
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
  MasterQueueMachine: {
    defaultCode: 'MSRQM',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Master Queue Machine fetched successfully',
        transaction_classify: 'MSRQM_GET',
      },
      fetch: {
        responseCode: HttpStatus.OK,
        message: 'Master Queue Machine fetched successfully',
        transaction_classify: 'MSRQM_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Master Queue Machine detail fetched successfully',
        transaction_classify: 'MSRQM_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Master Queue Machine created successfully',
        transaction_classify: 'MSRQM_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Master Queue Machine updated successfully',
        transaction_classify: 'MSRQM_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Master Queue Machine deleted successfully',
        transaction_classify: 'MSRQM_DELETE',
      },
    },
  },
  MasterDepartment: {
    defaultCode: 'MSRD',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Master Department fetched successfully',
        transaction_classify: 'MSRD_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Master Department detail fetched successfully',
        transaction_classify: 'MSRD_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Master Department created successfully',
        transaction_classify: 'MSRD_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Master Department updated successfully',
        transaction_classify: 'MSRD_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Master Department deleted successfully',
        transaction_classify: 'MSRD_DELETE',
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
  MasterStockPoint: {
    defaultCode: 'MSRI-STCK',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Master Stock Point fetched successfully',
        transaction_classify: 'MSRI-STCK_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Master Stock Point detail fetched successfully',
        transaction_classify: 'MSRI-STCK_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Master Stock Point created successfully',
        transaction_classify: 'MSRI-STCK_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Master Stock Point updated successfully',
        transaction_classify: 'MSRI-STCK_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Master Stock Point deleted successfully',
        transaction_classify: 'MSRI-STCK_DELETE',
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
  MasterItemSupplier: {
    defaultCode: 'MSRI-SPP',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Master Item Supplier fetched successfully',
        transaction_classify: 'MSRI-SPP_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Master Item Supplier detail fetched successfully',
        transaction_classify: 'MSRI-SPP_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Master Item Supplier created successfully',
        transaction_classify: 'MSRI-SPP_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Master Item Supplier updated successfully',
        transaction_classify: 'MSRI-SPP_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Master Item Supplier deleted successfully',
        transaction_classify: 'MSRI-SPP_DELETE',
      },
    },
  },
  MasterItemBrand: {
    defaultCode: 'MSRI-BRD',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Master Item Brand fetched successfully',
        transaction_classify: 'MSRI-BRD_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Master Item Brand detail fetched successfully',
        transaction_classify: 'MSRI-BRD_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Master Item Brand created successfully',
        transaction_classify: 'MSRI-BRD_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Master Item Brand updated successfully',
        transaction_classify: 'MSRI-BRD_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Master Item Brand deleted successfully',
        transaction_classify: 'MSRI-BRD_DELETE',
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
  MasterItemCategory: {
    defaultCode: 'MSRI-CAT',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Master Item Category fetched successfully',
        transaction_classify: 'MSRI-CAT_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Master Item Category detail fetched successfully',
        transaction_classify: 'MSRI-CAT_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Master Item Category created successfully',
        transaction_classify: 'MSRI-CAT_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Master Item Category updated successfully',
        transaction_classify: 'MSRI-CAT_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Master Item Category deleted successfully',
        transaction_classify: 'MSRI-CAT_DELETE',
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
  ConsumerStock: {
    defaultCode: 'STO',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      movement: {
        responseCode: HttpStatus.OK,
        message: 'Stock moved successfully',
        transaction_classify: 'STO-MOVEMENT',
      },
    },
  },
  MaterialRequisitionService: {
    defaultCode: 'MR',
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
  GatewayInventoryStockAudit: {
    defaultCode: 'AUD',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Stock audit fetched successfully',
        transaction_classify: 'AUD_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Stock audit fetched successfully',
        transaction_classify: 'AUD_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Stock audit created successfully',
        transaction_classify: 'AUD_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock audit updated successfully',
        transaction_classify: 'AUD_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Stock audit deleted successfully',
        transaction_classify: 'AUD_DELETE',
      },
      askApproval: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock audit proposed successfully',
        transaction_classify: 'AUD_ASK_APPROVAL',
      },
      approve: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock audit approved successfully',
        transaction_classify: 'AUD_APPROVE',
      },
      decline: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock audit declined successfully',
        transaction_classify: 'AUD_DECLINE',
      },
      running: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock audit processed successfully',
        transaction_classify: 'AUD_RUNNING',
      },
      completed: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock audit processed successfully',
        transaction_classify: 'AUD_COMPLETED',
      },
    },
  },
  GatewayInventoryStockAdjustment: {
    defaultCode: 'ADJ',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Stock adjustment fetched successfully',
        transaction_classify: 'ADJ_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Stock adjustment fetched successfully',
        transaction_classify: 'ADJ_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Stock adjustment created successfully',
        transaction_classify: 'ADJ_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock adjustment updated successfully',
        transaction_classify: 'ADJ_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Stock adjustment deleted successfully',
        transaction_classify: 'ADJ_DELETE',
      },
      askApproval: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock adjustment proposed successfully',
        transaction_classify: 'ADJ_ASK_APPROVAL',
      },
      approve: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock adjustment approved successfully',
        transaction_classify: 'ADJ_APPROVE',
      },
      decline: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock adjustment declined successfully',
        transaction_classify: 'ADJ_DECLINE',
      },
      process: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock adjustment processed successfully',
        transaction_classify: 'ADJ_RUNNING',
      },
    },
  },
  GatewayInventoryMutation: {
    defaultCode: 'MUT',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Stock Mutation fetched successfully',
        transaction_classify: 'MUT_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Stock Mutation fetched successfully',
        transaction_classify: 'MUT_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Stock Mutation created successfully',
        transaction_classify: 'MUT_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock Mutation updated successfully',
        transaction_classify: 'MUT_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Stock Mutation deleted successfully',
        transaction_classify: 'MUT_DELETE',
      },
      askApproval: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock Mutation proposed successfully',
        transaction_classify: 'MUT_ASK_APPROVAL',
      },
      approve: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock Mutation approved successfully',
        transaction_classify: 'MUT_APPROVE',
      },
      decline: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock Mutation declined successfully',
        transaction_classify: 'MUT_DECLINE',
      },
      proceed: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Stock Mutation processed successfully',
        transaction_classify: 'MUT_PROCESS',
      },
    },
  },
  GatewayInventoryPurchaseRequisition: {
    defaultCode: 'PR',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Purchase requisition fetched successfully',
        transaction_classify: 'PR_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Purchase requisition detail fetched successfully',
        transaction_classify: 'PR_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Purchase requisition created successfully',
        transaction_classify: 'PR_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase requisition updated successfully',
        transaction_classify: 'PR_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Purchase requisition deleted successfully',
        transaction_classify: 'PR_DELETE',
      },
      askApproval: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase requisition deleted successfully',
        transaction_classify: 'PR_ASK_APPROVAL',
      },
      approve: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase requisition deleted successfully',
        transaction_classify: 'PR_APPROVE',
      },
      decline: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase requisition deleted successfully',
        transaction_classify: 'PR_DECLINE',
      },
      cancel: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase requisition deleted successfully',
        transaction_classify: 'PR_CANCEL',
      },
    },
  },
  GatewayInventoryGeneralIssueNote: {
    defaultCode: 'GIN',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'General Issue Note fetched successfully',
        transaction_classify: 'GIN_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'General Issue Note detail fetched successfully',
        transaction_classify: 'GIN_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'General Issue Note created successfully',
        transaction_classify: 'GIN_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'General Issue Note updated successfully',
        transaction_classify: 'GIN_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'General Issue Note deleted successfully',
        transaction_classify: 'GIN_DELETE',
      },
    },
  },
  GatewayInventoryPurchaseOrder: {
    defaultCode: 'PO',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Purchase order fetched successfully',
        transaction_classify: 'PO_GET',
      },
      uncompletedDelivery: {
        responseCode: HttpStatus.OK,
        message: 'Purchase order fetched successfully',
        transaction_classify: 'PO_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Purchase order detail fetched successfully',
        transaction_classify: 'PO_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Purchase order created successfully',
        transaction_classify: 'PO_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase order updated successfully',
        transaction_classify: 'PO_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Purchase order deleted successfully',
        transaction_classify: 'PO_DELETE',
      },
      askApproval: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase order proposed successfully',
        transaction_classify: 'AUD_ASK_APPROVAL',
      },
      approve: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase order approved successfully',
        transaction_classify: 'AUD_APPROVE',
      },
      decline: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Purchase order declined successfully',
        transaction_classify: 'AUD_DECLINE',
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
  LOV: {
    defaultCode: 'LOV',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'LOV fetched successfully',
        transaction_classify: 'LOV_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'LOV detail fetched successfully',
        transaction_classify: 'LOV_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'LOV created successfully',
        transaction_classify: 'LOV_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'LOV updated successfully',
        transaction_classify: 'LOV_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'LOV deleted successfully',
        transaction_classify: 'LOV_DELETE',
      },
    },
  },
  I18n: {
    defaultCode: 'I18N',
    defaultResponseCode: {
      success: HttpStatus.OK,
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
    methods: {
      all: {
        responseCode: HttpStatus.OK,
        message: 'Internationalization fetched successfully',
        transaction_classify: 'I18N_GET',
      },
      fetch: {
        responseCode: HttpStatus.OK,
        message: 'Internationalization fetched successfully',
        transaction_classify: 'I18N_GET',
      },
      detail: {
        responseCode: HttpStatus.OK,
        message: 'Internationalization detail fetched successfully',
        transaction_classify: 'I18N_GET',
      },
      add: {
        responseCode: HttpStatus.CREATED,
        message: 'Internationalization created successfully',
        transaction_classify: 'I18N_ADD',
      },
      edit: {
        responseCode: HttpStatus.ACCEPTED,
        message: 'Internationalization updated successfully',
        transaction_classify: 'I18N_EDIT',
      },
      delete: {
        responseCode: HttpStatus.NO_CONTENT,
        message: 'Internationalization deleted successfully',
        transaction_classify: 'I18N_DELETE',
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

export function modCodesCoordinator(className: string) {
  return className.replace(/Controller|Service/gi, '') in modCodes
    ? modCodes[className.replace(/Controller|Service/gi, '')]
    : '???'
}
