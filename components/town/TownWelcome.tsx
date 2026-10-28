"use client";

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import SignIn from "@/components/account/SignIn";
import {useAccount} from "@/components/account/AccountProvider";
import SiteBrand from "@/components/site/SiteBrand";
import SiteFooter from "@/components/site/SiteFooter";

const districts = ["AI学院", "AI创业园", "AI商业街", "AI社区", "AI广场", "任务广场", "AI服务中心"];

export default function TownWelcome({ready, onEnter, onAccount}: {
  ready: boolean; onEnter: () => void; onAccount: () => void;
}) {
  const account=useAccount();
  const [page, setPage] = useState<"welcome" | "account">("welcome");
  const [leaving, setLeaving] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {heading.current?.focus();}, [page]);
  useEffect(() => () => {if (leaveTimer.current) clearTimeout(leaveTimer.current);}, []);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    leaveTimer.current = setTimeout(onEnter, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280);
  };

  return <section className={`welcome-layer${leaving ? " is-leaving" : ""}`} aria-label="小镇欢迎入口">
    <div className="welcome-topline"><span className="welcome-wordmark"><SiteBrand/></span><span>在北海，与 AI 的未来相遇</span></div>
    <div ref={panel} className="welcome-card" role="dialog" aria-labelledby="welcome-title" aria-describedby="welcome-description"
      onKeyDown={event => {
        // Keep keyboard navigation inside the welcome layer; never drive the town behind it.
        event.stopPropagation();
        if (event.key === "Escape") {event.preventDefault(); if (page === "account") setPage("welcome"); }
        if (event.key !== "Tab") return;
        const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {event.preventDefault(); last.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
      }}>
      <div className="welcome-card-top"><span className="welcome-tag"><span/> 一座关于 AI 的小镇</span><span className="welcome-coast">北海 · BEIHAI</span></div>
      {page === "welcome" ? <>
        <p className="welcome-kicker">欢迎来到</p>
        <h1 id="welcome-title" ref={heading} tabIndex={-1} className="welcome-title"><span>五六零人工智能社区</span><strong>AI小镇<span className="welcome-title-dot">.</span></strong></h1>
        <p className="welcome-subtitle">学习 · 创业 · 生活，在这里相遇</p>
        <p id="welcome-description" className="welcome-description">面向每一位愿意学习和探索 AI 的人。<br/>在这里，发现学习的方向，遇见志同道合的伙伴，<br className="welcome-wide-break"/>一起探索 AI 与生活的更多可能。</p>
        <div className="welcome-districts"><span className="welcome-section-label">七个街区，一起探索</span><div>{districts.map(name => <span key={name}>{name}</span>)}</div></div>
        <div className="welcome-actions"><button className="welcome-primary" onClick={enter} disabled={leaving}>游览小镇<span aria-hidden="true">↗</span></button><button className="welcome-secondary" onClick={() => setPage("account")} disabled={leaving}>登录／注册</button></div>
        <p className="welcome-footnote">无需注册，也可以先逛逛小镇的公共空间。</p>
      </> : <>
        <button className="welcome-back" onClick={() => setPage("welcome")}>← 返回小镇介绍</button>
        <h1 id="welcome-title" ref={heading} tabIndex={-1} className="welcome-account-title">成为小镇居民</h1>
        <p id="welcome-description" className="welcome-description">用一个账户，连接你在小镇的学习与共创。</p>
        {account.user?<div className="welcome-signed-in"><p>欢迎，{account.user.name}。你的“小镇居民”身份已生效。</p><Link href="/account" onClick={onAccount}>查看个人中心 ↗</Link></div>:<SignIn onSuccess={enter}/>}
        <button className="welcome-primary welcome-account-guest" onClick={enter} disabled={leaving}>游览小镇<span aria-hidden="true">↗</span></button>
      </>}
    </div>
    <div className="welcome-scene-note" aria-hidden="true"><span className="welcome-scene-line"/><span>一座小镇，无限可能<small>拖动旋转 · 游览小镇体验完整功能</small></span></div>
    <SiteFooter className="welcome-footer"><span className="welcome-scene-status" role="status"><i/>{ready ? "小镇已就绪，欢迎探索" : "正在展开 3D 小镇…"}</span></SiteFooter>
  </section>;
}

