import { useContext } from "react";
import UserContext from "./UserContext";

export default function useCurrency() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a UserContextProvider");
  }
  return ctx;
}
