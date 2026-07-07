import { termsConditionMapper } from "./mapper.js";
import { termsConditionAdded, disclosureUpdated } from "./messages.js";
import { getMerchantAccountDataByIdFunction } from "../../account/index.js";
import ejs from "ejs";
import {
  Model,
  sendSuccess,
  sendError,
  path,
} from "../../../../global_imports/index.js";
import {
  addAuditandTimeLine,
  updateAccountStatus,
  addCalculatedRiskOption,
  getAccountOptionData,
  isAllStepsCompleted,
  getAccountPackgesData,
  senEmailToMerchant,
  saveAmlResponse,
} from "./helper.js";
import { accountProcessError} from "../messages.js";
import { optionKeys, businessSectors } from "../../../../enums/index.js";
import { calculateRisk } from "../risk_calculation/index.js";
import { createOwnershipObject, getLanguage, unexpectedErrorHandler } from "../../../../common_functions/index.js";
import { auditLogActions, SystemLogCategoryEnum, SystemLogModuleNameEnum, SystemLogOperationsEnum, SystemLogPageIDEnum } from "../../../../enums/systemLogEnums.js";

export const termsConditionInfo = async (req, res) => {
  try {
    const termsConditionData = termsConditionMapper(req.body);
    let lang = req.headers.language ? req.headers.language : "en";
    req.params = { businessAccountId: req.body.businessAccountId };
    
    let accountData = await getMerchantAccountDataByIdFunction(req, res);
    let record, created;
 
    let accountOptionData = await getAccountOptionData(req);
    const ownerShipObj = createOwnershipObject(req.merchantId);

    let statusId;
    let totalRisk = null;
    let isMultiOwner = null;

    accountOptionData.forEach((element) => {
      if (element.Opt_Key === optionKeys.riskWeightageTotal) {
        totalRisk = Number(element.Opt_Value); // Ensure it's a number
      }

      if (element.Opt_Key === optionKeys.isMultiOnwer) {
        isMultiOwner = element.Opt_Value;
      }
    });

    if (
      totalRisk !== null &&
      totalRisk >= global.config.riskCalucation.threshold
    ) {
      statusId = 13;
    }
    if (isMultiOwner == 1) {
      statusId = 12;
    }
 
    let isStepsComplete = await isAllStepsCompleted(req.body, isMultiOwner);
    if (!isStepsComplete) {
      return sendError(res, "Please Complete All kYC steps first", 422, true);
    }
      let dynamicSubject = "New Merchant";
    const existingRecord = await Model.MerchantAccountOptions.findOne({
      where: {
        Business_Account_ID: termsConditionData.Business_Account_ID,
        Opt_Key: termsConditionData.Opt_Key,
      },
      include:[
        {
          model:Model.MerchantAccounts,
          as :"merchantAccount",
          where:{
            Merchant_ID :req.merchantId
          }
        }
      ]
    });
 
    if (existingRecord) {
       if (existingRecord.dataValues) {
      if (existingRecord?.dataValues.Opt_Value == 1) {
        dynamicSubject = "Merchant Updated";
      }
    }
      record = { ...(existingRecord?.get() ||  existingRecord) };
      created = false;
      await existingRecord.update({
        Opt_Value: termsConditionData.Opt_Value,
        Is_JSON: termsConditionData.Is_JSON,
        ...ownerShipObj,
      });
    } else {
      created = true;

      termsConditionData.Ownership = ownerShipObj.Ownership;
      termsConditionData.User_ID = ownerShipObj.User_ID;
      record = await Model.MerchantAccountOptions.create(termsConditionData);
    }
  
    await updateAccountStatus(req, statusId);

    await addAuditandTimeLine(
      optionKeys.tersmAndConditionsInfo,
      "",
      req?.body?.businessAccountId,
      Model,
      statusId
    );
    
    senEmailToMerchant(accountData.userData, req,dynamicSubject);
    saveAmlResponse(accountData.userData, req);


    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.updateTermsConditionInfo,
      action: auditLogActions.update,
      detailResponseData: {
        Option_ID: record?.Option_ID || null,
      },
      beforeOperationData: record
    };
    if(created) {
      req.moduleSpecificData.Operation = SystemLogOperationsEnum.accountsModule.merchantPortal.addTermsConditionInfo;
      req.moduleSpecificData.action = auditLogActions.add;
    }
    sendSuccess(res, termsConditionAdded[lang], null);
  } catch (error) {
    console.log(error);
    let lang = getLanguage(req);
   // await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
     throw error;
  }
};

export const getTermsConditionData = async (req, res) => {
  try {
    let calculatedResult = await calculateRisk(req);
    let accountData = await getAccountPackgesData(req);

    let html = "";
    if (accountData && accountData.length > 0) {
      let posPaymentChann = [];
      let pgwPaymentChann = [];
      let posPackage = accountData[0].posPackageId;
      let pgwPackage = accountData[0].pgwPackageId;
      let posMonthlySubscription = accountData[0].posMonthlySubscription;
      let pgwMonthlySubscription = accountData[0].pgwMonthlySubscription;

      let monthlyValueTransaction =
        JSON.parse(accountData[0].disclosureInfo)?.monthly_transaction_volume ??
        0;

      const posPaymentChannIds = new Set(); // to track added IDs
      const pgwPaymentChannIds = new Set(); // to track added IDs
      accountData.forEach((row) => {
        if (
          row.posPayChannNameEn ||
          row.posPayChannNameAr ||
          row.posSalePercentage !== null
        ) {
          if (!posPaymentChannIds.has(row.posPaymentChannId)) {
            posPaymentChann.push({
              name_en: row.posPayChannNameEn,
              name_ar: row.posPayChannNameAr,
              sale_percentage: row.posSalePercentage,
            });
            posPaymentChannIds.add(row.posPaymentChannId); // mark ID as added
          }
        }

        if (
          row.pgwPayChannNameEn ||
          row.pgwPayChannNameAr ||
          row.pgwSalePercentage !== null
        ) {
          if (!pgwPaymentChannIds.has(row.pgwPaymentChannId)) {
            pgwPaymentChann.push({
              name_en: row.pgwPayChannNameEn,
              name_ar: row.pgwPayChannNameAr,
              sale_percentage: row.pgwSalePercentage,
            });
            pgwPaymentChannIds.add(row.pgwPaymentChannId); // mark ID as added
          }
        }
      });

      let lang = req.headers.language || "en";
      let tempPath, subject;
      switch (lang) {
        case "en":
          subject = "Welcome to Merchant Portal";
          tempPath = "./templates/merchant/terms_and_condition_en.ejs";
          break;
        case "ar":
          subject = "مرحبا بكم في بوابة الموزع!";
          tempPath = "./templates/merchant/terms_and_condition_ar.ejs";
          break;
      }

      html = await ejs.renderFile(tempPath, {
        posPaymentChann,
        posMonthlySubscription,
        pgwPaymentChann,
        pgwMonthlySubscription,
        monthlyValueTransaction,
        posPackage,
        pgwPackage,
      });
      // const html = await ejs.renderFile(tempPath, {
      //     logo: "https://company-logo.com/logo.png",
      //     name,
      //     email,
      //     domain,
      //     password,
      //     company: "Seapay",
      //     year: new Date().getFullYear(),
      //   });
      await addCalculatedRiskOption(calculatedResult, req);

      // req.moduleSpecificData = {
      //   Module_Category: SystemLogCategoryEnum.kyc,
      //   Module_Name: SystemLogModuleNameEnum.account,
      //   Page_ID: SystemLogPageIDEnum.listView,
      //   Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.viewTermsConditionInfo,
      //   action: auditLogActions.detail,
      //   detailResponseData: {
      //     Business_Account_ID: req.params.businessAccountId,
      //   },
      // };
    }
    sendSuccess(res, "", html);
  } catch (error) {
    console.log(error);
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
    // throw error;
  }
};
export default {
  termsConditionInfo,
  getTermsConditionData,
};
