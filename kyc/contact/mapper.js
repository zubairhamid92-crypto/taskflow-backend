import { optionKeys, businessSectors } from "../../../../enums/index.js";
export const contactCreateMapper = (payload) => {
  // Mapping for business sector-specific values
  let contact = JSON.stringify({
    full_name: payload.fullName,
    email_address: payload.emailAddress,
    phone_number: payload.phoneNumber,
  });

  // Common assignments
  payload.Opt_Value = contact;
  payload.Opt_Key = optionKeys.contactInfo;
  payload.Is_JSON = 1; // Assuming `payload` is being passed, avoid direct use of `req.body`.
  payload.Business_Account_ID = payload.businessAccountId;
  return payload;
};
export default { contactCreateMapper };
