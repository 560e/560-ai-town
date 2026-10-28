"use client";
import {useSite} from "./SiteProvider";
import {safeFilingLink,type SiteSettings} from "@/lib/site-settings";
export function FooterContents({value}:{value:SiteSettings["footer"]}){return <><span className="site-company">{value.company}</span>{value.copyright&&<span>{value.copyright}</span>}{(value.icp||value.police)&&<span className="site-records">{(["icp","police"] as const).map(key=>value[key]&&(safeFilingLink(value[`${key}Url`])?<a key={key} href={value[`${key}Url`]} target="_blank" rel="noopener noreferrer">{value[key]}</a>:<span key={key}>{value[key]}</span>))}</span>}</>;}
export default function SiteFooter({className="",children}:{className?:string;children?:React.ReactNode}){const {settings}=useSite();return <footer className={`site-footer ${className}`}><FooterContents value={settings.footer}/>{children}</footer>;}
