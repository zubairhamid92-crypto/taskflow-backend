import { Model, sendWarning } from "../../../global_imports/index.js";

import { optionKeys, businessSectors } from "../../../enums/index.js";

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
    throw error;
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
    throw error;
  }
};
const checkNafathVerify = async (req, res) => {
  try {
    let businessAccountId;
    if (req.body.businessAccountId) {
      businessAccountId = req.body.businessAccountId;
    } else {
      businessAccountId = req.query.businessAccountId;
    }
    let ownerApprovalInfo = await Model.MerchantAccountOptions.findOne({
      where: {
        Business_Account_ID: businessAccountId,
        Opt_Key: optionKeys.ownerApprovalInfo,
      },
    });
    let ownerApprovalInfoObject = JSON.parse(
      ownerApprovalInfo?.dataValues?.Opt_Value
    );
    if (!ownerApprovalInfoObject || !ownerApprovalInfoObject.is_approved) {
      // sendWarning(res, "Nafath is not verified yet");
      return false;
      //  sendError(res, "Nafath is not verified yet", 500);
    }
    return true;
  } catch (error) {
    throw new Error(error);
  }
};
export {
  MerchantAccountWizzardData,
  ServiceProductsByAcctId,
  checkNafathVerify,
};
