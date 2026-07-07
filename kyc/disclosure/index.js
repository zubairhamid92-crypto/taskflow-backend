import { disclosureCreateMapper } from "./mapper.js";
import { disclosureAdded, disclosureUpdated } from "./messages.js";
import { Model, sendSuccess, sendError, path } from "../../../../global_imports/index.js";
import { addAuditandTimeLine } from "./helper.js";
import { optionKeys, businessSectors } from "../../../../enums/index.js";
import { createOwnershipObject, getLanguage, unexpectedErrorHandler } from "../../../../common_functions/index.js";
import { auditLogActions, SystemLogCategoryEnum, SystemLogModuleNameEnum, SystemLogOperationsEnum, SystemLogPageIDEnum } from "../../../../enums/systemLogEnums.js";
import { accountProcessError } from "../messages.js";
import { calculateRisk } from "../risk_calculation/index.js";
import { addCalculatedRiskOption } from "../terms_conditions/helper.js";

export const disclosureInfo = async (req, res) => {
  try {
    const accountOptionsData = disclosureCreateMapper(req.body);
    const lang = req.headers.language || "en";
    const ownerShipObj = createOwnershipObject(req.merchantId);
    const existingRecord = await Model.MerchantAccountOptions.findOne({
      where: {
        Business_Account_ID: req.body.businessAccountId,
        Opt_Key: optionKeys.disclosureInfo,
      },
    });
    let record, created;
    if (existingRecord) {
      created = false;
      await Model.MerchantAccountOptions.update(
        { Opt_Value: accountOptionsData.Opt_Value, ...ownerShipObj },
        {
          where: {
            Business_Account_ID: req.body.businessAccountId,
            Opt_Key: optionKeys.disclosureInfo,
          },
        }
      );
      let calculatedResult = await calculateRisk(req);
      await addCalculatedRiskOption(calculatedResult, req);
    } else {
      created = true;
      accountOptionsData.Ownership = ownerShipObj.Ownership;
      accountOptionsData.User_ID = ownerShipObj.User_ID;
      record = await Model.MerchantAccountOptions.create(accountOptionsData);
    }

    // Add audit and timeline entry
    await addAuditandTimeLine(optionKeys.disclosureInfo, optionKeys.tersmAndConditionsInfo, req.body.businessAccountId, Model);
    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation: SystemLogOperationsEnum.accountsModule.merchantPortal.updateDisclosureInfo,
      action: auditLogActions.update,
      detailResponseData: {
        Option_ID: record?.Option_ID,
        Business_Account_ID: req.body.businessAccountId,
      },
      beforeOperationData: existingRecord?.dataValues || existingRecord,
    };
    if (created) {
      req.moduleSpecificData.Operation = SystemLogOperationsEnum.accountsModule.merchantPortal.addDisclosureInfo;
      req.moduleSpecificData.action = auditLogActions.add;
    }
    // Send success response
    sendSuccess(res, "", record);
  } catch (error) {
    // throw new Error(error);
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export default {
  disclosureInfo,
};
