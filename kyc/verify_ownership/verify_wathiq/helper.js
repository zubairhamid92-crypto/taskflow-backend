import {
  Model,
  Op,
  wathiq,
  sequelize,
  alreadExistCrNumber,
  invalidMerchant,
  invalidOwnerInformation,
} from "../../../../../global_imports/index.js";
import { getLanguage } from "../../../../../common_functions/index.js";
import { optionKeys, businessSectors } from "../../../../../enums/index.js";
const getOwnershipVerification = async (
  businessIdentifier,
  merchantIdentifier,
  req
) => {
  // try {
  let lang = getLanguage(req);
  const existingOption = await Model.MerchantAccountOptions.findOne({
    where: {
      Opt_Key: optionKeys.sectorInfo,
      [Op.and]: [
        sequelize.literal(
          `JSON_EXTRACT(Opt_Value, '$.UN_Number') = '${businessIdentifier}'`
        ),
      ],
    },
  });

    if (existingOption) {
    return alreadExistCrNumber[lang]
 }

  let crInformation;
  let getCrInfoFromIntegrationPoint = await checkCrInfoIntegrationPoint(
    businessIdentifier,
    "UN_Number_Info"
  );
  if (!getCrInfoFromIntegrationPoint) {
    crInformation = await wathiq.getCrInformation({
      businessIdentifier,
      req,
    });
  } else {
    crInformation = getCrInfoFromIntegrationPoint;
  }

  let ownerInformation;
  let getOwnerInfoFromIntegrationPoint = await checkOwnerInfoIntegrationPoint(
    businessIdentifier,
    "UN_Number_Owner"
  );
  if (!getOwnerInfoFromIntegrationPoint) {
    ownerInformation = await wathiq.getOwnerInformation({
      businessIdentifier,
      req,
    });
  } else {
    ownerInformation = getOwnerInfoFromIntegrationPoint;
  }
  if (!Array.isArray(ownerInformation) || ownerInformation.length === 0) {
    return invalidOwnerInformation[lang]
  }
    if (process.env.MODE !== "Development") {
    if (!crInformation.name || crInformation.name.trim() === "") {
      return "Invalid Commercial Registration Info"
    }
    if (Array.isArray(ownerInformation) && ownerInformation.length > 0) {
      const hasInvalidStructure = ownerInformation.some(
        (owner) => !owner.identity || typeof owner.identity.id === "undefined"
      );

      if (hasInvalidStructure) {
        return invalidOwnerInformation[lang]
      }

      const hasValidOwner = ownerInformation.some(
        (owner) => owner.identity.id == req.username
      );

      if (!hasValidOwner) {
        return invalidMerchant[lang]
      }
    } else {
      return invalidOwnerInformation[lang]
    }
    }

  return [crInformation, ownerInformation];
  // } catch (error) {
  //   console.error("Error in getCrInformation:", error);
  //   return false; // Return false on any exception
  // }
  console.log(
    "🚀 ~ getOwnerInfoFromIntegrationPoint:",
    getOwnerInfoFromIntegrationPoint
  );
  console.log(
    "🚀 ~ getOwnerInfoFromIntegrationPoint:",
    getOwnerInfoFromIntegrationPoint
  );
};
async function checkCrInfoIntegrationPoint(identifierValue, identifierKey) {
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
async function checkOwnerInfoIntegrationPoint(identifierValue, identifierKey) {
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
  } else {
    wathiqResponse = false;
  }
  return wathiqResponse;
}
export { getOwnershipVerification };
