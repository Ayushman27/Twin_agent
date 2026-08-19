import { PageStub } from "@shared/components/layout/page-stub";

export default function KnowledgePage() {
  return (
    <PageStub
      title="Knowledge &amp; Memory Base"
      description="Vector index, documents, and RAG contextual retrieval sources."
      bullets={[
        "Document ingestion status and chunk vectorization preview",
        "RAG pipeline visualizer (Embedding, Vector Store, Retrieval, Reranking)",
        "Semantic query test console",
        "Connected data source status (Notion, Google Docs, Local files)",
      ]}
    />
  );
}
