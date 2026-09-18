// src/components/dashboard/overview/format.js

export const formatINR = (amount, { decimals = 0 } = {}) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const formatCompactINR = (amount) => {
  const value = Number(amount || 0);

  if (Math.abs(value) >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }

  if (Math.abs(value) >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }

  return formatINR(value);
};

export const formatPct = (value, { decimals = 1 } = {}) =>
  `${Number(value || 0).toFixed(decimals)}%`;
