import { NewsClassificationService } from "@/application/services/news/NewsClassificationService";
import { NewsIngestionService } from "@/application/services/news/NewsIngestionService";

export class DailyNewsIngestionJob {
  constructor(
    private readonly ingestionService: NewsIngestionService,
    private readonly classificationService: NewsClassificationService
  ) {}

  async run() {
    const ingestion = await this.ingestionService.ingestDailyNews();
    const classification = await this.classificationService.classifyPending();
    return { ingestion, classification };
  }
}
