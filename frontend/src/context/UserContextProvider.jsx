import React, { useState, useEffect, useMemo } from "react";
import UserContext from "./UserContext";
import { CURRENCY_OPTIONS } from "./currencies";

const STORAGE_KEY = "app:selectedCurrency";

function findOptionBySymbolOrCode(idOrCode) {
  if (!idOrCode) return CURRENCY_OPTIONS[0];
  let opt = CURRENCY_OPTIONS.find(
    (c) => c.id === idOrCode || c.symbol === idOrCode
  );
  if (opt) return opt;
  opt = CURRENCY_OPTIONS.find((c) => c.code === idOrCode);
  return opt || CURRENCY_OPTIONS[0];
}

function UserContextProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return CURRENCY_OPTIONS[0].id;

      const parsed = JSON.parse(raw);
      const opt = findOptionBySymbolOrCode(parsed);
      return opt.id;
    } catch (e) {
      return CURRENCY_OPTIONS[0].id;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currency));
    } catch (e) {}
  }, [currency]);

  const setCurrency = (newCurrency) => {
    if (!newCurrency) return;
    if (typeof newCurrency === "object" && newCurrency.id) {
      setCurrencyState(newCurrency.id);
      return;
    }
    const opt = findOptionBySymbolOrCode(newCurrency);
    setCurrencyState(opt.id);
  };

  const contextValue = useMemo(
    () => ({
      currency,
      setCurrency,
      options: CURRENCY_OPTIONS,
      currentOption:
        CURRENCY_OPTIONS.find((o) => o.id === currency) || CURRENCY_OPTIONS[0],
    }),
    [currency]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export default UserContextProvider;
