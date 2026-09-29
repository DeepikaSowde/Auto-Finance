// src/services/referralStorage.js
//
// Referral commissions owed to agents / dealers — thin client over /api/referrals.

import { apiDelete, apiGet, apiPost, notifyDataUpdated } from "./api";

export const getReferrals = async () => {
  try {
    const referrals = await apiGet("/referrals");

    return Array.isArray(referrals) ? referrals : [];
  } catch (error) {
    console.error("Failed to load referral commissions:", error);

    return [];
  }
};

export const addReferral = async (referral) => {
  const saved = await apiPost("/referrals", referral);

  notifyDataUpdated();

  return saved;
};

export const markReferralPaid = async (referralId, payment) => {
  const saved = await apiPost(`/referrals/${referralId}/pay`, payment);

  notifyDataUpdated();

  return saved;
};

export const deleteReferral = async (referralId) => {
  await apiDelete(`/referrals/${referralId}`);

  notifyDataUpdated();
};
