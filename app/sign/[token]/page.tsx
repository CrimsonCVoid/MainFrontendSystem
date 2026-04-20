import SignerClient from "./signer-client";

interface Params {
  params: { token: string } | Promise<{ token: string }>;
}

export default async function SignPage({ params }: Params) {
  const { token } = await params;
  return <SignerClient token={token} />;
}

export const dynamic = "force-dynamic";
