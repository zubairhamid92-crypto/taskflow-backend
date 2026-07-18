import crypto from "crypto";
import {Model, sendSuccess, sendError, path, sequelize, fs} from "../../../../global_imports/index.js";
import { getLanguage } from "../../../../common_functions/index.js";
import { transferFileFromSrcToDest, validateFilePath } from "../../../../common_functions/file_helper_functions.js";

function toMd5(value) {
  return crypto.createHash("md5").update(value).digest("hex");
}
export const openUploadBankInfo = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, "File not found.");
    }
     const fileMetadata = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      downloadLink: `admin/reseller/download-file/${req.file.filename}`,
      deleteLink: `admin/reseller/delete-file/${req.file.filename}`,
    };
    const {SIGNATURE, MCIAUQWYOZNRIDPR, MBKTBDAMUBJPAKNP, CLIENT_ID} = req.body;
    if(!SIGNATURE || !MCIAUQWYOZNRIDPR || !MBKTBDAMUBJPAKNP){
        let filePath = path.resolve("./temp", req.file.originalname);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            }
        return sendError(res, "Not Allowed to upload File");
    }
    const signature = SIGNATURE;
    const originalString = MCIAUQWYOZNRIDPR+ MBKTBDAMUBJPAKNP;
    // console.log("originalString", originalString);
    
    const md5Value = toMd5(originalString);
    // console.log("MD5:", md5Value);
    if (md5Value === signature) {
    console.log("✅ Signature matched");
    } else {
        let filePath = path.resolve("./temp", req.file.originalname);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            }
        return sendError(res, "Not Allowed to upload File");
    }
     const regex = /^\d+_\d+$/;
    if (!regex.test(CLIENT_ID)) {
     let filePath = path.resolve("./temp", req.file.originalname);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            }
        return sendError(res, "Invalid Client ID");
    }
    const srcPath = "temp";
    const dynamicPath = `${ global.config.filePath.protected_upload_dir_path}/${CLIENT_ID}`;
    if (typeof dynamicPath !== "string") {
          throw new TypeError(
            `Invalid path type: expected string but got ${typeof dynamicPath}`
          );
        }
    if (!fs.existsSync(dynamicPath)) {
        fs.mkdirSync(dynamicPath, { recursive: true });
        console.log(`Directory created: ${dynamicPath}`);
        }
    // Check if subfolder exists in allowed directories
    const allowedDirs = global.config.filePath.protected_upload_allowed_dir;
    // Assume subfolder is sent in the request body
    const subfolder = "account"; 
    if (!allowedDirs.includes(subfolder)) {
        throw new Error(`Invalid subfolder. Allowed directories are: ${allowedDirs.join( ", ")}` );
        }
    const destPath = path.join(dynamicPath, subfolder);
    const finalPath = await transferFileFromSrcToDest(srcPath, destPath, fileMetadata.originalName);    
    sendSuccess(res, "File Upload successfully");
  } catch (error) {
    let filePath = path.resolve("./temp", req.file.originalname);
   if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error("Error in addBankDetails:", error);
    sendError(res, "Something went wrong", 500, error);
  }
};

export default { openUploadBankInfo };
