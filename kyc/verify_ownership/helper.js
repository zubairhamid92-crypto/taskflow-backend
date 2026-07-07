import { verifyOwnernCreateMapper } from "./mapper.js";
import { nafathVerifyError, verifyAcknowledgmentAccount, accountYakeenVerification } from "./messages.js";
import { verifyOwnershipAccount,accountProcessError} from "../messages.js";
import {
  Model,
  sequelize,
  nafath,
  sendWarning,
  yakeen,
} from "../../../../global_imports/index.js";
import { Op, Sequelize } from "sequelize";
import {
  optionKeys,
  businessSectors,
  integrationPointEnum,
  ownershipEnum
} from "../../../../enums/index.js";
import { getPagination, unexpectedErrorHandler, getLanguage } from "../../../../common_functions/index.js";
import moment from "moment";
const addAuditandTimeLine = async (
  changeFrom,
  changeTo,
  businessAccountId,
  Model
) => {
  await Model.MerchantAccountAudit.create({
    Moved_From: changeFrom,
    Moved_To: changeTo,
    Business_Account_ID: businessAccountId,
  });
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
const addAcknowledgmentAuditandTimeLine = async (
  changeFrom,
  changeTo,
  businessAccountId,
  merchantId, 
  req,
  res
) => {
  try{
    const getTimeStamp= await Model.MerchantOptions.findOne({
    where: {
      Merchant_ID: merchantId,
      Opt_Key: changeFrom,
    },
  });
  let timestamp= "";
  if(getTimeStamp && getTimeStamp.Opt_Value){
    const optionValue= JSON.parse(getTimeStamp.Opt_Value);
    timestamp= optionValue.Verify_Acknowledgment_Timestamp;
    await Model.MerchantAccountAudit.create({
    Moved_From: changeFrom,
    Moved_To: changeTo,
    Business_Account_ID: businessAccountId,
    Created_On: timestamp
  });
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
      Created_On: timestamp
    });
  }
   await Model.MerchantOptions.update({Opt_Value:''},{where:{Option_ID: getTimeStamp.Option_ID }});
  }
  

  }catch(err){
    let lang = getLanguage(req);
    await unexpectedErrorHandler(err, req, res, verifyAcknowledgmentAccount[lang]);
   // throw new Error("Error in save account audit info");
  }
  
};
const getOwnershipVerification = async (
  businessIdentifier,
  wathiq,
  invalidCrNumber, //message
  alreadExistCrNumber,
  invalidMerchant,
  invalidOwnerInformation, //message
  lang,
  merchantIdentifier
) => {
  const existingOption = await Model.MerchantAccountOptions.findOne({
    where: {
      Opt_Key: "sector_info", // Ensure it matches the required key
      [Op.and]: [
        Sequelize.literal(
          `JSON_EXTRACT(Opt_Value, '$.UN_Number') = '${businessIdentifier}'`
        ),
      ],
    },
  });

  if (existingOption) {
    throw new Error(alreadExistCrNumber[lang]);
  }
  const crInformation = await wathiq.getCrInformation({
    businessIdentifier,
  });

  const ownerInformation = await wathiq.getOwnerInformation({
    businessIdentifier,
  });

  if (!ownerInformation || ownerInformation.length == 0) {
    throw new Error(invalidOwnerInformation[lang]);
  }

  //By pass this check for demo only  12-12-2024

  if (ownerInformation?.length > 0) {
    const hasValidOwner = ownerInformation.some(
      (owner) => owner.identity.id == merchantIdentifier
    );

    if (!hasValidOwner) {
      throw new Error(invalidMerchant[lang]); // Throw error if no match
    }
  }

  return [crInformation, ownerInformation];
  // } catch (error) {
  //   console.error("Error in getCrInformation:", error);
  //   return false; // Return false on any exception
  // }
};
const getYakeenResponseFromIntegrationPoint = async (req, res) => {
  try {
    let makeIndentifierValue = req.username + "_" + req.body.Phone_Number;

    let getIntegrationPoint = await Model.IntegrationPoint.findOne({
      where: {
        Integration_Point: integrationPointEnum.Yakeen,
        Identifier_Value: makeIndentifierValue,
        Is_Error: 0,
      },
    });
    let yaqeenIntegrationResponse;
    if (
      getIntegrationPoint &&
      getIntegrationPoint.dataValues &&
      getIntegrationPoint.dataValues.Response
    ) {
      let sendResponse = JSON.parse(getIntegrationPoint.dataValues.Response);
      yaqeenIntegrationResponse = sendResponse.body;
      // proceed with yaqeenIntegrationResponse
    } else {
      yaqeenIntegrationResponse = await yakeen.verify_phone_ownership({
        id: req.username,
        phone_number: req.body.Phone_Number,
        identifierKey: "NID",
      });
    }

    // Core logic for verification

    return yaqeenIntegrationResponse;
  } catch (error) {
    console.error("Error in verifyPhoneOwnership:", error);
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountYakeenVerification[lang]);
    //throw new Error(error.message || "Verification failed");
  }
};
const validateMerchantAccount = async (body, lang, sequelize) => {
  const whereClause = `ma.Business_Identifier = '${body.Business_Identifier}'    `;

  const merchantAccount = await sequelize.query(
    `CALL MerchantProc('GET_MERCHANT_ACCOUNT', :whereClause, :lang);`,
    { replacements: { whereClause, lang } }
  );
  return merchantAccount;
};
const validateMerchantAccountAcknowledgment = async (merchantId, changeFrom) => {
  const getTimeStamp= await Model.MerchantOptions.findOne({
    where: {
      Merchant_ID: merchantId,
      Opt_Key: changeFrom,
      Opt_Value: {
      [Op.and]: {
        [Op.ne]: null,   // not null
        [Op.ne]: '',     // not empty string
      }
    }
    },
  });
  return getTimeStamp;
};
const getMerchantAccount = async (businessAccountId, lang) => {
  const whereClause = `ma.Merchant_Business_Account_ID  = '${businessAccountId}' `;

  const merchantAccount = await sequelize.query(
    `CALL MerchantProc('GET_MERCHANT_ACCOUNT', :whereClause, :lang);`,
    { replacements: { whereClause, lang } }
  );
  return merchantAccount;
};
const MerchantAccount = async (body, lang, sequelize, req) => {
  try {
    let whereClause = "1=1";

    if (body.merchantId) {
      whereClause = `ma.Merchant_ID = '${body.merchantId}'`;
    }
    if (body.accountStatus) {
      whereClause += ` AND ma.Account_Status_ID=${body.accountStatus}`;
    }
    if (body.accountType) {
      whereClause += ` AND ma.Business_Sector_ID=${body.accountType}`;
    }
    if (body.fromDate && body.toDate) {
      let utcFromDate = moment(body.fromDate)
        .utc()
        .add(1, "day")
        .startOf("day")
        .format("YYYY-MM-DD HH:mm:ss");
      let utcToDate = moment(body.toDate)
        .utc()
        .add(1, "day")
        .endOf("day")
        .format("YYYY-MM-DD HH:mm:ss");

      whereClause += ` AND ma.Created_On >= '${utcFromDate}' AND ma.Created_On <= '${utcToDate}'`;
    }
    if (body.search) {
      whereClause += ` AND bi.Trademark_Name LIKE '%${req.query.search}%' `;
    }
    console.log("check whereclause", whereClause);

    let paginatedData = await getPagination(
      body,
      "GET_MERCHANT_ACCOUNT_COUNT",
      "MerchantProc",
      whereClause,
      lang
    );

    whereClause += ` LIMIT ${paginatedData.limit} OFFSET ${paginatedData.offset}`;
    console.log("CHECK WHERECLAUSE0", whereClause);

    const merchantAccountData = await sequelize.query(
      `CALL MerchantProc('GET_MERCHANT_ACCOUNT', :whereClause, :lang);`,
      { replacements: { whereClause, lang } }
    );

    return {
      merchantAccountData,

      totalRecords: paginatedData.totalRecords,
      // currentPage: page,
      // pageSize,
      // totalPages: Math.ceil(totalRecords / pageSize),
    };
  } catch (error) {
    console.error("Error executing stored procedures:", error);
    throw error;
  }
};

const MerchantAccountWizzardData = async (
  lang,
  businessAccountId,
  sequelize
) => {
  const whereClause = `ma.Merchant_Business_Account_ID = '${businessAccountId}'`;

  try {
    const merchantAccountData = await sequelize.query(
      `CALL MerchantProc('GET_MERCHANT_ACCOUNT_WIZARD_DATA', :whereClause, :lang);`,
      { replacements: { whereClause, lang } }
    );

    if (
      !Array.isArray(merchantAccountData) ||
      merchantAccountData.length === 0
    ) {
      console.error("No data returned from the stored procedure.");
      return {
        brands: {},
        private_Info: {},
        bank_details: {},
        contact_info: {},
        disclosure: {},
      };
    }

    // Initialize response
    const response = {
      brands: {},
      private_Info: {},
      bank_details: {},
      contact_info: {},
      disclosure: {},
    };
    response.businessSectorId = merchantAccountData[0].Business_Sector_ID;
    if (merchantAccountData[0].brandName) {
      response.brands = {
        trademarkName: merchantAccountData[0].brandName || null,
        regionId: merchantAccountData[0].regionId || null,
        businessCategoryId: merchantAccountData[0].businessCategoryId || null,
        businessAccountId: merchantAccountData[0].Merchant_Business_Account_ID,
      };
    }
    // Process the data
    merchantAccountData.forEach((record) => {
      // Process brand-related data

      // Process private information
      if (record.Opt_Key === optionKeys.sectorInfo && record.Opt_Value) {
        const privateInfo = JSON.parse(record.Opt_Value);
        response.private_Info = {
          cr_number: privateInfo.UN_Number ?? privateInfo.cr_number ?? null,
          tax_number: privateInfo.tax_number || null,
          businessAccountId: record.Merchant_Business_Account_ID,
        };
      }

      // Process bank details
      if (record.Opt_Key === optionKeys.bankInfo && record.Opt_Value) {
        const bankDetails = JSON.parse(record.Opt_Value);
        response.bank_details = {
          iban: bankDetails.iban_number || null,
          fileId: record.Filename_Encrypted || null,
          fileName: record.Filename_Original || null,
          businessAccountId: record.Merchant_Business_Account_ID,
        };
      }

      // Process contact information
      if (record.Opt_Key === optionKeys.contactInfo && record.Opt_Value) {
        const contactInfo = JSON.parse(record.Opt_Value);

        response.contact_info = {
          fullName: contactInfo.full_name || null,
          emailAddress: contactInfo.email_address || null,
          phoneNumber: contactInfo.phone_number || null,
          businessAccountId: record.Merchant_Business_Account_ID,
        };
      }

      // Process disclosure data
      if (record.Opt_Key === optionKeys.disclosureInfo && record.Opt_Value) {
        const disclosureData = JSON.parse(record.Opt_Value);
        response.disclosure = {
          isAnotherAccount: disclosureData?.is_another_account,
          isPolitician: disclosureData?.is_politician,
          monthlyTransactionCount:
            disclosureData.monthly_transaction_count || null,
          monthlyTransactionVolume:
            disclosureData.monthly_transaction_volume || null,
          yearlySale: disclosureData.yearly_sales || null,
          businessAccountId: record.Merchant_Business_Account_ID,
        };
      }
      response.isEdit = true;
      // Process Terms Condition
      if (
        record.Opt_Key === optionKeys.tersmAndConditionsInfo &&
        record.Opt_Value
      ) {
        const termsConditionInfo = JSON.parse(record.Opt_Value);

        response.tersm_and_conditions = {
          isAgree: termsConditionInfo,
        };
      }
    });

    return response;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

const ServiceProductsByAcctId = async (lang, businessAccountId, sequelize) => {
  const whereClause = `ma.Merchant_Business_Account_ID = '${businessAccountId}'`;

  try {
    const merchantAccountData = await sequelize.query(
      `CALL MerchantProc('GET_SERVICE_PRODUCTS_BY_ACCT_ID', :whereClause ,:lang);`,
      { replacements: { whereClause, lang } }
    );

    if (
      !Array.isArray(merchantAccountData) ||
      merchantAccountData.length === 0
    ) {
      console.error("No data returned from the stored procedure.");
      return {
        services_and_Products: {
          pos: {
            number_of_devices: 0,
            isSameLocation: 0,
            isSameIBAN: 0,
            locations: [],
            bankIbanNumber: [], // New array for IBANs
            Packages: {
              name: null,
              priceChannel: [],
            },
          },
          electronic: {
            website_url: null,
            Packages: {
              name: null,
              priceChannel: [],
            },
          },
        },
      };
    }

    const response = {
      servicesAndProducts: {
        pos: {
          numberOfDevices: 0,
          isSameLocation: 0,
          isSameIBAN: 0,
          locations: [],
          bankIbanNumber: [], // New array for IBANs
          packages: {
            name: null,
            priceChannel: [],
          },
        },
        electronic: {
          websiteUrl: null,
          packages: {
            name: null,
            priceChannel: [],
          },
        },
      },
    };

    // Iterate over each record in merchantAccountData

    merchantAccountData.forEach((record) => {
      // Parse locations
      if (record.posCityName || record.posDistrictName) {
        response.servicesAndProducts.pos.locations.push({
          cityName: record.posCityName,
          cityId: record.posCityId,
          districtName: record.posDistrictName,
          districtId: record.posDistrictId,
        });
      }
      if (record.bankAccountIbanNumber) {
        response.servicesAndProducts.pos.bankIbanNumber.push({
          bankAccountIbanNumber: record.bankAccountIbanNumber,
        });
      }
      // Parse POS price channels
      if (record.posPriceChannels) {
        const posChannels = record.posPriceChannels
          .split(";;")
          .map((channel) => {
            const [name, logo, id] = channel.split("||");
            return { name, logo, id };
          });

        response.servicesAndProducts.pos.packages.priceChannel.push(
          ...posChannels
        );
      }

      // Parse PGW price channels
      if (record.pgwPriceChannels) {
        const pgwChannels = record.pgwPriceChannels
          .split(";;")
          .map((channel) => {
            const [name, logo, id] = channel.split("||");
            return { name, logo, id };
          });

        response.servicesAndProducts.electronic.websiteUrl = record.Website_URL;
        response.servicesAndProducts.electronic.packages.priceChannel.push(
          ...pgwChannels
        );
      }

      // Assign package names if not already assigned
      if (!response.servicesAndProducts.pos.packages.name) {
        response.servicesAndProducts.pos.packages.name =
          record.posPackageName || null;
        response.servicesAndProducts.pos.packages.id =
          record.posPackageId || null;
      }

      if (!response.servicesAndProducts.electronic.packages.name) {
        response.servicesAndProducts.electronic.packages.name =
          record.pgwPackageName || null;
        response.servicesAndProducts.electronic.packages.id =
          record.pgwPackageId || null;
      }
    });

    // Calculate the number of devices
    response.servicesAndProducts.pos.numberOfDevices =
      merchantAccountData[0].Requested_Qty;
    response.servicesAndProducts.pos.isSameLocation = merchantAccountData[0]
      .Is_Same_Location
      ? true
      : false;
    response.servicesAndProducts.pos.isSameIBAN = merchantAccountData[0]
      .Is_Same_IBAN
      ? true
      : false;
    return response;
    //return merchantAccountData;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

const getNationalAddress = async (identifier, sector, lang, spl) => {
  const nationalAddress =
    sector == businessSectors.privateSector
      ? await spl.get_by_cr({ identifier })
      : await spl.get_by_id({ identifier });

  return nationalAddress;
};

const sendNafathApproval = async (
  crNumber,

  nafath
) => {
  const nafathResponse = await nafath.protected_upload_dir_path(crNumber);

  return nafathResponse;
};
const createMerchantAccount = async (
  body,
  ownershipData,
  Model,
  nationalAddress,
  yaqeenResponse,
  nafathResponse,
  loggedInUserId
) => {
  const accountData = await Model.MerchantAccounts.create(body);
  let businessAccountId = accountData.get("Merchant_Business_Account_ID");
  const accountOptionsData = verifyOwnernCreateMapper(
    body,
    ownershipData,
    nationalAddress,
    yaqeenResponse,
    nafathResponse,
    businessAccountId,
    loggedInUserId
  );
  await Model.MerchantAccountOptions.bulkCreate(accountOptionsData, {
    individualHooks: true,
  });

  return accountData.get("Merchant_Business_Account_ID");
};
const updateOwnerDetails = async (payload, Model, lang, res, req) => {
  try {
    // Fetch the current owner_Detail value

    const existingOption = await Model.MerchantAccountOptions.findOne({
      where: {
        Business_Account_ID: payload.Business_Account_ID,
        Opt_Key: optionKeys.ownerApprovalInfo,
      },
    });

   if (!existingOption) {
      return 404
     }

    // Parse existing JSON and update it
    const existingOwnerDetails = JSON.parse(existingOption.Opt_Value || "[]");
    const identifierValue = req.username + "_" + payload.Business_Account_ID;
    let getIntegrationPoint = await Model.IntegrationPoint.findOne({
      where: {
        Integration_Point: integrationPointEnum.Nafath,
        Identifier_Key: "Verify_Request",
        Identifier_Value: identifierValue,
        Is_Error: 0,
      },
    });
    let nafathResponse;
    if (
      getIntegrationPoint &&
      getIntegrationPoint.dataValues &&
      getIntegrationPoint.dataValues.Response
    ) {
      let sendResponse = JSON.parse(getIntegrationPoint.dataValues.Response);
      nafathResponse = sendResponse.body;
      // proceed with yaqeenIntegrationResponse
    } else {
      nafathResponse = await nafath.send_nafath_owner_verify_request({
        id: req.username,
        transaction_id: existingOwnerDetails.approval_token,
        random_number: existingOwnerDetails.random_number,
        req,
        businessAccountId: payload.Business_Account_ID,
      });
    }

    existingOwnerDetails.status = nafathResponse.status;
    if (existingOwnerDetails.status !== "COMPLETED") {
      return nafathVerifyError[lang]
    }

    existingOwnerDetails.is_approved = true;
    await Model.MerchantAccountOptions.update(
      {
        Opt_Value: JSON.stringify(existingOwnerDetails),
      },
      {
        where: {
          Business_Account_ID: payload.Business_Account_ID,
          Opt_Key: optionKeys.ownerApprovalInfo,
        },
      }
    );

    return existingOwnerDetails;
  } catch (error) {
    console.log("in ");

    console.error("Error in updateOwnerDetails:", error);
    // throw new Error("Failed to update owner details.");
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, verifyOwnershipAccount[lang]);
  }
};

const createNafathAccountOptions = async (req, nafathResponse) => {
  try {
      await Model.MerchantAccountOptions.create({
      Business_Account_ID: req.body.businessAccountId,
      Opt_Key: optionKeys.ownerApprovalInfo, // make sure key matches DB column name
      Opt_Value: JSON.stringify(nafathResponse),
      User_ID: req.merchantId,
      Is_JSON: 1,
      Ownership:ownershipEnum.merchant
    });
  } catch (error) {
     let lang = getLanguage(req);
     await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
    // throw new Error("Something went wrong");
  }
};

const checkUnnInfoIntegrationPoint= async(identifierValue, identifierKey)=> {
  let wathiqResponse = "";
  let getIntegrationPoint = await Model.IntegrationPoint.findOne({
    where: {
      Integration_Point: "Wathiq",
      Identifier_Key: identifierKey,
      Identifier_Value: identifierValue,
      Is_Error: 0,
    },
  });

  if (
    getIntegrationPoint &&
    getIntegrationPoint.dataValues &&
    getIntegrationPoint.dataValues.Response
  ) {
    let jsonResponse = JSON.parse(getIntegrationPoint.dataValues.Response);
    wathiqResponse = jsonResponse.body;

    // proceed with yaqeenIntegrationResponse
  } else {
    wathiqResponse = false;
  }
  return wathiqResponse;
}
async function getCountUnnLogs(merchantId)
{
  let unnLogsCount=await Model.MerchantAccountUnnLogs.count({
      where:{
        Merchant_ID:merchantId,
        Business_Account_ID:0
      }
    })
    return unnLogsCount
}
async function checkCountUnnLogs(merchantId)
{
    let unnLogsCount= await getCountUnnLogs(merchantId)
    const isLimitExceeded = unnLogsCount >= global.config.wathiq.unn_request_max_limit;
    return isLimitExceeded
}
async function updateUnnLogs(merchantId, businessAccountId) {
  try {
        await Model.MerchantAccountUnnLogs.update(
      { Business_Account_ID: businessAccountId },
      {
        where: {
          Merchant_ID: merchantId,
          Business_Account_ID: 0
        }
      }
    );
  } catch (error) {
    
    throw new Error(error);
    ; // rethrow so caller can handle it
  }
}


export {
  addAuditandTimeLine,
  getOwnershipVerification,
  validateMerchantAccount,
  MerchantAccount,
  MerchantAccountWizzardData,
  ServiceProductsByAcctId,
  getNationalAddress,
  sendNafathApproval,
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
};
