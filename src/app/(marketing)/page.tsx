import LandingPageBody from "@/modules/marketing/components/LandingPageBody";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Landing Page | SN-923 System",
  description: "次世代の製造プロセス管理システム。効率的かつ確実な運用を実現します。",
};

export default function MarketingPage() {
  return <LandingPageBody />;
}
