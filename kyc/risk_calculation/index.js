import { businessSectors, optionKeys } from "../../../../enums/index.js";
import { getLanguage } from "../../../../common_functions/index.js";
import { sequelize } from "../../../../global_imports/index.js";
import riskCalculation from "../../../../config/risk_calculation.json" with { type: "json" } ;

export const calculateRisk = async (req) => {
  let currentAccount = await getAccountData(req);
  let result = {};

  // Map keys for easy lookup
  const findOpt = (key) =>
    currentAccount.find((item) => item.Opt_Key === key)?.Opt_Value;

  const disclosureRaw = findOpt(optionKeys.disclosureInfo);
  const isMultiOwner = findOpt(optionKeys.isMultiOnwer) ?? 0;

  let disclosure;
  try {
    disclosure = JSON.parse(disclosureRaw || "{}");
  } catch (e) {
    disclosure = {};
  }

  const yearly_sales = disclosure?.yearly_sales ?? 0;
  const daily_volume = disclosure?.monthly_transaction_volume ?? 0;
  const daily_transaction_count = disclosure?.monthly_transaction_count ?? 0;

  const resultObj = {
    sector_risk: currentAccount[0]?.Risk_Weight,
    entity_risk:
      currentAccount[0].Unique_Key == businessSectors.freelenacer
        ? currentAccount[0]?.Risk_Weight
        : isMultiOwner
        ? 10
        : 5,
    activities_risk: currentAccount[0]?.Cat_Risk_Weight,
    region_risk: currentAccount[0]?.Region_Risk_Weight,
    politician_risk:
      disclosure.is_politician == 1
        ? riskCalculation.politician_risk.max.risk_weight
        : riskCalculation.politician_risk.min.risk_weight,
    yearly_sales_risk:
      yearly_sales > riskCalculation.yearly_sales.max.threshold
        ? riskCalculation.yearly_sales.max.risk_weight
        : yearly_sales > riskCalculation.yearly_sales.min.threshold &&
          yearly_sales <= riskCalculation.yearly_sales.max.threshold
        ? riskCalculation.yearly_sales.between.risk_weight
        : riskCalculation.yearly_sales.min.risk_weight,

    daily_transaction_count_risk:
      daily_transaction_count >
      riskCalculation.daily_transaction_count.max.threshold
        ? riskCalculation.daily_transaction_count.max.risk_weight
        : daily_transaction_count >
            riskCalculation.daily_transaction_count.min.threshold &&
          daily_transaction_count <=
            riskCalculation.daily_transaction_count.max.threshold
        ? riskCalculation.daily_transaction_count.between.risk_weight
        : riskCalculation.daily_transaction_count.min.risk_weight,

    daily_transaction_volume_risk:
      daily_volume > riskCalculation.daily_transaction_volume.max.threshold
        ? riskCalculation.daily_transaction_volume.max.risk_weight
        : daily_volume >
            riskCalculation.daily_transaction_volume.min.threshold &&
          daily_volume <= riskCalculation.daily_transaction_volume.max.threshold
        ? riskCalculation.daily_transaction_volume.between.risk_weight
        : riskCalculation.daily_transaction_volume.min.risk_weight,
  };

  result.resultObj = resultObj;
  result.total = Object.values(resultObj).reduce(
    (sum, val) => sum + parseInt(val ?? 0),
    0
  );

  result.score =
    result.total > riskCalculation.score.high
      ? "High"
      : result.total < riskCalculation.score.low
      ? "Low"
      : "Medium";

  return result;
};
async function getAccountData(req) {
  let businessAccountId;
  if(req.query?.businessAccountId)
  {
    businessAccountId=req.query.businessAccountId
  }
  else 
  {
    businessAccountId=req.body.businessAccountId
  }
  let whereClause = `acc.Merchant_Business_Account_ID =${businessAccountId} `;

  let lang = getLanguage(req);
  const merchantAccount = await sequelize.query(
    `CALL MerchantProc('GET_MERCHANT_ACCOUNT_FOR_RISK_CALCULATION', :whereClause, :lang);`,
    { replacements: { whereClause, lang } }
  );
  return merchantAccount;
}
export default { calculateRisk };
