import { PageStub } from "@shared/components/layout/page-stub";

export default function SettingsPage() {
  return (
    <PageStub
      title="Company Settings"
      description="Organization configuration, security policies, and API keys."
      bullets={[
        "Organization metadata (Company Name, Domain, Industry, Country)",
        "FastAPI Backend & PostgreSQL connection settings",
        "SSO / Keycloak / OIDC identity provider integration",
        "LLM & SLM provider keys (OpenAI, Local Models, Anthropic)",
        "Audit log retention and compliance policies",
      ]}
    />
  );
}
