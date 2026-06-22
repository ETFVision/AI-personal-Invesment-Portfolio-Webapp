import type { EtfCategory } from "@/domain/universe/alphaUniverse";

export const nonDefensiveSectorEtfs = new Set(["XBI", "IBB", "ARKG"]);
export const broadDefensiveSectorEtfs = new Set(["XLV", "VHT", "XLU", "VPU", "XLP", "VDC"]);
export const broadInternationalEtfCategories = new Set<EtfCategory>(["GLOBAL_EQUITY", "DEVELOPED_MARKETS", "EMERGING_MARKETS"]);
export const coreInternationalEtfs = new Set(["VXUS", "IXUS", "SPDW", "VEA", "IEFA", "EFA", "SCHF", "VWO", "IEMG", "EEM", "SPEM", "SCHE"]);
export const globalIncludingUsEtfs = new Set(["VT", "ACWI", "IOO"]);
export const broadReitEtfs = new Set(["VNQ", "SCHH", "IYR", "USRT", "FREL", "XLRE", "RWR"]);
