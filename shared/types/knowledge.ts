export interface KnowledgeDocument {
  id: string;
  title: string;
  scope: "company" | "role" | "project" | "task" | "person";
  chunkCount: number;
  embeddingStatus: "pending" | "embedding" | "indexed" | "failed";
  updatedAt: string;
}

export interface RAGSource {
  id: string;
  name: string;
  documentCount: number;
  lastIndexedAt: string;
}
