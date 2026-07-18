import { serviceProductsAdded } from "./messages.js";
import { Model, sendSuccess, sendError, path, sendWarning } from "../../../../global_imports/index.js";
import { convertToSnakeCase, getLanguage, unexpectedErrorHandler } from "../../../../common_functions/index.js";
import { addAuditandTimeLine,validateDependentPaymentChannels } from "./helper.js";
import product from "../../services/setup/products.js";
import city from "../../services/localization/cities.js";
import district from "../../services/localization/districts.js";
import { optionKeys, businessSectors } from "../../../../enums/index.js";
import { auditLogActions, SystemLogCategoryEnum, SystemLogModuleNameEnum, SystemLogOperationsEnum, SystemLogPageIDEnum } from "../../../../enums/systemLogEnums.js";
import { accountProcessError } from "../messages.js";

export const serviceProductInfo = async (req, res) => {
  try {
    const lang = req.headers.language || "en";
    let { POS = {}, Electronic = {} } = req.body;
    let posData,
      pgwData,
      created = true;
    // Extract data from POS object
    const { isSameLocation, isSameIBAN, requestedQty, packageId, locations = [], packages = {} } = POS;
     
    let businessAccountId;
    if (Electronic.businessAccountId) {
      businessAccountId = Electronic.businessAccountId;
    }
    if (POS.businessAccountId) {
      businessAccountId = POS.businessAccountId;
    }
    
    //destroy POS tables by default 
    const posExistingRecord = await Model.MerchantAccountBussinessPos.findOne({
        where: { Business_Account_ID:businessAccountId? businessAccountId : null},
      });
    if(posExistingRecord)
    {
        created = false;
        await Model.MerchantAccountBussinessPosPayChannel.destroy({
          where:{
            POS_ID: posExistingRecord ? posExistingRecord.POS_ID : null,
          }
        })  
        await Model.MerchantAccountBussinessPosInfo.destroy({
            where: { Business_Account_ID:businessAccountId? businessAccountId : null },
          });   
        await Model.MerchantAccountBussinessPos.destroy({
          where: { Business_Account_ID:businessAccountId? businessAccountId : null},
        });
    }
      
    const convertedPOS = {
      Business_Account_ID: businessAccountId,
      Is_Same_Location: isSameLocation,
      Is_Same_IBAN: isSameIBAN,
      Requested_Qty: requestedQty,
      Package_ID: packageId,
    };
    const convertedLocations = locations.map((location) => convertToSnakeCase(location, req.headers));

    // Convert Electronic fields to snake_case
    if (Object.keys(Electronic).length) {
      Electronic = convertToSnakeCase(Electronic, req.headers);
    }

    // Clear existing records in MerchantAccountBussinessPos and related tables
    if (locations.length > 0) {
      // Convert fields to snake_case
      let checkDependentPaymentChannels=await validateDependentPaymentChannels(packages.priceChannel)
      if(!checkDependentPaymentChannels)
      {
        return sendWarning(res, "There is an error in your request, please ensure that both the VISA & Master Cards are selected", 400);
      }
    } 
    if (convertedLocations.length > 0) {
      const newPos = await Model.MerchantAccountBussinessPos.create(convertedPOS);
      posData = newPos;
      for (const location of convertedLocations) {
        await Model.MerchantAccountBussinessPosInfo.create({
          ...location,
        });
      }
      const posPayChannelData = [];
      const priceChannelList = packages.priceChannel || [];
      priceChannelList.forEach((priceChannelId) => {
        posPayChannelData.push({
          POS_ID: newPos.POS_ID,
          Payment_Channel_ID: priceChannelId.id,
        });
      });

      // Bulk insert or update MerchantAccountBussinessPosPayChannel
      for (const payChannel of posPayChannelData) {
        await Model.MerchantAccountBussinessPosPayChannel.create(payChannel);
      }
    }
     //destroy Electronic tables by default
    const existingElectronic = await Model.MerchantAccountBussinessPgw.findOne({
      where: {
        Business_Account_ID: businessAccountId? businessAccountId : null,
        },
    });
    if(existingElectronic)
    {
      created = false;
      await Model.MerchantAccountBussinessPgwPayChann.destroy({
        where: {
          PGW_ID: existingElectronic ? existingElectronic.PGW_ID : null,
        },
      }); 
      await Model.MerchantAccountBussinessPgw.destroy({
        where: { Business_Account_ID: businessAccountId? businessAccountId : null },
      });
    }
      
    if (Object.keys(Electronic).length) {
      let checkDependentPaymentChannels= await validateDependentPaymentChannels(Electronic.Pricechannel_List)
      if(!checkDependentPaymentChannels)
      {
        return sendWarning(res, "There is an error in your request, please ensure that both the VISA & Master Cards are selected", 400);
      }
      let electronicInsertedRecord = await Model.MerchantAccountBussinessPgw.create(Electronic);
      pgwData = electronicInsertedRecord;
        
        // Prepare data for MerchantAccountBussinessPgwPayChannel
      const electronicPayChannelData = [];
      const priceChannelList = Electronic.Pricechannel_List || [];
      priceChannelList.forEach((priceChannelId) => {
        electronicPayChannelData.push({
          PGW_ID: electronicInsertedRecord.PGW_ID,
          Payment_Channel_ID: priceChannelId,
        });
      });

      // Bulk insert or update MerchantAccountBussinessPgwPayChannel
      for (const payChannel of electronicPayChannelData) {
        await Model.MerchantAccountBussinessPgwPayChann.create(payChannel);
      }
    }
    // Add audit and timeline
    await addAuditandTimeLine(optionKeys.servicesAndProducts, optionKeys.disclosureInfo, businessAccountId, Model);
    req.moduleSpecificData = {
      Module_Category: SystemLogCategoryEnum.kyc,
      Module_Name: SystemLogModuleNameEnum.account,
      Page_ID: SystemLogPageIDEnum.listView,
      Operation: SystemLogOperationsEnum.accountsModule.merchantPortal.updateServiceProductInfo,
      action: auditLogActions.update,
      detailResponseData: {
        POS_ID: posData?.POS_ID || null,
        PGW_ID: pgwData?.PGW_ID || null,
      },
      beforeOperationData: {
        POS: posExistingRecord || null,
        PGW: existingElectronic || null,
      },
    };
    if (created) {
      req.moduleSpecificData.Operation = SystemLogOperationsEnum.accountsModule.merchantPortal.addServiceProductInfo;
      req.moduleSpecificData.action = auditLogActions.add;
    }
    
    // Send success response
    sendSuccess(res, "", null);
   
  } catch (error) {
   console.log(error);
   
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};
export const getServiceProductInfoMasterData = async (req, res) => {
  try {
    let productData = await product.getMenu(req, res);
    let cityData = "";

    // req.moduleSpecificData = {
    //   Module_Category: SystemLogCategoryEnum.kyc,
    //   Module_Name: SystemLogModuleNameEnum.account,
    //   Page_ID: SystemLogPageIDEnum.listView,
    //   Operation: SystemLogOperationsEnum.accountsModule.merchantPortal.viewServiceProductInfo,
    //   action: auditLogActions.detail,
    //   detailResponseData: {

    //   }
    // };
    sendSuccess(res, "", {
      masterData: { product_packages: productData, cities: cityData },
      userData: "",
    });
  } catch (error) {
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export const getByDefaultCityDistrictData = async (req, res) => {
  try {
    const cityData = await city.getDataMenuByDefault(req, res); // full list
    
    const cityList = await city.getCityInList(req, res); // based on req.query.cityId

    let masterData = [];

    const cityIds = req.query.cityId ? req.query.cityId.split(",").map((id) => parseInt(id)) : [];
    const regionData = await Model.MasterRegion.findOne({
      where:{
        Region_ID: cityData[0]?.regionId
      }
    })


    let districtData = [];
    let districtList = [];
    const districtIds = req.query.districtId ? req.query.districtId.split(",").map((id) => parseInt(id)) : [];

    if (req.query.cityId) {
      districtData = await district.getMenuDataByDefault(req, res); // full list
      districtList = await district.getDistrictInList(req, res); // filtered list
    }
    if (cityIds.length || districtIds.length) {
   
      for (let i = 0; i < cityIds.length; i++) {
        const seenCityIds = new Set();
        const seenDistrictIds = new Set();
 

        masterData.push({
          cityId: cityIds[i],
          districtId: districtIds[i],
          regionNameEn:regionData?.Name_EN || "",
          regionNameAr:regionData?.Name_AR || "",
          city: [...cityData, ...cityList].reduce((acc, c) => {
            if (!seenCityIds.has(c.cityId)) {
              seenCityIds.add(c.cityId);
              acc.push({
                key: c.cityId,
                nameEn: c.nameEn,
                nameAr: c.nameAr,
                cityId: c.cityId,
              });
            }
            return acc;
          }, []),
          district: [...districtData, ...districtList].reduce((acc, d) => {
            if (!seenDistrictIds.has(d.districtId)) {
              seenDistrictIds.add(d.districtId);
              acc.push({
                key: d.districtId,
                nameEn: d.nameEn,
                nameAr: d.nameAr,
                cityId: d.cityId,
              });
            }
            return acc;
          }, []),
        });
      }
    }

    // Push default city data (optional block)
    masterData.push({
      cityId: null,
      districtId: null,
       regionNameEn:regionData?.Name_EN || "",
       regionNameAr:regionData?.Name_AR || "",
      city: cityData.map((c) => ({
        key: c.cityId,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        cityId: c.cityId,
      })),
    });

    sendSuccess(res, "", { masterData });
  } catch (error) {
    console.log(error);
    // throw error;
    let lang = getLanguage(req);
    await unexpectedErrorHandler(error, req, res, accountProcessError[lang]);
  }
};

export default {
  serviceProductInfo,
  getByDefaultCityDistrictData,
};
