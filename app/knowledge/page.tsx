import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Knowledge"
      description="RAG pipeline & knowledge sources."
      bullets={[
        "Document -> Chunking -> Embedding -> Vector Store -> Retrieval -> Reranking -> Context Fusion",
        "Indexing status monitoring",
      ]}
    />
  );
}
