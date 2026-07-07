import {
  optionKeys,
  businessSectors,
  integrationPointEnum,
} from "../../../../../enums/index.js";
import { verifyOwnershipAccount, verifyAddressInformation} from "../../messages.js";
import {
  yakeen,
  spl,
  invalidCrNumber,
  alreadExistCrNumber,
  invalidMerchant,
  invalidOwnerInformation,
  Model,
} from "../../../../../global_imports/index.js";
import { getOwnershipVerification } from "./helper.js";
import { getLanguage, unexpectedErrorHandler } from "../../../../../common_functions/index.js";

export const nationalAddressVerification = async (req, res,crNumber) => {
  try {
    let nationalAddress;
    let identifierKey;

    if (req.body.Unique_Key == businessSectors.privateSector) {
      identifierKey = "Address_By_CR";
      let identifier = crNumber;
      let checkSplCrIntegration = await splCrIntegrationPoint(
        identifier,
        identifierKey
      );
      if (!checkSplCrIntegration) {
        nationalAddress = await spl.get_by_cr({
          identifier,
          identifierKey,
          req,
        });
      } else {
        nationalAddress = checkSplCrIntegration;
      }
    } else {
      identifierKey = "Address_By_NID";
      let identifier = req.username;
      let checkSplIdIntegration = await splIdIntegrationPoint(
        identifier,
        identifierKey
      );
      if (!checkSplIdIntegration) {
        nationalAddress = await spl.get_by_id({
          identifier,
          identifierKey,
          req,
        });
      } else {
        nationalAddress = checkSplIdIntegration;
      }
    }
    let apiResponse
    if (typeof nationalAddress === "string") {
    apiResponse = JSON.parse(nationalAddress);
  } else {
    apiResponse = nationalAddress;
  }
    return apiResponse;
  } catch (error) {
    console.error("Error in verifyPhoneOwnership:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, verifyAddressInformation[lang]);
  }
};
export const ownershipVerification = async (req, res) => {
  try {
    let ownershipData;

    if (req.body.Unique_Key == businessSectors.freelenacer) {
      ownershipData = [
        {
          identity: {
            id: req.username,
            type: req.identifier,
          },

          name: "",
        },
      ];
    } else {
      ownershipData = await getOwnershipVerification(
        req.body.Un_Number,
        req.identifier,
        req
      );
    }

    return ownershipData;
  } catch (error) {
    console.error("Error in verifyPhoneOwnership:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, verifyOwnershipAccount[lang]);
  }
};
async function splCrIntegrationPoint(identifier, identifierKey) {
  let splResponse = "";
  let getIntegrationPoint = await Model.IntegrationPoint.findOne({
    where: {
      Integration_Point: integrationPointEnum.SPL,
      Identifier_Key: identifierKey,
      Identifier_Value: identifier,
      Is_Error: 0,
    },
  });

  if (
    getIntegrationPoint &&
    getIntegrationPoint.dataValues &&
    getIntegrationPoint.dataValues.Response
  ) {
    let jsonResponse = JSON.parse(getIntegrationPoint.dataValues.Response);
    splResponse = jsonResponse.body;
    // proceed with yaqeenIntegrationResponse
  } else {
    splResponse = false;
  }
  return splResponse;
}
async function splIdIntegrationPoint(identifier, identifierKey) {
  let splResponse = "";
  let getIntegrationPoint = await Model.IntegrationPoint.findOne({
    where: {
      Integration_Point: integrationPointEnum.SPL,
      Identifier_Key: identifierKey,
      Identifier_Value: identifier,
      Is_Error: 0,
    },
  });

  if (
    getIntegrationPoint &&
    getIntegrationPoint.dataValues &&
    getIntegrationPoint.dataValues.Response
  ) {
    let jsonResponse = JSON.parse(getIntegrationPoint.dataValues.Response);
    splResponse = jsonResponse.body;
    // proceed with yaqeenIntegrationResponse
  } else {
    splResponse = false;
  }
  return splResponse;
}
export default { nationalAddressVerification, ownershipVerification };
