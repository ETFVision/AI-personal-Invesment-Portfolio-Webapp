import type {
  MarketVisionDashboard,
  MarketVisionReport,
  MarketVisionStatus,
  PortfolioImplications
} from "@/domain/marketVision/types";
import type { MarketVisionRepository, UpsertMarketVisionReportInput } from "@/application/ports/repositories/MarketVisionRepository";
import { MarketThemeService } from "./MarketThemeService";

export const emptyPortfolioImplications: PortfolioImplications = {
  equityAllocationImplication: "",
  bondAllocationImplication: "",
  goldImplication: "",
  cryptoImplication: "",
  cashImplication: "",
  riskImplication: "",
  watchlistImplication: ""
};

export type MarketVisionReportDraftInput = Omit<UpsertMarketVisionReportInput, "sourceType" | "status"> & {
  sourceType?: UpsertMarketVisionReportInput["sourceType"];
  status?: MarketVisionStatus;
};

export class MarketVisionService {
  constructor(
    private readonly repository: MarketVisionRepository,
    private readonly themeService = new MarketThemeService()
  ) {}

  async getDashboard(selectedReportId?: string | null): Promise<MarketVisionDashboard> {
    const [reports, latestPublishedReport, macroIndicators] = await Promise.all([
      this.repository.listReports(20),
      this.repository.getLatestPublishedReport(),
      this.repository.listMacroIndicators()
    ]);

    const selectedReport =
      selectedReportId
        ? await this.repository.getReportById(selectedReportId)
        : latestPublishedReport ?? reports[0] ?? null;
    const themeEvents = selectedReport ? await this.repository.listThemeEvents(selectedReport.id) : [];

    return {
      latestPublishedReport,
      selectedReport,
      reports,
      macroIndicators,
      themeEvents
    };
  }

  createDraft(input?: Partial<MarketVisionReportDraftInput>) {
    const today = new Date().toISOString().slice(0, 10);
    return this.repository.upsertReport({
      reportDate: input?.reportDate ?? today,
      reportPeriodStart: input?.reportPeriodStart ?? today,
      reportPeriodEnd: input?.reportPeriodEnd ?? today,
      title: input?.title ?? `Market Vision - ${today}`,
      executiveSummary: input?.executiveSummary ?? "",
      globalMarketSummary: input?.globalMarketSummary ?? "",
      equityView: input?.equityView ?? "",
      bondView: input?.bondView ?? "",
      goldView: input?.goldView ?? "",
      cryptoView: input?.cryptoView ?? "",
      ratesView: input?.ratesView ?? "",
      inflationView: input?.inflationView ?? "",
      currencyView: input?.currencyView ?? "",
      geopoliticalRiskView: input?.geopoliticalRiskView ?? "",
      opportunities: input?.opportunities ?? [],
      risks: input?.risks ?? [],
      portfolioImplications: input?.portfolioImplications ?? emptyPortfolioImplications,
      classificationSummary: input?.classificationSummary,
      sourceType: input?.sourceType ?? "manual",
      status: input?.status ?? "draft"
    });
  }

  saveDraft(input: MarketVisionReportDraftInput & { id: string }) {
    return this.repository.upsertReport({
      ...input,
      sourceType: input.sourceType ?? "manual",
      status: input.status ?? "draft"
    });
  }

  async publishReport(reportId: string) {
    await this.repository.updateReportStatus(reportId, "published");
  }

  async archiveReport(reportId: string) {
    await this.repository.updateReportStatus(reportId, "archived");
  }

  buildClassificationSummary(events: Awaited<ReturnType<MarketVisionRepository["listThemeEvents"]>>) {
    return this.themeService.summarize(events);
  }

  isEditable(report: MarketVisionReport | null) {
    return report?.status === "draft";
  }
}
