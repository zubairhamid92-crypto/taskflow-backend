import { Model, sequelize, aml } from "../../../../global_imports/index.js";
import { createOwnershipObject, getLanguage } from "../../../../common_functions/index.js";
import { addAddonLogger } from "../../../../libraries/addon_logger.js";
import he from "he";
import { optionKeys, businessSectors, ownershipEnum, integrationPointEnum } from "../../../../enums/index.js";
import { sendEmail } from "../../../../notifications/send_email.js";
import ejs from "ejs";
const addAuditandTimeLine = async (changeFrom, changeTo, businessAccountId, Model, statusId) => {
  await Model.MerchantAccountAudit.create({
    Moved_From: changeFrom,
    Moved_To: changeTo,
    Business_Account_ID: businessAccountId,
  });
  if (statusId) {
    if (statusId == 12) {
      await Model.MerchantAccountAudit.create({
        Moved_From: "Pending",
        Moved_To: "Waiting for Sales approval",
        Business_Account_ID: businessAccountId,
      });
    }
    if (statusId == 13) {
      await Model.MerchantAccountAudit.create({
        Moved_From: "Pending",
        Moved_To: "Waiting for AML approval",
        Business_Account_ID: businessAccountId,
      });
    }
  }
  const existingTimeline = await Model.MerchantAccountTimeLine.findOne({
    where: {
      Business_Account_ID: businessAccountId,
      Timeline_Key: changeFrom,
    },
  });

  if (!existingTimeline) {
    await Model.MerchantAccountTimeLine.create({
      Timeline_Key: changeFrom,
      Business_Account_ID: businessAccountId,
    });
  }
};

const updateAccountStatus = async (req, statusId) => {
  let updateBody = {
    Account_Status_ID: statusId,
  };
  await Model.MerchantAccounts.update(updateBody, {
    where: {
      Merchant_Business_Account_ID: req.body.businessAccountId,
      Merchant_ID: req.merchantId,
    },
  });
};

const isAllStepsCompleted = async (body, isMultiOwner) => {
  let completedSteps = await Model.MerchantAccountTimeLine.findAll({
    attributes: ["Timeline_Key", [sequelize.fn("COUNT", sequelize.col("Timeline_Key")), "count"]],
    where: {
      Business_Account_ID: body.businessAccountId,
    },
    group: ["Timeline_Key"], // Grouping by Moved_From
  });
  if (completedSteps.length < 6) {
    return false;
    // throw new Error("not all steps completed");
  }
  return true;
};
const getAccountOptionData = async (req) => {
  const businessAccountId = req.body.businessAccountId;

  let riskCalculatedData = await Model.MerchantAccountOptions.findAll({
    where: {
      Business_Account_ID: businessAccountId,
    },
    include: [
      {
        model: Model.MerchantAccounts,
        as: "merchantAccount",
        where: {
          Merchant_ID: req.merchantId,
        },
      },
    ],
  });

  return riskCalculatedData;
};

const getAccountPackgesData = async (req) => {
  const whereClause = `acc.Merchant_Business_Account_ID = '${req.query.businessAccountId}' and acc.Merchant_ID=${req.merchantId} `;
  let lang = getLanguage(req);
  const merchantAccountData = await sequelize.query(`CALL MerchantProc('GET_MERCHANT_ACCOUNT_INFO_FOR_TERMS_CONDITIONS', :whereClause, :lang);`, { replacements: { whereClause, lang } });
  return merchantAccountData;
};
const senEmailToMerchant = async (accountData, req,dynamicSubject) => {
  try {
    let tempPath, subject;
    let lang = "en";
    let to = global.config.system.notification_email_on_technical_error;

    let services = "";

    if (accountData.services_products_info?.pos?.packages.name) {
      services += "POS";
    }

    if (accountData.services_products_info?.electronic?.packages.name) {
      services += services ? ", PG" : "PG";
    }
    let status = accountData.AccountStatus;
    let displayMultiowner = accountData.isMultiOwner == "0" ? "none" : "block";
    let type = accountData.ownership_info.uniqueKey;
    let riskScore = accountData.riskWeightageScore ?? "";
    let businessIdentifier = accountData.business_info?.businessIdentifier;
    let tradeMarkName = accountData.business_info.trademarkName;
    let displayRisk = accountData.riskWeightageTotal > 70 ? "block" : "none";
    let risk = accountData.riskWeightageTotal ?? 0;
    let governmentRegistrationInfo = accountData.governmentRegistrationInfo;
    let companyName = accountData.ownership_info.uniqueKey == businessSectors.freelenacer ? tradeMarkName : (governmentRegistrationInfo?.crName ?? governmentRegistrationInfo?.name);

    //Abi k lye me freelance or private sector ka check ni lga rha qk abi hm national Address me hard code response rkhwa rhy he jisme KSABusinesses NI H
    let bCity = accountData.nationalAddressInfo?.Addresses[0]?.City_L2;
    let bStreet;
    accountData.nationalAddressInfo?.Addresses[0]?.Street_L2;

    let bPostalCode = accountData.nationalAddressInfo?.Addresses[0]?.PostCode;

    let oCity = accountData.nationalAddressInfo?.Addresses[0]?.City_L2;
    let oStreet;
    accountData.nationalAddressInfo?.Addresses[0]?.Street_L2;

    let oPostalCode = accountData.nationalAddressInfo?.Addresses[0]?.PostCode;
    let bEmail = accountData.contact_person_info?.emailAddress;
    let oEmail = accountData.contact_person_info?.emailAddress;
    let bName = accountData.contact_person_info?.fullName;
    let bPhoneNumber = accountData.contact_person_info?.phoneNumber;
    let oPhoneNumber = accountData.contact_person_info?.phoneNumber;
    let bankName = accountData.bank_account_info?.bank;
    let ibanNumber = accountData.bank_account_info?.iban;
    let iCity = accountData.services_products_info.pos.locations.map((location) => location.cityName).join(", ");
    let iDistrict = accountData.services_products_info.pos.locations.map((location) => location.districtName).join(", ");

    let count = accountData.services_products_info?.pos?.locations?.length;
    let posPackage = "";
    const posData = accountData.services_products_info?.pos?.packages;
    if (posData?.name && posData?.uniPayId) {
      posPackage = `${posData.name}-${posData.uniPayId}`;
    }

    let posPartner = req.session.resellerData?.Name ?? "";
    let pgWebsite = accountData.services_products_info?.electronic?.websiteUrl ?? "";

    let pgwPackage = "";
    const pgwData = accountData.services_products_info?.electronic?.packages;
    if (pgwData?.name && pgwData?.uniPayId) {
      pgwPackage = `${pgwData.name}-${pgwData.uniPayId}`;
    }
    let vatNumber = accountData.ownership_info?.taxNumber;

    let pgwPartner = req.session.resellerData?.Name ?? "";
    let diplomatic = accountData.disclosure_info?.isPolitician ?? "";
    let nid = req.username;
    let fullName = accountData.merchantName;
    let birthday = accountData.ownership_info.uniqueKey == businessSectors.freelenacer ? "None" : accountData.birthday;

    let yearly = accountData.disclosure_info?.yearlySale ?? 0;
    let monthlyAmount = accountData.disclosure_info?.monthlyTransactionVolume ?? 0;

    let monthlyVolume = accountData.disclosure_info?.monthlyTransactionCount ?? 0;
    let ibanCertificate = accountData.bank_account_info?.ibanCertificate;
    let posCards = "";
    let pgwCards = "";
    let mcc = accountData.business_info?.businessCategory;

    let holderName = accountData.bank_account_info?.holderName ?? "";
    let existingAccount = accountData.disclosure_info?.is_another_account ? "Yes" : "No";
    switch (lang) {
      case "en":
        subject = dynamicSubject + " " + businessIdentifier;
        tempPath = "./templates/merchant/account_add_temp_en.ejs";

        break;
      case "ar":
        subject = "مرحباً بك في خدمتنا!";
        tempPath = "./templates/admin/add_reseller_temp_ar.ejs";
        break;
    }
    const html = await ejs.renderFile(tempPath, {
      dynamicSubject,
      services,
      status,
      displayMultiowner,
      type,
      riskScore,
      businessIdentifier,
      tradeMarkName,
      displayRisk,
      risk,
      companyName,
      bCity,
      bStreet,
      bPostalCode,
      oCity,
      oStreet,
      oPostalCode,
      bEmail,
      bName,
      bPhoneNumber,
      oEmail,
      oPhoneNumber,
      bankName,
      ibanNumber,
      iCity,
      iDistrict,
      count,
      posPackage,
      posPartner,
      pgWebsite,
      pgwPackage,
      pgwPartner,
      diplomatic,
      nid,
      fullName,
      birthday,
      yearly,
      monthlyAmount,
      monthlyVolume,
      ibanCertificate,
      posCards,
      pgwCards,
      mcc,
      holderName,
      existingAccount,
      vatNumber,
    });
    const startTime = Date.now();
    let response = await sendEmail(to, subject, html);
    const endTime = Date.now();
    const duration = endTime - startTime;
    let body = {
      subject: subject,
      sender: process.env.MAIL_MAIL,
      receiver: to,
      message: he.encode(html),
    };
    let detail = {
      orderId: req.params.businessAccountId,
      merchantId: req.merchantId,
    };
    let addonLoggerData = makeLoggerObjectForEmail(detail, response, duration, body);
    await addAddonLogger(addonLoggerData);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};

const saveAmlResponse = async (accountData, req) => {
  try {
    let apiObject;
    let response;

    if (accountData.ownership_info.uniqueKey == businessSectors.freelenacer) {
      const nameParts = accountData?.contact_person_info.fullName?.trim().split(" ");

      const firstName = nameParts[0] || "";
      const secondName = nameParts[1] || "";
      const thirdName = nameParts[2] || "";

      const lastName = nameParts[nameParts.length - 1] || "";
      apiObject = {
        ownerShip: ownershipEnum.merchant,
        firstName,
        secondName,
        thirdName,
        lastName,
        merchantId: req.merchantId,
        identifierKey: "Verify_Individual",
        accountOptionIdentifierKey: "Individual",
        identifierValue: accountData.businessIdentifier,
        AccountOptionValue: {
          First_Name: firstName,
          Middle_Name: secondName,
          Third_Name: thirdName,
          Last_Name: lastName,
        },
      };

      response = await aml.individual_search({ apiObject });
    } else {
      let companyName = accountData.governmentRegistrationInfo.name??accountData.governmentRegistrationInfo.crName;
      apiObject = {
        ownerShip: ownershipEnum.merchant,
        companyName,
        merchantId: req.merchantId,
        identifierKey: "Verify_Company",
        accountOptionIdentifierKey: "Company",
        identifierValue: accountData.businessIdentifier,
        AccountOptionValue: {
          Company_Name: companyName,
        },
      };
      response = await aml.company_search({ apiObject });
    }
    if (response && response?.requestId) {
      let amlInfoResult = {
        Request_ID: response.requestId,
        Request_Status: response.requestStatus,
        Max_Matched_Percent: response.maxMatchedPercent,
        Is_PEP: response.isPEP,
        Request_Status_Description: response.requestStatusDescription,
      };
      let amlInfoObject = {
        Mode: apiObject.accountOptionIdentifierKey,
        Query: apiObject.AccountOptionValue,
      };
      await saveAccountOptionsAml(req.body.businessAccountId, amlInfoResult, amlInfoObject, req.merchantId);
    }
  } catch (error) {
    console.log(error);

    throw new Error(error);
  }
};
const saveAccountOptionsAml = async (businessAccountId, response, amlInfoObject, loggedInUser) => {
  try {
    const ownerShipObj = createOwnershipObject(loggedInUser);
    const accountOptionsData = [
      {
        Business_Account_ID: businessAccountId,
        Opt_Key: optionKeys.amlInfoResult,
        Opt_Value: JSON.stringify(response),
        Is_JSON: 1,
        ...ownerShipObj,
      },
      {
        Business_Account_ID: businessAccountId,
        Opt_Key: optionKeys.amlInfo,
        Opt_Value: JSON.stringify(amlInfoObject),
        Is_JSON: 1,
        ...ownerShipObj,
      },
    ];

    for (const option of accountOptionsData) {
      const existing = await Model.MerchantAccountOptions.findOne({
        where: {
          Business_Account_ID: option.Business_Account_ID,
          Opt_Key: option.Opt_Key,
        },
        include: [
          {
            model: Model.MerchantAccounts,
            as: "merchantAccount",
            where: {
              Merchant_ID: loggedInUser,
            },
          },
        ],
      });

      if (existing) {
        await existing.update({
          Opt_Value: option.Opt_Value,
          Is_JSON: option.Is_JSON,
          ...ownerShipObj,
        });
      } else {
        await Model.MerchantAccountOptions.create(option);
      }
    }
  } catch (error) {
    console.error("Failed to save account options:", error);
    throw new Error(error);
  }
};
function makeLoggerObjectForEmail(detail, response, duration, body) {
  let request = {
    method: "smtp",
    url: "",
    headers: "",
    body: body,
  };
  let isError = 0;
  if (!response.accepted || response.accepted.length === 0) {
    isError = 1;
  }
  let saveResponse = {
    headers: response.headers ?? {},
    body: response,
  };
  let loggerObject = {
    Integration_Point: integrationPointEnum.Email,
    Ownership: ownershipEnum.merchant,
    Identifier_Key: "On_Create_Business_Account",
    Identifier_Value: detail.orderId,
    User_ID: detail.merchantId ?? 0,
    Time_Duration: duration,
    Is_Sent: 0,
    Is_Error: isError,
    Request: JSON.stringify(request),
    Response: JSON.stringify(saveResponse),
  };
  return loggerObject;
}

const checkAMLIntegrationPoint = async (identifierKey, identifierValue) => {
  try {
    let getIntegrationPoint = await Model.IntegrationPoint.findOne({
      where: {
        Identifier_Key: identifierKey,
        Identifier_Value: identifierValue,
        Is_Error: 0,
      },
    });
    let amlIntegrationPoint;
    if (getIntegrationPoint && getIntegrationPoint.dataValues && getIntegrationPoint.dataValues.Response) {
      let sendResponse = JSON.parse(getIntegrationPoint.dataValues.Response);
      amlIntegrationPoint = sendResponse.body;
      // proceed with yaqeenIntegrationResponse
    }
    return amlIntegrationPoint;
  } catch (error) {
    return error;
  }
};
const addCalculatedRiskOption = async (calculatedResult, req) => {
  let businessAccountId;
  if (req.query?.businessAccountId) {
    businessAccountId = req.query?.businessAccountId;
  } else {
    businessAccountId = req.body.businessAccountId;
  }
  const ownerShipObj = createOwnershipObject(req.merchantId);
  const mappings = [
    {
      Opt_Key: optionKeys.riskWeightageResult,
      Opt_Value: JSON.stringify(calculatedResult.resultObj),
      Is_JSON: 1,
      ...ownerShipObj,
    },
    {
      Opt_Key: optionKeys.riskWeightageTotal,
      Opt_Value: calculatedResult.total,
      Is_JSON: 0,
      ...ownerShipObj,
    },
    {
      Opt_Key: optionKeys.riskWeightageScore,
      Opt_Value: calculatedResult.score,
      Is_JSON: 0,
      ...ownerShipObj,
    },
    {
      Opt_Key: optionKeys.riskWeightageConfig,
      Opt_Value: JSON.stringify(global.config.riskCalucation),
      Is_JSON: 1,
      ...ownerShipObj,
    },
  ];

  for (const data of mappings) {
    const [record, created] = await Model.MerchantAccountOptions.findOrCreate({
      where: {
        Business_Account_ID: businessAccountId,
        Opt_Key: data.Opt_Key,
      },
      defaults: {
        Business_Account_ID: businessAccountId,
        Opt_Value: data.Opt_Value,
        Is_JSON: data.Is_JSON,
        ...ownerShipObj,
      },
    });

    if (!created) {
      await record.update({
        Opt_Value: data.Opt_Value,
        Is_JSON: data.Is_JSON,
        ...ownerShipObj,
      });
    }
  }
};

export { addAuditandTimeLine, updateAccountStatus, addCalculatedRiskOption, getAccountOptionData, isAllStepsCompleted, getAccountPackgesData, senEmailToMerchant, saveAmlResponse };
