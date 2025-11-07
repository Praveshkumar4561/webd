// src/utils/formatCurrency.js
import { CURRENCY_OPTIONS } from "../context/currencies";

export function formatCurrency(
  amount = 0,
  currencyIdentifier = "USD",
  opts = {}
) {
  const {
    useCustomSymbol = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = opts;

  const option =
    CURRENCY_OPTIONS.find(
      (c) => c.id === currencyIdentifier || c.symbol === currencyIdentifier
    ) ||
    CURRENCY_OPTIONS.find((c) => c.code === currencyIdentifier) ||
    CURRENCY_OPTIONS[0];

  if (useCustomSymbol) {
    const numberPart = new Intl.NumberFormat(option.locale || undefined, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Number(amount) || 0);
    return `${option.symbol}${numberPart}`;
  }

  try {
    return new Intl.NumberFormat(option.locale || undefined, {
      style: "currency",
      currency: option.code,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Number(amount) || 0);
  } catch (e) {
    const numberPart = new Intl.NumberFormat(option.locale || undefined, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Number(amount) || 0);
    return `${option.symbol}${numberPart}`;
  }
}
