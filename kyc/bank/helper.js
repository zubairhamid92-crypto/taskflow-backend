import { Model } from "../../../../global_imports/index.js";

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
  await Model.MerchantAccountTimeLine.create({
    Timeline_Key: changeFrom,
    Business_Account_ID: businessAccountId,
  });
};

const updateMerchantName = async (merchantId, beneficiaryName) => {
  try {
    await Model.MerchantUser.update(
      { Full_Name: beneficiaryName },
      {
        where: {
          Merchant_ID: merchantId,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
};
const getIbanVerificationFromIntegrationPoint = async (req, identifierKey) => {
  try {
    let getIntegrationPoint = await Model.IntegrationPoint.findOne({
      where: {
        Identifier_Key: identifierKey,
        Identifier_Value: req.body.ibanNumber,
        Is_Error: 0,
      },
    });
    let ibanVerificationIntegrationResponse = "";
    if (getIntegrationPoint?.dataValues?.Response) {
      let jsonResponse = JSON.parse(getIntegrationPoint.dataValues.Response);
      ibanVerificationIntegrationResponse = jsonResponse.body;
    }

    // Core logic for verification

    return ibanVerificationIntegrationResponse;
  } catch (error) {
    console.error("Error in verifyPhoneOwnership:", error);
    throw new Error(error.message || "Verification failed");
  }
};
const addInSystemOption = async (accessToken) => {
  try {
    const expiryDate = new Date(
      Date.now() + accessToken?.expires_in * 1000
    ).toISOString();

    const options = [
      {
        Opt_Key: "Bwa_Tech_Access_Token",
        Opt_Value: accessToken?.access_token,
      },
      {
        Opt_Key: "Bwa_Tech_Access_Token_Expiry",
        Opt_Value: expiryDate,
      },
    ];

    for (const option of options) {
      const existing = await Model.ApplicationSystemOptions.findOne({
        where: { Opt_Key: option.Opt_Key },
      });

      if (existing) {
        await existing.update({
          Opt_Value: option.Opt_Value,
        });
      } else {
        await Model.ApplicationSystemOptions.create(option);
      }
    }
  } catch (error) {
    console.error("Error adding system option:", error);
    throw new Error(error.message || "Failed to add system option");
  }
};
const getSystemOptionTokenExpiry = async () => {
  try {
    const options = await Model.ApplicationSystemOptions.findAll({
      where: {
        Opt_Key: [
          "Bwa_Tech_Access_Token",
          "Bwa_Tech_Access_Token_Expiry",
        ],
      },
    });

    const result = {};

    for (const option of options) {
      if (option.Opt_Key === "Bwa_Tech_Access_Token") {
        result.access_token = option.Opt_Value;
      }

      if (option.Opt_Key === "Bwa_Tech_Access_Token_Expiry") {
        result.expiry = option.Opt_Value;
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching system option token:", error);
    throw new Error(
      error.message || "Failed to fetch system option token"
    );
  }
};
const checkServiceDown = async () => {
  try {
    const existingOption = await Model.ApplicationSystemOptions.findOne({
      where: { Opt_Key: "Bwa_Tech_Service_Status" },
    });
    return existingOption?.Opt_Value === "DOWN";
  } catch (error) {
    console.error("Error checking service status:", error);
    throw new Error(error.message || "Failed to check service status");
  }
};
export {
  addAuditandTimeLine,
  updateMerchantName,
  getIbanVerificationFromIntegrationPoint,
  addInSystemOption,
  getSystemOptionTokenExpiry,
  checkServiceDown,
};
