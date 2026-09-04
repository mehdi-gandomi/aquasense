/**
 * Algal bloom risk model for the receiving reservoir. Rule-based rather than
 * learned: nutrient load exported by the upstream plant, water temperature and
 * clarity drive a hazard score, which then bands into a HAB level.
 */

export interface BloomInputs {
  chlorophyll: number;
  phycocyanin: number;
  temperature: number;
  totalNitrogen: number;
  totalPhosphorus: number;
  secchi: number;
  dissolvedOxygen: number;
  /** kg/d of nitrogen arriving from the upstream works. */
  upstreamNitrogenLoad: number;
}

export type HabLevel = 1 | 2 | 3 | 4;

export interface BloomAssessment {
  hazardScore: number;
  toxinRiskIndex: number;
  dbpRisk: number;
  cellIntegrity: number;
  biomass: number;
  habLevel: HabLevel;
  forecast: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  drivers: Array<{ label: string; contribution: number }>;
}

const norm = (v: number, lo: number, hi: number) =>
  Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

export function assessBloom(input: BloomInputs): BloomAssessment {
  const drivers = [
    { label: 'Chlorophyll-a', contribution: norm(input.chlorophyll, 5, 120) * 0.28 },
    { label: 'Phycocyanin', contribution: norm(input.phycocyanin, 2, 90) * 0.24 },
    { label: 'Water temperature', contribution: norm(input.temperature, 14, 30) * 0.18 },
    { label: 'Phosphorus load', contribution: norm(input.totalPhosphorus, 0.01, 0.3) * 0.16 },
    { label: 'Upstream N export', contribution: norm(input.upstreamNitrogenLoad, 20, 400) * 0.08 },
    { label: 'Clarity loss', contribution: (1 - norm(input.secchi, 0.4, 4)) * 0.06 },
  ];

  const hazardScore = Math.round(
    drivers.reduce((acc, d) => acc + d.contribution, 0) * 100,
  );

  const cellIntegrity = Math.round(
    (0.1 + norm(input.temperature, 16, 30) * 0.35 + norm(input.phycocyanin, 2, 90) * 0.3) * 100,
  ) / 100;

  const toxinRiskIndex = Math.round(
    norm(input.phycocyanin, 2, 90) * 62 + cellIntegrity * 38,
  );

  const dbpRisk = Math.round(
    norm(input.chlorophyll, 5, 120) * 58 + (1 - norm(input.secchi, 0.4, 4)) * 42,
  );

  const biomass = Math.round(input.chlorophyll * 1020 + input.phycocyanin * 340);

  const habLevel: HabLevel =
    hazardScore >= 80 ? 4 : hazardScore >= 60 ? 3 : hazardScore >= 35 ? 2 : 1;

  const forecast =
    hazardScore >= 80
      ? 'SEVERE'
      : hazardScore >= 60
        ? 'HIGH'
        : hazardScore >= 35
          ? 'MODERATE'
          : 'LOW';

  return {
    hazardScore,
    toxinRiskIndex,
    dbpRisk,
    cellIntegrity,
    biomass,
    habLevel,
    forecast,
    drivers: drivers
      .map((d) => ({ label: d.label, contribution: Math.round(d.contribution * 100) }))
      .sort((a, b) => b.contribution - a.contribution),
  };
}

export const HAB_LEVEL_LABEL: Record<HabLevel, string> = {
  1: 'Surveillance',
  2: 'Alert',
  3: 'Restriction',
  4: 'Closure',
};
