import { createOwnershipObject } from "../../../../common_functions/index.js";
import { optionKeys, businessSectors } from "../../../../enums/index.js";
const verifyOwnernCreateMapper = (payload, verifyOwnerShipData, nationalAddress, yakeenResponse, nafathResponse, businessAccountId, loggedInUser) => {
  const mappings = [];

  // Add "sector_info" mapping
  const sectorMappings = {
    freelancer: {
      freelancer_number: payload.Freelancer_Number,
      tax_number: payload.Tax_Number,
    },
    "private-sector": {
      UN_Number: payload.Un_Number,
      TAX_Number: payload.Tax_Number,
    },
  };
  const ownerShipObj = createOwnershipObject(loggedInUser);

  if (sectorMappings[payload.Unique_Key]) {
    mappings.push({
      Business_Account_ID: businessAccountId,
      Opt_Key: optionKeys.sectorInfo,
      Opt_Value: JSON.stringify(sectorMappings[payload.Unique_Key]),
      Is_JSON: 1,
      ...ownerShipObj,
    });
  }
  let ownerDetails;
  if (payload.Unique_Key == businessSectors.freelenacer) {
    ownerDetails = verifyOwnerShipData;
  } else {
    ownerDetails = verifyOwnerShipData[1];
     mappings.push({
      Business_Account_ID: businessAccountId,
      Opt_Key: optionKeys.crNumber,
      Opt_Value: payload.crNumber,
      Is_JSON: 0,
      ...ownerShipObj,
   });
    mappings.push({
      Business_Account_ID: businessAccountId,
      Opt_Key: optionKeys.unNumber,
      Opt_Value:payload.Un_Number ,
      Is_JSON: 0,
      ...ownerShipObj,
    });
  }
  // Add "owner_Detail" mapping
  mappings.push({
    Business_Account_ID: businessAccountId,
    Opt_Key: optionKeys.ownerInfo,
    Opt_Value: JSON.stringify(ownerDetails),
    Is_JSON: 1,
    ...ownerShipObj,
  });

  mappings.push({
    Business_Account_ID: businessAccountId,
    Opt_Key: optionKeys.isMultiOnwer,
    Opt_Value: verifyOwnerShipData[1]?.length > 1 ? true : false,
    Is_JSON: 0,
    ...ownerShipObj,
  });
  let govermentRegistrationDetails = {};
  if (payload.Unique_Key == "private-sector") {
    govermentRegistrationDetails = verifyOwnerShipData[0];
  }
  mappings.push({
    Business_Account_ID: businessAccountId,
    Opt_Key: optionKeys.governmentRegistrationInfo,
    Opt_Value: JSON.stringify(govermentRegistrationDetails),
    Is_JSON: 1,
    ...ownerShipObj,
  });

  const address = nationalAddress;
  mappings.push({
    Business_Account_ID: businessAccountId,
    Opt_Key: optionKeys.nationalAddressInfo,
    Opt_Value: JSON.stringify(address),
    Is_JSON: 1,
    ...ownerShipObj,
  });

  const phoneNumberOwnership = yakeenResponse;
  mappings.push({
    Business_Account_ID: businessAccountId,
    Opt_Key: optionKeys.phoneOwnershipInfo,
    Opt_Value: JSON.stringify(phoneNumberOwnership),
    Is_JSON: 1,
    ...ownerShipObj,
  });

  // const ownerApproval = nafathResponse;
  // mappings.push({
  //   Business_Account_ID: businessAccountId,
  //   Opt_Key: optionKeys.ownerApprovalInfo,
  //   Opt_Value: JSON.stringify(ownerApproval),
  //   Is_JSON: 1,
  //   ...ownerShipObj
  // });
  return mappings;
};
async function makeUnnLogsMapper(businessIdentifier, merchantId) {
  return {
    Merchant_ID: merchantId,
    Business_Account_ID: 0,
    CR_Number: businessIdentifier,
  };
}
export { verifyOwnernCreateMapper, makeUnnLogsMapper };
