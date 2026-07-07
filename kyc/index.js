import {
  fileDeletedSuccessfully,
  merchantAccountDoesnOTExist,
  accountVerifyAcknowledgment,
  accountProcessError,
  verifyOwnershipAccount,
  accountNafathVerification,
  verifyAcknowledgmentAccount
} from "./messages.js";
import { checkNafathVerify } from "./helper.js";
import { optionKeys, businessSectors } from "../../../enums/index.js";
import { addBusinessInfo, getBusinessInfo } from "../kyc/business/index.js";
import {
  bankInfo,
  uploadBankInfo,
  downloadBankInfo,
  deleteBankInfo,
} from "../kyc/bank/index.js";
import { contactInfo } from "../kyc/contact/index.js";
import { disclosureInfo } from "../kyc/disclosure/index.js";
import {
  serviceProductInfo,
  getServiceProductInfoMasterData,
  getByDefaultCityDistrictData,
} from "../kyc/services_products/index.js";
import {
  termsConditionInfo,
  getTermsConditionData,
} from "../kyc/terms_conditions/index.js";
import {
  merchantAccount,
  getMerchantAccountMaster,
  ownerDetails,
  reverifyNafath,
  merchantAccountAcknowledgment,
  getUnnByCr
} from "../kyc/verify_ownership/index.js";

import {
  Model,
  jwt,
  sequelize,
  sendSuccess,
  sendError,
  convertToCamelCase,
  fs,
  path,
  Op,
} from "../../../global_imports/index.js";
import { getLanguage, unexpectedErrorHandler } from "../../../common_functions/index.js";

async function merchantAccountVerificaton(req) {
  let businessAccountId;
  if (req.body.businessAccountId) {
    businessAccountId = req.body.businessAccountId;
  } else {
    businessAccountId = req.query.businessAccountId;
  }

  let whereClause = `ma.Merchant_Business_Account_ID =${businessAccountId} and ma.Merchant_ID=${req.merchantId} and ma.Is_Completed!=1 and ma.Is_Enabled=1 and ma.Is_Deleted=0 `;
  let lang = getLanguage(req);
  const merchantAccount = await sequelize.query(
    `CALL MerchantProc('GET_MERCHANT_ACCOUNT', :whereClause, :lang);`,
    { replacements: { whereClause, lang } }
  );

  if (merchantAccount?.length > 0) {
    return true;
  }
  return false;
}
export const addMerchantAccount = async (req, res) => {
  try {
    await merchantAccount(req, res);
  } catch (error) {
     let lang = getLanguage(req);
   // throw error;
   await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const getMerchantAccountMasterData = async (req, res) => {
  try {
    await getMerchantAccountMaster(req, res);
  } catch (error) {
   // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const verifyOwnerShip = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    await ownerDetails(req, res);
  } catch (error) {
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, verifyOwnershipAccount[lang]);
  }
};
export const addBusiness = async (req, res) => {
  try {
    let lang = getLanguage(req);

    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }

    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }

    await addBusinessInfo(req, res);
  } catch (error) {
    console.error("Error in manual upsert operation:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const reverifyOwnerShip = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }

    await reverifyNafath(req, res);
  } catch (error) {
    console.error("Error in manual upsert operation:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountNafathVerification[lang]);
  }
};
export const getBusiness = async (req, res) => {
  try {
    await getBusinessInfo(req, res);
  } catch (error) {
    console.error("Error in manual upsert operation:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const addBankDetails = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }
    await bankInfo(req, res);
  } catch (error) {
    console.error("Error in addBankDetails:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const uploadBankDetails = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }
    await uploadBankInfo(req, res);
  } catch (error) {
    console.error("Error in addBankDetails:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const downloadBankDetails = async (req, res) => {
  try {
    // let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }

    await downloadBankInfo(req, res);
  } catch (error) {
    console.error("Error in addBankDetails:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const deleteBankDetails = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }
    await deleteBankInfo(req, res);
  } catch (error) {
    console.error("Error in addBankDetails:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const addContacts = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }
    await contactInfo(req, res);
  } catch (error) {
    console.error("Error in addContacts:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const addDisclosures = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }
    await disclosureInfo(req, res);
  } catch (error) {
    console.error("Error in addDisclosures:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const addTermsCondition = async (req, res) => {
  try {
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }
    await termsConditionInfo(req, res);
  } catch (error) {
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const getTermsCondition = async (req, res) => {
  try {
    let lang = getLanguage(req);
    // let isValidAccount = await merchantAccountVerificaton(req);
    // if (!isValidAccount) {
    //   return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    // }
    await getTermsConditionData(req, res);
  } catch (error) {
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const addServiceProducts = async (req, res) => {
  try {
    if (req.body.POS) {
      req.body.businessAccountId = req.body.POS.businessAccountId;
    } else {
      req.body.businessAccountId = req.body.Electronic.businessAccountId;
    }
    let lang = getLanguage(req);
    let isValidAccount = await merchantAccountVerificaton(req);
    if (!isValidAccount) {
      return sendError(res, merchantAccountDoesnOTExist[lang], 500);
    }
    let isNafathVerify = await checkNafathVerify(req, res);
    if (!isNafathVerify) {
      return sendError(res, "Nafath is not verified yet", 500);
    }
    await serviceProductInfo(req, res);
  } catch (error) {
    console.error("Error in processing:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const getServiceProducts = async (req, res) => {
  try {
    await getServiceProductInfoMasterData(req, res);
  } catch (error) {
    console.error("Error in processing:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const getByDefaultCityDistrict = async (req, res) => {
  try {
    await getByDefaultCityDistrictData(req, res);
  } catch (error) {
    console.error("Error in processing:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const verifyAcknowledgment = async (req, res) => {
  try {
    let lang = getLanguage(req);
    if (Object.keys(req.body).length !== 0) {
     return sendError(res, accountVerifyAcknowledgment[lang], 500);
    }else{
      await merchantAccountAcknowledgment(req, res);
    }
      
  } catch (error) {
    console.error("Error in processing:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, verifyAcknowledgmentAccount[lang]);
  }
};
export const getUnnWathiq = async (req, res) => {
  try {
      await getUnnByCr(req, res);
    
  } catch (error) {
    console.error("Error in processing:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, verifyAcknowledgmentAccount[lang]);
  }
};

export default {
  addMerchantAccount,
  getMerchantAccountMasterData,
  verifyOwnerShip,
  addBusiness,
  getBusiness,
  addContacts,
  addBankDetails,
  addDisclosures,
  addTermsCondition,
  getTermsCondition,
  reverifyOwnerShip,
  addServiceProducts,
  getServiceProducts,
  uploadBankDetails,
  deleteBankDetails,
  downloadBankDetails,
  getByDefaultCityDistrict,
  verifyAcknowledgment,
  getUnnWathiq
};
