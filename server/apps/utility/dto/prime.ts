import { HttpStatus } from '@nestjs/common'
import { GlobalErrorResponse, GlobalResponse } from '@utility/dto/response'

const ApiOperationGeneral = {
  primeDT: {
    summary: 'Show all example item',
    description: `<table><tr><td>first<br/><i>Offsetofdata</i></td><td>:</td><td><b>number</b></td></tr><tr><td>rows<br/><i>Limitdatainpage</i></td><td>:</td><td><b>number</b></td></tr><tr><td>sortField<br/><i>Fieldtobesort</i></td><td>:</td><td><b>string</b></td></tr><tr><td>sortOrder<br/><i>1isascending.-1isdescending</i></td><td>:</td><td><b>number</b></td></tr><tr><td>filters</td><td>:</td><td><b>object</b><br/><table><tr><td>column_name_1<br/><i>Nameofcolumntobesearched</i></td><td>:</td><td><b>object</b><table><tr><td>matchMode</td><td>:</td><td><b>string</b><br/>Onlyfilledbyfollowingitem:<ul><li><b>contains</b><br/>Willsearchalldataifcolumn_name_1containsthevalue<br/></li><li><b>notContains</b><br/>Willsearchalldataifcolumn_name_1notcontainsthevalue<br/></li><li><b>startsWith</b><br/>Willsearchalldataifcolumn_name_1startswiththevalue<br/></li><li><b>endsWith</b><br/>Willsearchalldataifcolumn_name_1endswiththevalue<br/></li><li><b>equals</b><br/>Willsearchalldataifcolumn_name_1equalstothevalue<br/></li><li><b>notEquals</b><br/>Willsearchalldataifcolumn_name_1notequalstothevalue<br/></li></li></td></tr><tr><td>value</td><td>:</td><td><b>string</b></td></tr></table></td></tr><tr><td>column_name_2<br/><i>Nameofcolumntobesearched</i></td><td>:</td><td><b>object</b><table><tr><td>matchMode</td><td>:</td><td><b>string</b><br/>Onlyfilledbyfollowingitem:<ul><li><b>contains</b><br/>Willsearchalldataifcolumn_name_2containsthevalue<br/></li><li><b>notContains</b><br/>Willsearchalldataifcolumn_name_2notcontainsthevalue<br/></li><li><b>startsWith</b><br/>Willsearchalldataifcolumn_name_2startswiththevalue<br/></li><li><b>endsWith</b><br/>Willsearchalldataifcolumn_name_2endswiththevalue<br/></li><li><b>equals</b><br/>Willsearchalldataifcolumn_name_2equalstothevalue<br/></li><li><b>notEquals</b><br/>Willsearchalldataifcolumn_name_2notequalstothevalue<br/></li></li></td></tr><tr><td>value</td><td>:</td><td><b>string</b></td></tr></table></td></tr></table></td></tr></table>`,
  },
  add: {
    summary: 'Add example data v1',
    description:
      'Add standard. It will add the join data into single collection (merged)',
  },
  addv2: {
    summary: 'Add example data v2',
    description: 'It will add data into multiple collection with relation',
  },
  standard_format: {
    summary: '',
    description: '',
  },
}

const ApiQueryGeneral = {
  primeDT: {
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  },
}

const ApiResponseGeneral = {
  R200: {
    status: HttpStatus.OK,
    type: GlobalResponse,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
  R201: {
    status: HttpStatus.CREATED,
    type: GlobalResponse,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
  R202: {
    status: HttpStatus.ACCEPTED,
    type: GlobalResponse,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
  R204: {
    status: HttpStatus.NO_CONTENT,
    type: GlobalResponse,
    description: `The HTTP 204 No Content success status response code indicates that a request has succeeded, but that <b>the client doesn't need to navigate away from its current page</b>.`,
  },
  R400: {
    status: HttpStatus.BAD_REQUEST,
    type: GlobalErrorResponse,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
  R401: {
    status: HttpStatus.UNAUTHORIZED,
    type: GlobalErrorResponse,
    description: `The HyperText Transfer Protocol (HTTP) 401 Unauthorized response status code indicates that <b>the client request has not been completed because it lacks valid authentication credentials for the requested resource</b>.`,
  },
  R403: {
    status: HttpStatus.FORBIDDEN,
    type: GlobalErrorResponse,
    description: `The HTTP 403 Forbidden response status code indicates that <b>the server understands the request but refuses to authorize it</b>.<br />This status is similar to 401, but for the 403 Forbidden status code re-authenticating makes no difference. The access is permanently forbidden and tied to the application logic, such as insufficient rights to a resource.`,
  },
  R404: {
    status: HttpStatus.NOT_FOUND,
    type: GlobalErrorResponse,
    description: `A 404 <b>not found error</b> is an HTTP status code that means that the page you wanted to access a website couldn't be found on their server.`,
  },
  R405: {
    status: HttpStatus.METHOD_NOT_ALLOWED,
    type: GlobalErrorResponse,
    description: `The HyperText Transfer Protocol (HTTP) 405 Method Not Allowed response status code indicates that <b>the server knows the request method, but the target resource doesn't support this method</b>.`,
  },
  R422: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: GlobalErrorResponse,
    description: `The HyperText Transfer Protocol (HTTP) 422 Unprocessable Entity response status code indicates that <b>the server understands the content type of the request entity, and the syntax of the request entity is correct, but it was unable to process the contained instructions</b>.`,
  },
  R424: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: GlobalErrorResponse,
    description: `The 424 <b>(Failed Dependency)</b> status code means that the method could not be performed on the resource because the requested action depended on another action and that action failed.`,
  },
  R500: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    type: GlobalErrorResponse,
    description: `The HTTP status code 500 is a generic error response. It means that <b>the server encountered an unexpected condition that prevented it from fulfilling the request</b>.`,
  },
}

const TransactionErrorMsgResp = {
  required: {
    msisdn: 'msisdn is required',
    trx_id: 'trx_id is required',
    keyword: 'keyword is required',
    type: 'type is required',
    ref_transaction_id: 'ref_transaction_id is required',
    keyword_verification: 'keyword_verification is required',
    merchant_id: 'merchant_id is required',
  },
  matches: {
    to: 'to must be folowing format date YYYY-MM-DD',
    from: 'from must be folowing format date YYYY-MM-DD',
    keyword:
      'keyword should not be empty or with parameter ex: [keyword][space][number]',
  },
  one_is_required: {
    keyword:
      'keyword is optional (Need one of parameter Program Id or Keyword should not be empty)',
    program_id:
      'program_id is optional (Need one of parameter Keyword or Program Id should not be empty)',
  },
}

export {
  ApiOperationGeneral,
  ApiQueryGeneral,
  ApiResponseGeneral,
  TransactionErrorMsgResp,
}
