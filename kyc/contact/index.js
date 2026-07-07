import { contactCreateMapper } from "./mapper.js";
import { contactAdded, contactUpdated } from "./messages.js";
import {
  Model,
  sendSuccess,
  sendError,
  path,
  convertToCamelCase,
  convertToSnakeCase,
} from "../../../../global_imports/index.js";
import { optionKeys, businessSectors } from "../../../../enums/index.js";
import { addAuditandTimeLine } from "./helper.js";
import { createOwnershipObject, getLanguage, unexpectedErrorHandler } from "../../../../common_functions/index.js";
import { auditLogActions, SystemLogCategoryEnum, SystemLogModuleNameEnum, SystemLogOperationsEnum, SystemLogPageIDEnum } from "../../../../enums/systemLogEnums.js";
import { accountProcessError} from "../messages.js";

export const contactInfo = async (req, res) => {
  try {
    const accountOptionsData = contactCreateMapper(req.body);
    const lang = req.headers.language || "en";
    const ownerShipObj = createOwnershipObject(req.merchantId);
    const existingRecord = await Model.MerchantAccountOptions.findOne({
      where: {
        Business_Account_ID: req.body.businessAccountId,
        Opt_Key: optionKeys.contactInfo,
      },
    });
    let record, created;
    if (existingRecord) {
      // Update the existing record
      created = false;
      await Model.MerchantAccountOptions.update(
        { Opt_Value: accountOptionsData.Opt_Value, ...ownerShipObj },
        {
          where: {
            Business_Account_ID: req.body.businessAccountId,
            Opt_Key: optionKeys.contactInfo,
          },
        }
      );
    } else {
      // Create a new record
      created = true;
      accountOptionsData.Ownership = ownerShipObj.Ownership
      accountOptionsData.User_ID = ownerShipObj.User_ID
      record = await Model.MerchantAccountOptions.create(accountOptionsData);
    }

    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.updateContactInfo,
      action: auditLogActions.update,
      detailResponseData: {
        Option_ID: record?.Option_ID,
        Business_Account_ID: req.body.businessAccountId,
      },
      beforeOperationData: existingRecord
    };
    if(created) {
      req.moduleSpecificData.Operation = SystemLogOperationsEnum.accountsModule.merchantPortal.addContactInfo;
      req.moduleSpecificData.action = auditLogActions.add;
    }
    // Add audit and timeline entry
    await addAuditandTimeLine(
      optionKeys.contactInfo,
      optionKeys.servicesAndProducts,
      req.body.businessAccountId,
      Model
    );

    // Send success response

    sendSuccess(res, "", record);
  } catch (error) {
    console.error("Error in addContacts:", error);
    // throw new Error(error);
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export default { contactInfo };
