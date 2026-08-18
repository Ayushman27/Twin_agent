const STAGES = ["Document", "Chunking", "Embedding", "Vector Store", "Retrieval", "Reranking", "Context Fusion"];

export function RagPipeline({ activeStage = 0 }: { activeStage?: number }) {
  return (
    <div className="flex items-center overflow-x-auto gap-2 py-2">
      {STAGES.map((stage, i) => (
        <div key={stage} className="flex items-center gap-2 shrink-0">
          <div className={`px-3 py-1.5 rounded-md text-xs border
            ${i <= activeStage ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
            {stage}
          </div>
          {i < STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  );
}
