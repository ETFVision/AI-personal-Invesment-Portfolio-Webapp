export type DateValuePoint = {
  date: string;
  value: number;
};

export type ReturnPoint = {
  date: string;
  value: number;
};

export type DrawdownPoint = {
  date: string;
  value: number;
  drawdown: number;
};

export type DrawdownAnalysis = {
  currentDrawdown: number | null;
  maxDrawdown: number | null;
  drawdownDurationDays: number | null;
  points: DrawdownPoint[];
};

export function calculateReturns(points: DateValuePoint[]): ReturnPoint[] {
  const sorted = points
    .filter((point) => Number.isFinite(point.value) && point.value > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const returns: ReturnPoint[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (!previous || !current || previous.value === 0) continue;
    returns.push({
      date: current.date,
      value: current.value / previous.value - 1
    });
  }
  return returns;
}

export function annualizedVolatility(returns: ReturnPoint[], windowDays: number, periodsPerYear = 252) {
  const windowReturns = returns.slice(Math.max(0, returns.length - windowDays)).map((point) => point.value);
  if (windowReturns.length < 2) return null;
  const mean = windowReturns.reduce((sum, value) => sum + value, 0) / windowReturns.length;
  const variance = windowReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (windowReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}

export function calculateDrawdown(points: DateValuePoint[]): DrawdownAnalysis {
  const sorted = points
    .filter((point) => Number.isFinite(point.value) && point.value > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  let peak = 0;
  let maxDrawdown: number | null = null;
  let currentDrawdownStart: string | null = null;
  const drawdownPoints: DrawdownPoint[] = [];

  for (const point of sorted) {
    if (point.value >= peak) {
      peak = point.value;
      currentDrawdownStart = null;
    }
    const drawdown = peak === 0 ? 0 : point.value / peak - 1;
    if (drawdown < 0 && !currentDrawdownStart) currentDrawdownStart = point.date;
    if (maxDrawdown == null || drawdown < maxDrawdown) maxDrawdown = drawdown;
    drawdownPoints.push({ ...point, drawdown });
  }

  const current = drawdownPoints.at(-1)?.drawdown ?? null;
  const lastDate = drawdownPoints.at(-1)?.date ?? null;
  const drawdownDurationDays =
    current != null && current < 0 && currentDrawdownStart && lastDate
      ? Math.max(0, Math.round((new Date(`${lastDate}T00:00:00Z`).getTime() - new Date(`${currentDrawdownStart}T00:00:00Z`).getTime()) / 86_400_000))
      : 0;

  return {
    currentDrawdown: current,
    maxDrawdown,
    drawdownDurationDays,
    points: drawdownPoints
  };
}

export function concentrationRatio(values: number[], count: number) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total === 0) return 0;
  return values
    .slice()
    .sort((a, b) => b - a)
    .slice(0, count)
    .reduce((sum, value) => sum + Math.max(0, value), 0) / total;
}

export function correlation(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (length < 3) return null;
  const left = a.slice(a.length - length);
  const right = b.slice(b.length - length);
  const meanA = left.reduce((sum, value) => sum + value, 0) / length;
  const meanB = right.reduce((sum, value) => sum + value, 0) / length;
  let numerator = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < length; index += 1) {
    const da = left[index] - meanA;
    const db = right[index] - meanB;
    numerator += da * db;
    varianceA += da ** 2;
    varianceB += db ** 2;
  }
  if (varianceA === 0 || varianceB === 0) return null;
  return numerator / Math.sqrt(varianceA * varianceB);
}

export function sampleCovariance(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (length < 2) return null;
  const left = a.slice(a.length - length);
  const right = b.slice(b.length - length);
  const meanA = left.reduce((sum, value) => sum + value, 0) / length;
  const meanB = right.reduce((sum, value) => sum + value, 0) / length;
  const covariance = left.reduce((sum, value, index) => sum + (value - meanA) * (right[index] - meanB), 0) / (length - 1);
  return covariance;
}

export type CovarianceRiskInput = {
  id: string;
  label: string;
  assetClass: string;
  weight: number;
  returnsByDate: Map<string, number>;
};

export type CovarianceRiskContribution = {
  id: string;
  label: string;
  assetClass: string;
  allocation: number;
  marginalContribution: number;
  absoluteContribution: number;
  riskContribution: number;
  annualizedVolatility: number;
};

export function covarianceRiskContributions(input: {
  assets: CovarianceRiskInput[];
  minimumObservations?: number;
  periodsPerYear?: number;
}) {
  const minimumObservations = input.minimumObservations ?? 30;
  const periodsPerYear = input.periodsPerYear ?? 252;
  const assets = input.assets.filter((asset) => asset.weight > 0 && asset.returnsByDate.size >= minimumObservations);
  if (assets.length < 2) return null;

  const commonDates = assets
    .map((asset) => Array.from(asset.returnsByDate.keys()))
    .reduce<string[]>((intersection, dates) => intersection.filter((date) => dates.includes(date)), Array.from(assets[0].returnsByDate.keys()))
    .sort();
  if (commonDates.length < minimumObservations) return null;

  const weightsTotal = assets.reduce((sum, asset) => sum + asset.weight, 0);
  if (weightsTotal <= 0) return null;

  const normalizedWeights = assets.map((asset) => asset.weight / weightsTotal);
  const returnVectors = assets.map((asset) => commonDates.map((date) => asset.returnsByDate.get(date) ?? 0));
  const covarianceMatrix = returnVectors.map((left) =>
    returnVectors.map((right) => (sampleCovariance(left, right) ?? 0) * periodsPerYear)
  );
  const covarianceTimesWeights = covarianceMatrix.map((row) =>
    row.reduce((sum, value, index) => sum + value * normalizedWeights[index], 0)
  );
  const variance = normalizedWeights.reduce((sum, weight, index) => sum + weight * covarianceTimesWeights[index], 0);
  if (!Number.isFinite(variance) || variance <= 0) return null;

  const portfolioVolatility = Math.sqrt(variance);
  const contributions: CovarianceRiskContribution[] = assets.map((asset, index) => {
    const marginalContribution = covarianceTimesWeights[index] / portfolioVolatility;
    const absoluteContribution = normalizedWeights[index] * marginalContribution;
    return {
      id: asset.id,
      label: asset.label,
      assetClass: asset.assetClass,
      allocation: asset.weight,
      marginalContribution,
      absoluteContribution,
      riskContribution: portfolioVolatility === 0 ? 0 : absoluteContribution / portfolioVolatility,
      annualizedVolatility: Math.sqrt(Math.max(0, covarianceMatrix[index][index]))
    };
  });

  return {
    method: "covariance" as const,
    observationCount: commonDates.length,
    startDate: commonDates[0],
    endDate: commonDates.at(-1) ?? commonDates[0],
    portfolioVolatility,
    coverage: weightsTotal,
    contributions
  };
}

export function diversificationScore(input: {
  meaningfulHoldings: number;
  assetClassCount: number;
  sectorCount: number;
  currencyCount: number;
  averageCorrelation: number | null;
  topHoldingConcentration: number;
  topFiveConcentration: number;
}) {
  const holdingScore = Math.min(input.meaningfulHoldings / 12, 1) * 20;
  const assetClassScore = Math.min(input.assetClassCount / 5, 1) * 20;
  const sectorScore = Math.min(input.sectorCount / 8, 1) * 20;
  const currencyScore = Math.min(input.currencyCount / 3, 1) * 10;
  const correlationPenalty = input.averageCorrelation == null ? 5 : Math.max(0, input.averageCorrelation) * 15;
  const concentrationPenalty = input.topHoldingConcentration * 20 + Math.max(0, input.topFiveConcentration - 0.5) * 30;
  return Math.round(Math.max(0, Math.min(100, holdingScore + assetClassScore + sectorScore + currencyScore + 30 - correlationPenalty - concentrationPenalty)));
}
