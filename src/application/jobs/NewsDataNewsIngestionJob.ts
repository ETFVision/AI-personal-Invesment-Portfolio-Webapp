import { NewsDataIngestionService } from "@/application/services/news/NewsDataIngestionService";

export class NewsDataNewsIngestionJob {
  constructor(private readonly ingestionService: NewsDataIngestionService) {}

  async run(input: { force?: boolean } = {}) {
    return this.ingestionService.ingestNewsData(input);
  }
}
