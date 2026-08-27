/**
 * Shapes returned by the Power Automate flows behind dataverseService.vouchers.
 * FetchXML aliases and numeric codes come back as strings, unlike the OData-backed Voucher type.
 */

import type { Voucher } from './voucher';

/**
 * Raw voucher record as returned by the getVouchers / getRedeemedVouchersByDistributor flows,
 * before dataverseService normalizes statecode/statuscode and aliases into a Voucher.
 */
export type RawFlowVoucher = Omit<Voucher, 'statecode' | 'statuscode'> & {
  statecode: number | string;
  statuscode: number | string;
  'claimedBy.claimedByEmail'?: string;
  'redeemedBy.redeemedByEmail'?: string;
  'redeemedByAccount.accountName'?: string;
  'reward.actum_name'?: string;
  'reward.actum_pointamount'?: number | string;
};

export type ValidateVoucherFlowResponse = {
  status?: string;
  message?: string;
  voucherId?: string;
  voucherid?: string;
  voucher?: Voucher;
};

export type RedeemVoucherFlowResponse = {
  status?: string;
  message?: string;
};
