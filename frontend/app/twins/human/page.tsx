import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Human Twin"
      description="Persona, preferences, skills, memory."
      bullets={[
        "Persona & communication preferences",
        "Skills & experience",
        "Twin completeness indicator",
      ]}
    />
  );
}
