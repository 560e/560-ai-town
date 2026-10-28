"use client";
import {useSite} from "./SiteProvider";
export default function SiteBrand(){const {settings}=useSite();return <span className="site-brand"><span className="site-brand-mark">{settings.brand.logo?<img src={settings.brand.logo} alt="公司Logo"/>:"560"}</span><span className="site-brand-text">{settings.brand.text}</span></span>;}
