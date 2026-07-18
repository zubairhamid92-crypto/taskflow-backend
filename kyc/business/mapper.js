import { optionKeys, businessSectors } from "../../../../enums/index.js";
const bankDetailCreateMapper = (payload) => {
  let bussinessDetail = JSON.stringify({
    iban_number: payload.ibanNumber,
    bank: null,
  });

  payload.Opt_Value = bussinessDetail;
  payload.Opt_Key = optionKeys.bankInfo;
  payload.Is_JSON = 1;
  payload.Business_Account_ID = payload.businessAccountId;
  return payload;
};
export { bankDetailCreateMapper };
