import { Metadata } from "next";
import { EstimateClient } from "./EstimateClient";

export const metadata: Metadata = {
  title: "View Estimate | MyMetalRoofer",
  description: "View and approve your roofing estimate",
};

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Public Estimate Page
 *
 * This page is accessible without authentication.
 * Clients can view, approve, or request changes to estimates.
 */
export default async function EstimatePage({ params }: PageProps) {
  const { token } = await params;

  return <EstimateClient token={token} />;
}
