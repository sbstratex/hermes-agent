const SEED_PROJECTS = [
  {
    id: "p-muc-maxvorstadt",
    name: "TAKE OVER Maxvorstadt",
    land: "Germany",
    city: "Munich",
    zip: "80539",
    street: "Türkenstraße 12",
    sqm: 2400,
    purchasePrice: 8600000,
    occupancy: 97,
    rentPerMonth: 595,
    yearlyRevenue: 205000,
    opex: 68000,
    managementFee: 12000,
    performanceFee: 9500,
    categories: { "WG room 12-14 m²": 10, "WG room 15-18 m²": 8, "Single apartment": 2 }
  },
  {
    id: "p-muc-schwabing",
    name: "TAKE OVER Schwabing",
    land: "Germany",
    city: "Munich",
    zip: "80801",
    street: "Hohenzollernplatz 5",
    sqm: 3100,
    purchasePrice: 11200000,
    occupancy: 94,
    rentPerMonth: 625,
    yearlyRevenue: 246000,
    opex: 91000,
    managementFee: 15000,
    performanceFee: 11800,
    categories: { "WG room 12-14 m²": 12, "WG room 15-18 m²": 9, "Double room": 3 }
  },
  {
    id: "p-ber-kreuzberg",
    name: "TAKE OVER Kreuzberg",
    land: "Germany",
    city: "Berlin",
    zip: "10999",
    street: "Oranienstraße 88",
    sqm: 2850,
    purchasePrice: 7400000,
    occupancy: 91,
    rentPerMonth: 545,
    yearlyRevenue: 178000,
    opex: 74000,
    managementFee: 10500,
    performanceFee: 6200,
    categories: { "WG room 12-14 m²": 11, "WG room 15-18 m²": 7, "Single apartment": 3, "Studio 20+ m²": 2 }
  },
  {
    id: "p-hh-altona",
    name: "TAKE OVER Altona",
    land: "Germany",
    city: "Hamburg",
    zip: "22767",
    street: "Stresemannstraße 40",
    sqm: 2200,
    purchasePrice: 6100000,
    occupancy: 88,
    rentPerMonth: 575,
    yearlyRevenue: 141000,
    opex: 62000,
    managementFee: 8800,
    performanceFee: 4100,
    categories: { "WG room 12-14 m²": 8, "WG room 15-18 m²": 6, "Double room": 2 }
  },
  {
    id: "p-koeln-suedstadt",
    name: "TAKE OVER Südstadt",
    land: "Germany",
    city: "Cologne",
    zip: "50968",
    street: "Severinswall 27",
    sqm: 1900,
    purchasePrice: 4300000,
    occupancy: 96,
    rentPerMonth: 495,
    yearlyRevenue: 118000,
    opex: 47000,
    managementFee: 7000,
    performanceFee: 5600,
    categories: { "WG room 12-14 m²": 9, "WG room 15-18 m²": 5, "Single apartment": 2 }
  },
  {
    id: "p-leipzig-plagwitz",
    name: "TAKE OVER Plagwitz",
    land: "Germany",
    city: "Leipzig",
    zip: "04229",
    street: "Zschochersche Straße 15",
    sqm: 1650,
    purchasePrice: 2500000,
    occupancy: 99,
    rentPerMonth: 445,
    yearlyRevenue: 96000,
    opex: 34000,
    managementFee: 5200,
    performanceFee: 7800,
    categories: { "WG room 12-14 m²": 10, "WG room 15-18 m²": 4 }
  }
];

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function sumUnits(categories) {
  return Object.values(categories || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

function computeProject(p) {
  const units = sumUnits(p.categories);
  const yearlyRevenue = Number(p.yearlyRevenue) || 0;
  const opex = Number(p.opex) || 0;
  const managementFee = Number(p.managementFee) || 0;
  const performanceFee = Number(p.performanceFee) || 0;
  const noi = yearlyRevenue - opex;
  const ebitda = noi - managementFee;
  const cashFlow = ebitda - performanceFee;
  const sqm = Number(p.sqm) || 0;
  const purchasePrice = Number(p.purchasePrice) || 0;
  const occupancy = clamp(Number(p.occupancy) || 0, 0, 100);
  return {
    units,
    monthlyRevenue: yearlyRevenue / 12,
    noi,
    ebitda,
    cashFlow,
    ebitdaMargin: yearlyRevenue > 0 ? ebitda / yearlyRevenue : 0,
    yieldOnCost: purchasePrice > 0 ? ebitda / purchasePrice : 0,
    rentPerSqmYear: sqm > 0 ? yearlyRevenue / sqm : 0,
    revenuePerUnitYear: units > 0 ? yearlyRevenue / units : 0,
    occupancy,
    vacancy: 100 - occupancy,
    rentPerMonth: Number(p.rentPerMonth) || 0
  };
}

function computePortfolio(projects) {
  const totals = projects.reduce((acc, p) => {
    const k = computeProject(p);
    acc.projects += 1;
    acc.units += k.units;
    acc.sqm += Number(p.sqm) || 0;
    acc.yearlyRevenue += k.monthlyRevenue * 12;
    acc.ebitda += k.ebitda;
    acc.cashFlow += k.cashFlow;
    acc.rentWeighted += k.rentPerMonth * k.units;
    acc.occupancyWeighted += k.occupancy * k.units;
    return acc;
  }, { projects: 0, units: 0, sqm: 0, yearlyRevenue: 0, ebitda: 0, cashFlow: 0, rentWeighted: 0, occupancyWeighted: 0 });
  return {
    projects: totals.projects,
    units: totals.units,
    sqm: totals.sqm,
    yearlyRevenue: totals.yearlyRevenue,
    ebitda: totals.ebitda,
    cashFlow: totals.cashFlow,
    avgRent: totals.units > 0 ? totals.rentWeighted / totals.units : 0,
    avgOccupancy: totals.units > 0 ? totals.occupancyWeighted / totals.units : 0
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SEED_PROJECTS, computeProject, computePortfolio, sumUnits };
}
