import { GlobalNewsIngestionService } from "@/application/services/news/GlobalNewsIngestionService";

export class GdeltNewsIngestionJob {
  constructor(private readonly ingestionService: GlobalNewsIngestionService) {}

  async run(input: { force?: boolean } = {}) {
    return this.ingestionService.ingestGlobalNews(input);
  }
}
