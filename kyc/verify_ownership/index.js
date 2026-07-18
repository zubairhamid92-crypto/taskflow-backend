import {
  Model,
  sequelize,
  sendSuccess,
  sendError,
  sendWarning,
  convertToSnakeCase,
  nafath,
  addressNotFound,
  phoneNumberNotVerified,
  nafathRequestNotValid,
   alreadExistCrNumber,
  invalidMerchant,
  invalidOwnerInformation,
  wathiq
} from "../../../../global_imports/index.js";
import {
  optionKeys,
  businessSectors,
  integrationPointEnum,
} from "../../../../enums/index.js";
import {
  MerchantAccountAdded,
  verifiedOwner,
  merchantAccountAlreadyExist,
  fileDeletedSuccessfully,
  verifyAccountConsent,
  nafathVerifyError,
  accountProcessError,
  accountNafathVerification
} from "./messages.js";
import {
  addAuditandTimeLine,
  validateMerchantAccount,
  createMerchantAccount,
  updateOwnerDetails,
  getYakeenResponseFromIntegrationPoint,
  createNafathAccountOptions,
  addAcknowledgmentAuditandTimeLine,
  validateMerchantAccountAcknowledgment,
  checkUnnInfoIntegrationPoint,
  checkCountUnnLogs,
  updateUnnLogs,
  getCountUnnLogs
} from "./helper.js";
import {makeUnnLogsMapper} from"./mapper.js"
import {
  nationalAddressVerification,
  ownershipVerification,
} from "./verify_wathiq/index.js";
import moment from "moment";
import { nafathVerification } from "./verify_nafath/index.js";
import businessSector from "../../services/setup/business_sectors.js";
import { getLanguage, unexpectedErrorHandler } from "../../../../common_functions/index.js";
import { auditLogActions, SystemLogCategoryEnum, SystemLogModuleNameEnum, SystemLogOperationsEnum, SystemLogPageIDEnum } from "../../../../enums/systemLogEnums.js";

export const merchantAccount = async (req, res) => {
  try {
    req.body = convertToSnakeCase(req.body, req.headers);
    const lang = req.headers.language || "en";
    req.body.Reseller_ID = req.session.resellerData?.Reseller_ID;

    //fetch from token
    req.body.Business_Identifier = req.username;
    req.body.Merchant_ID = req.merchantId;
    req.body.Phone_Number = req.phone;

    req.body.Account_Status_ID = 1;

    if (req.body.Unique_Key == businessSectors.freelenacer) {
      req.body.Business_Identifier = req.body.Freelancer_Number;
    }
    if (req.body.Unique_Key == businessSectors.privateSector) {
      req.body.Business_Identifier = req.body.Un_Number;  //THIS is un number now
    }

    let validateMerchant = await validateMerchantAccount(
      req.body,
      lang,
      sequelize
    );
    if (validateMerchant?.length > 0) {
      return sendError(res, merchantAccountAlreadyExist[lang], 404);
    }
    const verifyAccountAcknowledgment= await validateMerchantAccountAcknowledgment(req.body?.Merchant_ID, optionKeys.verifyAcknowledgmentInfo);
    if(!verifyAccountAcknowledgment||verifyAccountAcknowledgment === null ){
      return sendError(res, verifyAccountConsent[lang], 422);
    }

    let nationalAddress, ownershipData, yaqeenResponse, nafathResponse;
    ownershipData = await ownershipVerification(req, res);
    let crNumber="";
    
   if (Array.isArray(ownershipData)) {
      if (ownershipData.length === 0) {
        return sendWarning(res, invalidOwnerInformation[lang], 422);
      }
      if (req.body.Unique_Key == businessSectors.privateSector) {
        crNumber=ownershipData[0]?.crNumber;
         req.body.crNumber=crNumber
      }
    } else {
      if (ownershipData === invalidOwnerInformation[lang]) {
        return sendWarning(res, invalidOwnerInformation[lang], 422);
      } else if (ownershipData === alreadExistCrNumber[lang]) {
        return sendWarning(res, alreadExistCrNumber[lang], 422);
      } else if (ownershipData === invalidMerchant[lang]) {
        return sendWarning(res, invalidMerchant[lang], 422);
      } else if (ownershipData === "Invalid Commercial Registration Info") {
        return sendWarning(res, "Invalid Commercial Registration Info", 422);
      } else {
        return sendWarning(res, ownershipData?.message || "Unknown error", 422);
      }
    }
    nationalAddress = await nationalAddressVerification(req, res,crNumber);

    yaqeenResponse = await getYakeenResponseFromIntegrationPoint(req, res);

    if (!nationalAddress.success) {
      return sendWarning(res, addressNotFound[lang], 422);
    }
    // if (!yaqeenResponse.isOwner) {
    //   return sendWarning(res, phoneNumberNotVerified[lang], 422);
    // }

    //return;
    const accountId = await createMerchantAccount(
      req.body,
      ownershipData,
      Model,
      nationalAddress,
      yaqeenResponse,
      nafathResponse,
      req.merchantId
    );
    req.body.businessAccountId = accountId;
    await addAcknowledgmentAuditandTimeLine(optionKeys.verifyAcknowledgmentInfo, optionKeys.verifyOwnerShip, accountId, req.body?.Merchant_ID, req, res);
    nafathResponse = await nafathVerification(req, res);
       if (Array.isArray(nafathResponse)) {
          if (!nafathResponse[0].is_successful) {
              return sendWarning(res, "We are currently experiencing technical difficulties, please try again later. Error Code : 400.004.005", 422);
            }
        }
       else
        {
          return sendWarning(res, nafathResponse, 422);
        }
      await createNafathAccountOptions(req, nafathResponse[0]);
      if (req.body.Unique_Key == businessSectors.privateSector) {
        await updateUnnLogs(req.merchantId,accountId)
      }

    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation: SystemLogOperationsEnum.accountsModule.merchantPortal.addSector,
      action: auditLogActions.add,
      detailResponseData: { Merchant_Business_Account_ID: accountId },
    };
    sendSuccess(res, "", {
      businessAccountId: accountId,
      nafathNumber: nafathResponse[0].random_number,
      nafathRequestCount:
        nafathResponse[1] + 1 + "/" + global.config.nafath.request_max_limit,
    });
  } catch (error) {
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
   // throw new Error(error);
  }
};
export const ownerDetails = async (req, res) => {
  try {
    let lang = req.headers.language ? req.headers.language : "en";
    req.body = convertToSnakeCase(req.body, req.headers);

    const ownerShipDetail = await updateOwnerDetails(req.body, Model, lang, res, req);
    if(ownerShipDetail==404)
    {
        return sendError(res, `No record found for Business_Account_ID: ${req.body.Business_Account_ID}`, 422);
    }
    else if(ownerShipDetail==nafathVerifyError[lang])
    {
      return sendError(res, nafathVerifyError[lang], 422);
    }
    await addAuditandTimeLine(
      optionKeys.verifyOwnerShip,
      optionKeys.brandInfo,
      req?.body?.Business_Account_ID,
      Model
    );

    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation: SystemLogOperationsEnum.accountsModule.merchantPortal.verifyOwnership,
      action: auditLogActions.add,
      detailResponseData: ownerShipDetail,
    };
    sendSuccess(res, "", {
      step: optionKeys.verifyOwnerShip,
    });
  } catch (error) {    
    throw new Error(error);
  }
};

export const reverifyNafath = async (req, res) => {
  try {
    const lang = req.headers.language || "en";
    let nafathResponse = await nafathVerification(req, res);
    if (!Array.isArray(nafathResponse)) {
      return sendError(res, "There is internal error in your request reference to your account verification, please contact to the support", 422);
    }
    req.body = convertToSnakeCase(req.body, req.headers);

    if (!nafathResponse[0].is_successful) {
      return sendWarning(res, "We are currently experiencing technical difficulties, please try again later. Error Code : 400.004.006", 422);
    }

    await Model.MerchantAccountOptions.update(
      { Opt_Value: JSON.stringify(nafathResponse[0]) }, // update value
      {
        where: {
          Opt_Key: optionKeys.ownerApprovalInfo,
          Business_Account_ID: req.body.Business_Account_ID,
        },
      }
    );
    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation: SystemLogOperationsEnum.accountsModule.merchantPortal.reverifyOwnership,
      action: auditLogActions.add,
      detailResponseData: nafathResponse[0],
    };
    sendSuccess(res, "", {
      businessAccountId: req.body.Business_Account_ID,
      nafathNumber: nafathResponse[0].random_number,
      nafathRequestCount:
        nafathResponse[1] + 1 + "/" + global.config.nafath.request_max_limit,
    });
  } catch (error) {
    console.log("error", error);

    // const errorMessage =
    //   error instanceof Error ? error.message : "An unknown error occurred";

    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountNafathVerification[lang]);
  }
};
export const getMerchantAccountMaster = async (req, res) => {
  try {
    let businessSectors = await businessSector.getMenu(req, res);
    let getUnnCount=await getCountUnnLogs(req.merchantId)
    sendSuccess(res, "", {
      masterData: {
        businessSectors: businessSectors,
        unnCount:getUnnCount +"/"+global.config.wathiq.unn_request_max_limit
      },
      userData: "",
    });
  } catch (error) {
    throw new Error(error);
  }
};
export const merchantAccountAcknowledgment = async (req, res) => {
  try {
    const lang = req.headers.language || "en";
    const optionValue= {
      Verify_Acknowledgment_Timestamp:  moment.utc(),
    }
    const merchantId= req.merchantId;
    const payload= {
      Merchant_ID: merchantId,
      Opt_Key: optionKeys.verifyAcknowledgmentInfo,
      Opt_Value : JSON.stringify(optionValue),
      Is_JSON : 1
    }
     const existing = await Model.MerchantOptions.findOne({
        where: {
          Merchant_ID: merchantId,
          Opt_Key: optionKeys.verifyAcknowledgmentInfo,
        },
      });
      if (existing) {
        await existing.update({ Opt_Value: payload.Opt_Value });
      } else {
        await Model.MerchantOptions.create(payload);
      }
    sendSuccess(res, "");
  } catch (error) {
    throw new Error(error);
  }
};
export const getUnnByCr = async (req, res) => {
  try {
    let unNumber= '';
    let unnInformation;
    let businessIdentifier=req.body.businessIdentifier
      let getUnnInfoFromIntegrationPoint = await checkUnnInfoIntegrationPoint(
        businessIdentifier,
        "UNN_Info"
      );
      if (!getUnnInfoFromIntegrationPoint) {
         //check counts from unn logs table
        let isLimitExceedUnnLogs= await checkCountUnnLogs(req.merchantId)
        if(isLimitExceedUnnLogs)
        {
          return sendWarning(res, "You have exceeded the maximum usage limit for this utility. Kindly contact the web administrator for further assistance", 422);
        }
        unnInformation = await wathiq.getUnnInformation({
         businessIdentifier,
          req,
        });
        //add entry in logs table
        let unnLogsMapper=await makeUnnLogsMapper(businessIdentifier,req.merchantId)
        await Model.MerchantAccountUnnLogs.create(unnLogsMapper)
      } else {
        unnInformation = getUnnInfoFromIntegrationPoint;
      }
      if(unnInformation?.crNationalNumber){
        unNumber= unnInformation.crNationalNumber
      }
      let getUnnCount=await getCountUnnLogs(req.merchantId)
    sendSuccess(res,"", {unNumber, unnCount:getUnnCount +"/"+global.config.wathiq.unn_request_max_limit});
  } catch (error) {
    throw new Error(error);
  }
};
export default {
  merchantAccount,
  ownerDetails,
  getMerchantAccountMaster,
  reverifyNafath,
  merchantAccountAcknowledgment,
  getUnnByCr
};
