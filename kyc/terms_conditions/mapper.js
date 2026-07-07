import { optionKeys, businessSectors } from "../../../../enums/index.js";
const termsConditionMapper = (payload) => {
  return {
    ...payload,
    Opt_Value: 1,
    Opt_Key: optionKeys.tersmAndConditionsInfo,
    Is_JSON: 0,
    Business_Account_ID: payload.businessAccountId,
  };
};

export { termsConditionMapper };
