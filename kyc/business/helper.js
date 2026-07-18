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
export { addAuditandTimeLine };
