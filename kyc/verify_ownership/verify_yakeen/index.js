import { optionKeys, businessSectors } from "../../../../../enums/index.js";
import { yakeen, Model } from "../../../../../global_imports/index.js";
import { getLanguage, unexpectedErrorHandler } from "../../../../../common_functions/index.js";
import {  accountYakeenVerification } from "../messages.js";

export const phoneOwnershipVerification = async (req, res) => {
  try {
    let crNumber;
    let phoneNumber = req.body.Phone_Number;
    let identifierKey;
    if (req.body.Unique_Key == businessSectors.freelenacer) {
      crNumber = req.identifier;
      identifierKey = "NID";
    } else {
      crNumber = req.body.Cr_Number;
      identifierKey = "CR_Number";
    }
    const yakeenResponse = await yakeen.verify_phone_ownership({
      id: crNumber,
      phone_number: phoneNumber,
      merchant_id: req.body.merchantId,
      identifierKey: identifierKey,
    });
    // Core logic for verification

    return yakeenResponse;
  } catch (error) {
    console.error("Error in verifyPhoneOwnership:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountYakeenVerification[lang]);
  }
};

export default { phoneOwnershipVerification };
