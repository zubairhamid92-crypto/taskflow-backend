import { brandAdded, brandUpdated } from "./messages.js";
import {
  Model,
  sendSuccess,
  sendError,
  path,
  convertToCamelCase,
  convertToSnakeCase,
} from "../../../../global_imports/index.js";
import { accountProcessError} from "../messages.js";
import { optionKeys, businessSectors } from "../../../../enums/index.js";
import { addAuditandTimeLine } from "./helper.js";
import region from "../../services/localization/regions.js";
import businessCategory from "../../services/setup/business-categories.js";
import { getLanguage, unexpectedErrorHandler } from "../../../../common_functions/index.js";
import { auditLogActions, SystemLogCategoryEnum, SystemLogModuleNameEnum, SystemLogOperationsEnum, SystemLogPageIDEnum } from "../../../../enums/systemLogEnums.js";
import { calculateRisk } from "../risk_calculation/index.js";
import { addCalculatedRiskOption } from "../terms_conditions/helper.js";

export const addBusinessInfo = async (req, res) => {
  try {
    const lang = req.headers.language ? req.headers.language : "en";
    req.body = convertToSnakeCase(req.body, req.headers);

    const existingRecord = await Model.MerchantAccountBussinessInfo.findOne({
      where: { Business_Account_ID: req.body.Business_Account_ID },
    });

    let record, created;

    if (existingRecord) {
      const posInfoRecord = await Model.MerchantAccountBussinessPosInfo.findOne(
        {
          where: { Business_Account_ID: req.body.Business_Account_ID },
        }
      );
      if (posInfoRecord?.dataValues.Region_ID != req.body.Region_ID) {
        await Model.MerchantAccountBussinessPosInfo.update(
          {
            Installed_Location_City_ID: 0,
            Installed_Location_District_ID: 0,
            Region_ID: 0,
          },
          {
            where: { Business_Account_ID: req.body.Business_Account_ID },
          }
        );
      }
      record = await existingRecord.update(req.body);
      created = false;
      let requestVar=convertToCamelCase(req.body)
      req.body.businessAccountId=requestVar.businessAccountId
      let calculatedResult = await calculateRisk(req);
        await addCalculatedRiskOption(calculatedResult,req);
    } else {
      record = await Model.MerchantAccountBussinessInfo.create(req.body);
      created = true;
    }
    // Audit and timeline action
    await addAuditandTimeLine(
      optionKeys.brandInfo,
      optionKeys.bankInfo,
      req?.body?.Business_Account_ID,
      Model
    );
    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.updateBusinessInfo,
      action: auditLogActions.update,
      detailResponseData: record,
      beforeOperationData: record
    };
    if(created) {
      req.moduleSpecificData.Operation = SystemLogOperationsEnum.accountsModule.merchantPortal.addBusinessInfo;
      req.moduleSpecificData.action = auditLogActions.add;
    }
    sendSuccess(res, "", record);
  } catch (error) {
    console.error("Error in manual upsert operation:", error);
    // throw new Error(error);
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const getBusinessInfo = async (req, res) => {
  try {
    const regionData = await region.getMenu(req, res);
    const businessCategoryData = await businessCategory.getMenu(req, res);

    sendSuccess(res, "", {
      masterData: {
        regions: regionData,
        businessCategories: businessCategoryData,
      },
      userData: "",
    });
    // Send appropriate response
  } catch (error) {
    console.error("Error in manual upsert operation:", error);
    // throw new Error(error);
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export default { addBusinessInfo, getBusinessInfo };
