import { config } from "@shared/lib/config";
import { apiClient } from "@shared/services/api-client";
import type { KnowledgeDocument, RAGSource } from "@shared/types";

export const knowledgeService = {
  async listDocuments(): Promise<KnowledgeDocument[]> {
    if (config.useMocks) {
      return [{ id: "doc_1", title: "Engineering Handbook", scope: "company", chunkCount: 120, embeddingStatus: "indexed", updatedAt: new Date().toISOString() }];
    }
    return apiClient.get<KnowledgeDocument[]>("/knowledge/documents");
  },

  async listSources(): Promise<RAGSource[]> {
    if (config.useMocks) {
      return [{ id: "src_1", name: "Company Wiki", documentCount: 340, lastIndexedAt: new Date().toISOString() }];
    }
    return apiClient.get<RAGSource[]>("/knowledge/sources");
  },
};
