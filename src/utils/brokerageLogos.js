// Centralized mapping from bank/broker code to logo path in public/logos
export const bankLogoMap = {
  TD: "/logos/TD.png",
  td: "/logos/TD.png",
  RBC: "/logos/rbc.png",
  rbc: "/logos/rbc.png",
  Questrade: "/logos/questrade.png",
  questrade: "/logos/questrade.png",
  Wealthsimple: "/logos/wealthsimple.png",
  wealthsimple: "/logos/wealthsimple.png",
  "Wealthsimple Trade": "/logos/wealthsimple.png",
  "wealthsimple trade": "/logos/wealthsimple.png",
  CIBC: "/logos/CIBC.png",
  cibc: "/logos/CIBC.png",
  NBDB: "/logos/nbdb.png",
  nbdb: "/logos/nbdb.png",
  Scotia: "/logos/scotia.png",
  scotia: "/logos/scotia.png",
  BMO: "/logos/bmo.png",
  bmo: "/logos/bmo.png",
  charles: "/logos/charles.png",
  chase: "/logos/chase.png",
  etrade: "/logos/etrade.png",
  fidelity: "/logos/fidelity.png",
  ibkr: "/logos/ibkr.png",
  merrill: "/logos/merrill.png",
  robinhood: "/logos/robinhood.png",
  vanguard: "/logos/vanguard.png",
  fargo: "/logos/fargo.png",
};

export const logoFromBank = (bank) => {
  if (!bank) return "/logos/logo_image.png";
  return bankLogoMap[bank] || bankLogoMap[String(bank).toLowerCase()] || "/logos/logo_image.png";
};
