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

function validateDependentPaymentChannels(channels=[]) {
  const channelIds = channels
    .map(c => Number(typeof c === 'object' ? c?.id : c))
    .filter(Boolean);

    const has1000002 = channelIds.includes(1000002);
    const has1000003 = channelIds.includes(1000003);

    if (has1000002 !== has1000003) {
      return false
    }

    return true;
}
export { addAuditandTimeLine ,validateDependentPaymentChannels};
