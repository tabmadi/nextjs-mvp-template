import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // `next dev` writes its own block into AGENTS.md, and that block breaks the prose rules of ADR-0001.
  agentRules: false,
};

export default nextConfig;
