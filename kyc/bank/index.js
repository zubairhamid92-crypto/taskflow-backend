import {
  bankDetailAdded,
  bankDetailUpdated,
  fileDeletedSuccessfully,
} from "./messages.js";

import {
  generate_token,
  verify_iban_ownership,
} from "../../../../addons/bwa_tech/index.js";
import {
  Model,
  sendSuccess,
  sendWarning,
  sendError,
  path,
  sequelize,
  fs,
} from "../../../../global_imports/index.js";
import {
  createOwnershipObject,
  dateTimeFormat,
} from "../../../../common_functions/index.js";
import { getLanguage,  unexpectedErrorHandler } from "../../../../common_functions/index.js";

import { bankDetailCreateMapper } from "./mapper.js";
import { optionKeys, businessSectors } from "../../../../enums/index.js";
import {
  addAuditandTimeLine,
  updateMerchantName,
  getIbanVerificationFromIntegrationPoint,
  addInSystemOption,
  getSystemOptionTokenExpiry,
  checkServiceDown
} from "./helper.js";
import { auditLogActions, SystemLogCategoryEnum, SystemLogModuleNameEnum, SystemLogOperationsEnum, SystemLogPageIDEnum } from "../../../../enums/systemLogEnums.js";
import { getFileConfigByModuleName } from "../../../../common_functions/file_helper_functions.js";
import { accountProcessError} from "../messages.js";
export const bankInfo = async (req, res) => {
  try {
    const { file, body, headers, merchantId, username } = req;
    const lang = headers.language || "en";

    const { businessAccountId, ibanNumber } = body;

    let bankCode = ibanNumber.substring(4, 6);
    // Fetch required data in parallel
    const [getAccountData, existingOptionRecord, bank] = await Promise.all([
      Model.MerchantAccounts.findOne({
        where: { Merchant_Business_Account_ID: businessAccountId },
      }),
      Model.MerchantAccountOptions.findOne({
        where: {
          Business_Account_ID: businessAccountId,
          Opt_Key: optionKeys.bankInfo,
        },
      }),
      Model.MasterBanks.findOne({
        where: {
          Code: bankCode,
        },
      }),
    ]);

    let accountOptionsData;
    const ownerShipObj = createOwnershipObject(req.merchantId);
    console.log(
      "bank?.Is_Online_Verification_Enabled",
      bank?.Is_Online_Verification_Enabled
    );
   
    if (bank?.Is_Online_Verification_Enabled) {
    let accessToken=""
     if (process.env.MODE == "Production" || process.env.MODE === "UAT") {
      let isServiceDown = await checkServiceDown();
      if(isServiceDown)
      {
        return sendWarning(res,"We are currently experiencing technical difficulties, please try again later. Error Code : 400.005.003", 422)
      }
      let checkTokenExpiry = await getSystemOptionTokenExpiry();
      accessToken=checkTokenExpiry?.access_token
      if (!checkTokenExpiry?.expiry  || new Date(checkTokenExpiry?.expiry) < new Date()) {
            let generatedAccessToken= await generate_token({ merchantId });
            if (!generatedAccessToken?.access_token?.trim()) 
            {
              return sendWarning(res,"We are currently experiencing technical difficulties, please try again later. Error Code : 400.005.002",422);
            }
            await addInSystemOption(generatedAccessToken);
            accessToken=generatedAccessToken?.access_token
          }
           
      }
          
           
           
    const identifierValue =
       getAccountData?.Business_Sector_ID === 1000004
        ? username
        : getAccountData?.Business_Identifier;

    const identifierKey = identifierValue?.startsWith("1")
      ? "IBAN_By_NID"
      : identifierValue?.startsWith("2")
      ? "IBAN_By_IQAMA"
      : "IBAN_By_CR";

    const identifierType=identifierKey==="IBAN_By_NID"?40:identifierKey==="IBAN_By_IQAMA"?41:10
    const ibanVerificationData = await getIbanVerificationFromIntegrationPoint(req, identifierKey);
    const verification =
      Object.keys(ibanVerificationData).length > 0
        ? ibanVerificationData
        : await verify_iban_ownership({
            iban: ibanNumber,
            access_token: accessToken,
            merchantId,
            type:
              getAccountData?.Business_Sector_ID === 1000004
                ? "NATIONAL_ID"
                : "COMPANY_REGISTRATION_NUMBER",
            identifier:
            identifierValue,
            identifierKey,
            identifierType
          });

      if(typeof verification === "string" && verification === "Service is down")
      {
        return sendWarning(res,"We are currently experiencing technical difficulties, please try again later. Error Code : 400.005.003", 422)
      }
      if (!verification?.verifyAccountResponse || verification?.verifyAccountResponse?.statusCode!==1)
         return sendWarning(res,"The IBAN verification is failed due to wrong IBAN or not matched against your identity information", 422)
      
      accountOptionsData = bankDetailCreateMapper(
        "",//created_on
        verification?.verifyAccountResponse?.accountHolderName,
        ibanNumber,
        body,
        bank?.Bank_ID,
        verification
      );
    } else {
      accountOptionsData = bankDetailCreateMapper(
        dateTimeFormat(),
        req.body.accountHolderName,
        ibanNumber,
        body,
        bank?.Bank_ID,
        null
      );
    }
    const isUpdating = !!existingOptionRecord;
    let record, created = false;
    if (accountOptionsData) {
      if (isUpdating) {
        await Model.MerchantAccountOptions.update(
          { Opt_Value: accountOptionsData.Opt_Value, ...ownerShipObj },
          {
            where: {
              Business_Account_ID: businessAccountId,
              Opt_Key: optionKeys.bankInfo,
            },
          }
        );
      } else {
        accountOptionsData.Ownership = ownerShipObj.Ownership;
        accountOptionsData.User_ID = ownerShipObj.User_ID;
        record = await Model.MerchantAccountOptions.create(accountOptionsData);
        created = true;
      }

      // Add audit and timeline entry
      await addAuditandTimeLine(
        optionKeys.bankInfo,
        optionKeys.contactInfo,
        businessAccountId,
        Model
      );
    }
    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.updateBankInfo,
      action: auditLogActions.update,
      detailResponseData: {
        Option_ID: record?.Option_ID,
        Business_Account_ID: businessAccountId,
      },
      beforeOperationData: existingOptionRecord
    };
    if(created) {
      req.moduleSpecificData.Operation = SystemLogOperationsEnum.accountsModule.merchantPortal.addBankInfo;
      req.moduleSpecificData.action = auditLogActions.add;
    }
    // Send success response
    sendSuccess(res, "", {});
  } catch (error) {
    console.log(error);

    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const uploadBankInfo = async (req, res) => {
  try {
    const routeSegments = req.path.split("/");
    const routeName = routeSegments[routeSegments.length - 1];
    const { is_downloadable, is_deletable } = getFileConfigByModuleName('account_files');
    const basePath = 'merchant/account/kyc/bank-info';
                         
    const files = req.files;
    const lang = req.headers.language || "en";

    const existingFileRecords = await Model.MerchantAccountFiles.findAll({
      where: {
        Business_Account_ID: req.body.businessAccountId,
      },
    });

    const resellerId = req.session?.resellerData?.Reseller_ID || 0;
    const makeMerchantPath = `${resellerId}_${req.merchantId}`;
    const data = [];
    //app.set("trust proxy", true);
    const domain = `${req.protocol}s://${req.get("host")}`; // Replace with your actual domain
    let record, created = true;
    if (files && files.length > 0) {
      for (const file of files) {
        const filePath = path.join(
          global.config.filePath.protected_upload_dir_path +
            "/" +
            makeMerchantPath +
            "/" +
            "account",
          file.filename
        );

        const existingFileRecord = existingFileRecords.find(
          (record) => record.Filename_Encrypted === file.filename
        );

        if (existingFileRecord) {
          record = existingFileRecord
          created = false
          await Model.MerchantAccountFiles.update(
            {
              Filename_Encrypted: file.filename,
              Filename_Original: file.originalname,
              Path: filePath,
              Module_Key: optionKeys.bankInfo,
              Size: file.size,
              MIME_Type: file.mimetype,
              Name_Encrypted: path.parse(file.filename).name,
            },
            {
              where: {
                Business_Account_ID: req.body.businessAccountId,
                Filename_Encrypted: file.filename,
              },
            }
          );
        } else {
          created = true
          record = await Model.MerchantAccountFiles.create({
            Business_Account_ID: req.body.businessAccountId,
            Filename_Encrypted: file.filename,
            Filename_Original: file.originalname,
            Path: filePath,
            Module_Key: optionKeys.bankInfo,
            Size: file.size,
            MIME_Type: file.mimetype,
            Name_Encrypted: path.parse(file.filename).name,
          });
        }

        const fileId = path.parse(file.filename).name;
        const baseParams = `fileId=${fileId}&businessAccountId=${req.body.businessAccountId}`;

        const downloadLink = is_downloadable ? `${basePath}/download-file?${baseParams}` : "";
        const deletePath = routeName === "upload-file-update" ? "delete-file-update" : "delete-file";
        const deleteLink = is_deletable ? `${basePath}/${deletePath}?${baseParams}` : "";

        data.push({
          rawName: file.filename,
          nameOrig: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          downloadLink,
          deleteLink,
        });

      }
    } else {
      // Map existing records to the desired response format
      data.push(
        ...existingFileRecords.map((record) => {
          const fileId = record.Name_Encrypted;
          const downloadLink = is_downloadable ? `${basePath}/download-file?fileId=${fileId}` : "";
          const deleteLink = is_deletable ? `${basePath}/${routeName === "upload-file-update" ? 
            "delete-file-update" : "delete-file"}?fileId=${fileId}` : "";

          return {
            rawName: record.Filename_Encrypted,
            nameOrig: record.Filename_Original,
            size: record.Size,
            mimeType: record.MIME_Type,
            downloadLink,
            deleteLink,
          };
        })
      );
    }

    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.uploadBankFile,
      action: auditLogActions.update,
      detailResponseData: { File_ID: record?.File_ID, Business_Account_ID: req.body.businessAccountId },
      beforeOperationData: record
    };
    if(created) {
      req.moduleSpecificData.Operation = SystemLogOperationsEnum.accountsModule.merchantPortal.uploadBankFile;
      req.moduleSpecificData.action = auditLogActions.add;
    }
    sendSuccess(res, "", data[0]);
  } catch (error) {
    console.error("Error in addBankDetails:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const downloadBankInfo = async (req, res) => {
  try {
    const lang = getLanguage(req);
    let whereClause = `mFl.Name_Encrypted='${req.query.fileId}' and acct.Merchant_ID=${req.merchantId}`;
    let checkMerchantFile = await sequelize.query(
      `CALL MerchantProc('GET_MERCHANT_FILE', :whereClause, :lang)`,
      {
        replacements: {
          whereClause,
          lang: lang,
        },
      }
    );

    if (!checkMerchantFile || checkMerchantFile.length === 0) {
      return sendError(res, "File not found or unauthorized access", 404);
    }
    const resellerId = req.session?.resellerData?.Reseller_ID || 0;
    const makeMerchantPath = `${resellerId}_${req.merchantId}`;

    // Extract file details
    const { Path, Filename_Original, Filename_Encrypted } =
      checkMerchantFile[0];
    const filePath = path.join(
      global.config.filePath.protected_upload_dir_path +
        "/" +
        makeMerchantPath +
        "/" +
        "account",
      Filename_Encrypted
    );
    const fullPath = filePath; // Resolve the file path to absolute

    if (!fs.existsSync(fullPath)) {
      return sendError(res, "File does not exist on server", 404);
    }
    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.downloadBankFile,
    };
    return res.download(fullPath, Filename_Original, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return sendError(res, "Error downloading file", 500, err);
      }
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const deleteBankInfo = async (req, res) => {
  try {
    const { fileId } = req.query;
    const lang = req.headers.language || "en";

    const existingFileRecord = await Model.MerchantAccountFiles.findOne({
      where: {
        Name_Encrypted: fileId,
      },
    });

    if (!existingFileRecord) {
      return sendError(
        res,
        `No file found for the given Business_Account_ID: ${businessAccountId}`,
        404
      );
    }
    const resellerId = req.session?.resellerData?.Reseller_ID || 0;
    const makeMerchantPath = `${resellerId}_${req.merchantId}`;
    const filePath = path.join(
      global.config.filePath.protected_upload_dir_path +
        "/" +
        makeMerchantPath +
        "/" +
        "account",
      existingFileRecord.Filename_Encrypted
    );

    // Delete the file from the folder
    fs.unlink(filePath, async (err) => {
      if (err) {
        console.error("Error deleting file from folder:", err);
        return sendError(
          res,
          `Failed to delete file from folder: ${err.message}`,
          500,
          err
        );
      }

      await Model.MerchantAccountFiles.destroy({
        where: {
          Name_Encrypted: fileId,
        },
      });

      req.moduleSpecificData = {
        Module_Category: SystemLogCategoryEnum.kyc,
        Module_Name: SystemLogModuleNameEnum.account,
        Page_ID: SystemLogPageIDEnum.listView,
        Operation:  SystemLogOperationsEnum.accountsModule.merchantPortal.deleteBankFile,
        action: auditLogActions.update,
        beforeOperationData: existingFileRecord
      };
      sendSuccess(res, fileDeletedSuccessfully[lang], null);
    });
  } catch (error) {
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export default {
  bankInfo,
  uploadBankInfo,
  deleteBankInfo,
};
