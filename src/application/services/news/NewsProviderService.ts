import type { NewsProvider, NewsProviderRequest } from "@/application/ports/providers/NewsProvider";

export class NewsProviderService {
  constructor(private readonly provider: NewsProvider) {}

  fetchNews(input: NewsProviderRequest) {
    return this.provider.fetchNews(input);
  }
}
