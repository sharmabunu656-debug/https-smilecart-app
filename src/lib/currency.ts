const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatINR = (value: number) => inrFormatter.format(value || 0);

export const formatINRCompact = (value: number) =>
  inrCompactFormatter.format(value || 0);

export const formatNumberIN = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value || 0);
