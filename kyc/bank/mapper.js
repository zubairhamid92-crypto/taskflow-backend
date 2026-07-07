import { optionKeys, businessSectors } from "../../../../enums/index.js";
const bankDetailCreateMapper = (
  createdOn,
  holderName,
  ibanNumber,
  payload,
  bankId,
  bankData
) => {
  let bussinessDetail = JSON.stringify({
    Created_On: createdOn,
    Holder_Name: holderName,
    IBAN_Number: ibanNumber,
    Bank_ID: bankId,
    Bank: bankData ? JSON.stringify(bankData) : null,
  });

  payload.Opt_Value = bussinessDetail;
  payload.Opt_Key = optionKeys.bankInfo;
  payload.Is_JSON = 1;
  payload.Business_Account_ID = payload.businessAccountId;
  return payload;
};

export { bankDetailCreateMapper };
