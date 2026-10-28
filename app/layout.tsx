import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./account.css";
import "./management.css";
import "./system.css";
import "./site.css";
import "./service.css";
import "./service-hall.css";
import "./scene-ui.css";
import {TownPresenceProvider} from "@/components/town/TownPresenceProvider";
import {AccountProvider} from "@/components/account/AccountProvider";
import {SiteProvider} from "@/components/site/SiteProvider";
import {DisableContextMenu} from "@/components/site/DisableContextMenu";
import {publicSiteSettings} from "@/lib/server/site-settings";
import "./identity-display.css";
import "./district-access.css";

export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{
  const {brand}=await publicSiteSettings();
  return {metadataBase:new URL(process.env.BETTER_AUTH_URL||"http://localhost:3000"),title:brand.title,description:brand.description,
    ...(brand.icon?{icons:{icon:brand.icon}}:{}),
    openGraph:{title:brand.title,description:brand.description,locale:"zh_CN",type:"website",...(brand.shareImage?{images:[brand.shareImage]}:{})},
    twitter:{card:brand.shareImage?"summary_large_image":"summary",title:brand.title,description:brand.description,...(brand.shareImage?{images:[brand.shareImage]}:{})}};
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#c6e4f7" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><DisableContextMenu /><SiteProvider initial={await publicSiteSettings()}><AccountProvider><TownPresenceProvider>{children}</TownPresenceProvider></AccountProvider></SiteProvider></body></html>;
}
