import {
  optionKeys,
  businessSectors,
  integrationPointEnum,
} from "../../../../../enums/index.js";
import { nafath, Model } from "../../../../../global_imports/index.js";
import moment from "moment";
import { accountNafathVerification} from "../messages.js";
import { getLanguage, unexpectedErrorHandler } from "../../../../../common_functions/index.js";
// Temporary store in-memory (for demo).
// In production better use Redis or DB.

export const nafathVerification = async (req, res) => {
  try {
    const identifierKey = "Create_Request";
    const nationalId = req.username;
    let identifierValue = nationalId + "_" + req.body.businessAccountId;
    const requestCount = await Model.IntegrationPoint.count({
      where: {
        Integration_Point: integrationPointEnum.Nafath,
        Identifier_Key: identifierKey,
        Identifier_Value: identifierValue,
      },
    });

    // Apply max request limit from config
     if (requestCount >= global.config.nafath.request_max_limit) {
      return "There is internal error in your request reference to your account verification, please contact to the support"
    }

    const nafathResponse = await nafath.send_nafath_owner_approval_request(
      nationalId,
      identifierKey,
      req
    );

    return [nafathResponse, requestCount];
  } catch (error) {
    console.error("Error in nafathVerification:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountNafathVerification[lang]);
  }
};
export default { nafathVerification };
