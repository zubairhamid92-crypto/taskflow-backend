import { optionKeys, businessSectors } from "../../../../enums/index.js";
export const disclosureCreateMapper = (payload) => {
  // Mapping for business sector-specific values
  console.log("payload -", payload);

  let disclosure = JSON.stringify({
    monthly_transaction_count: payload.monthlyTransactionCount,
    monthly_transaction_volume: payload.monthlyTransactionVolume,
    yearly_sales: payload.yearlySale,
    is_politician: payload.isPolitician,
    is_another_account: payload.isAnotherAccount,
    bank: null,
  });

  // Common assignments
  payload.Opt_Value = disclosure;
  payload.Opt_Key = optionKeys.disclosureInfo;
  payload.Is_JSON = 1; // Assuming `payload` is being passed, avoid direct use of `req.body`.
  payload.Business_Account_ID = payload.businessAccountId;
  return payload;
};
export default {
  disclosureCreateMapper,
};
