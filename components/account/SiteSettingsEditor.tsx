"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {defaultSiteSettings,settingLabels,fieldLimits,validateGroup,type SettingsGroup,type SiteSettings} from "@/lib/site-settings";
import {FooterContents} from "@/components/site/SiteFooter";
import {useSite} from "@/components/site/SiteProvider";
type Snapshot={version:number;settings:SiteSettings;actor:string|null;updated_at:string;previous:Partial<Record<SettingsGroup,{version:number;value:SiteSettings[SettingsGroup]}>>;history:{version:number;changed_group:SettingsGroup|null;actor:string|null;created_at:string;restored_from:number|null;settings:SiteSettings}[]};
const groups:Record<SettingsGroup,string>={brand:"站点与品牌",footer:"公司与备案"};
const imageFields=["logo","icon","shareImage"];
async function request(path:string,options?:RequestInit){const response=await fetch(path,{cache:"no-store",...options});const result=await response.json();if(!response.ok)throw Error(result.error||"操作失败，请重试");return result;}
export default function SiteSettingsEditor(){
  const {refresh}=useSite(),router=useRouter();
  const [record,setRecord]=useState<Snapshot|null>(null),[draft,setDraft]=useState<SiteSettings>(defaultSiteSettings),[group,setGroup]=useState<SettingsGroup>("brand"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[mobile,setMobile]=useState(false),[restore,setRestore]=useState(false);
  const dirty=!!record&&JSON.stringify(draft[group])!==JSON.stringify(record.settings[group]);
  const read=async()=>{const data:Snapshot=await request("/api/system/settings");setRecord(data);setDraft(data.settings);setRestore(false);return data;};
  useEffect(()=>{void read().catch(error=>setError(error.message));},[]);
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const navigate=(event:MouseEvent)=>{const anchor=(event.target as HTMLElement).closest("a[href]");if(anchor&&anchor.getAttribute("target")!=="_blank"&&!window.confirm("还有未保存的设置，确定离开吗？")){event.preventDefault();event.stopPropagation();}};
    window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);
    return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true);};
  },[dirty]);
  const field=(key:string,value:string)=>{setDraft(current=>({...current,[group]:{...current[group],[key]:value}}));setNotice("");setRestore(false);};
  const reload=async()=>{if(dirty&&!window.confirm("重新读取会替换未保存的输入，继续吗？"))return;setBusy(true);setError("");try{await read();}catch(error){setError((error as Error).message);}finally{setBusy(false);}};
  const upload=async(key:string,file:File|undefined)=>{
    if(!file)return;setBusy(true);setError("");setNotice("");
    try{if(file.size>2*1024*1024)throw Error("图片不能超过2MB");if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("请选择PNG、JPEG或WebP图片");const result=await request("/api/system/site-assets",{method:"POST",headers:{"Content-Type":file.type},body:file});field(key,result.path);setNotice("图片已上传，保存本组设置后才会在页面中使用。");}catch(error){setError((error as Error).message);}finally{setBusy(false);}
  };
  const save=async(revert=false)=>{
    if(!record)return;setBusy(true);setError("");setNotice("");
    try{
      if(!revert)validateGroup(group,draft[group]);
      const result=await request("/api/system/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:record.version,group,...(revert?{restore:true}:{value:draft[group]})})});
      // Mark the successful write before refetching, so an eventual read failure is not mistaken for a failed save.
      setRecord(current=>current?{...current,version:result.version,settings:{...current.settings,[group]:revert?current.previous[group]!.value:draft[group]}}:current);
      setRestore(false);setNotice(revert?"已恢复上一版，并生成新的配置版本。":"设置已保存并生效。其他页面刷新后显示最新配置。");
      try{await read();await refresh();router.refresh();}catch{setError("保存已成功，但重新读取失败，请稍后点击重新读取。");}
    }catch(error){setError((error as Error).message);}finally{setBusy(false);}
  };
  const preview=restore&&record?.previous[group]?{...draft,[group]:record.previous[group]!.value} as SiteSettings:draft;
  return <div className="site-editor">
    <div className="site-editor-tabs" role="group" aria-label="设置分类">{Object.entries(groups).map(([key,label])=><button key={key} aria-pressed={group===key} disabled={busy} onClick={()=>{if(dirty&&!window.confirm("切换分类会放弃本组未保存的修改，继续吗？"))return;setGroup(key as SettingsGroup);if(record)setDraft(record.settings);setRestore(false);setError("");setNotice("");}}>{label}</button>)}</div>
    {error&&<p className="account-error" role="alert">{error}</p>}{notice&&<p className="system-notice" role="status">{notice}</p>}
    {!record?<section className="account-panel"><p>正在读取站点设置…</p><button className="account-secondary" onClick={()=>void reload()} disabled={busy}>重新读取</button></section>:<>
    <section className="account-panel system-panel"><div className="management-card-heading"><div><h2>{groups[group]}</h2><p className="account-help">当前版本 {record.version} · {record.actor||"系统默认"} · {new Date(record.updated_at).toLocaleString("zh-CN")}</p></div><button className="account-secondary" disabled={busy} onClick={()=>void reload()}>重新读取</button></div>
      <p className="account-help">{group==="brand"?"仅修改网页品牌，不改变3D门头和建筑招牌。上传内容用于公开展示，请勿上传私密文件。":"备案号码与HTTPS查询链接需成对填写；留空不显示。公司信息会同步至首页、小镇和各中心页脚。"}</p>
      <form onSubmit={event=>{event.preventDefault();void save();}}><fieldset disabled={busy||restore} className="site-fields">{Object.keys(defaultSiteSettings[group]).map(key=>[key,(draft[group] as Record<string,string>)[key]]).map(([key,value])=><div className={`site-field ${imageFields.includes(key)?"site-image-field":""}`} key={key}><label htmlFor={`site-${key}`}>{settingLabels[key]}</label>{imageFields.includes(key)?<><div className="site-upload-preview">{value?<img src={value} alt={`${settingLabels[key]}预览`}/>:<span>{key==="logo"?"560 · 默认数字标识":"未设置"}</span>}</div><input id={`site-${key}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{void upload(key,event.target.files?.[0]);event.target.value="";}}/><small>PNG / JPEG / WebP · 最大2MB · 最长边4096像素</small>{value&&<button type="button" className="account-secondary" onClick={()=>field(key,"")}>移除{settingLabels[key]}</button>}</>:<><input id={`site-${key}`} value={value} maxLength={fieldLimits[key]} required={["text","title","description","company"].includes(key)} type={key.endsWith("Url")?"url":"text"} placeholder={key.endsWith("Url")?"https://…":undefined} onChange={event=>field(key,event.target.value)}/><small>{value.length} / {fieldLimits[key]}</small></>}</div>)}</fieldset>
        <div className="system-actions"><button className="account-primary" disabled={busy||!dirty||restore}>{busy?"正在处理…":"保存本组并生效"}</button><button type="button" className="account-secondary" disabled={busy||!record.previous[group]||dirty} onClick={()=>{setRestore(!restore);setNotice("");}}>{restore?"取消恢复":"预览上一版"}</button><span className="account-help">{dirty?"有未保存的修改":"当前没有未保存的修改"}</span></div>
      </form>
      {restore&&<div className="management-notice"><p>下方展示版本 {record.previous[group]?.version} 的“{groups[group]}”。恢复仅影响本组，其他设置保持不变。</p><button className="account-primary" disabled={busy} onClick={()=>void save(true)}>确认恢复本组上一版</button></div>}
    </section>
    <section className="account-panel system-panel"><div className="management-card-heading"><h2>{restore?"上一版预览":"未发布预览"}</h2><div className="site-editor-tabs"><button aria-pressed={!mobile} onClick={()=>setMobile(false)}>桌面</button><button aria-pressed={mobile} onClick={()=>setMobile(true)}>手机</button></div></div><p className="account-help">预览不改变正式页面。外部分享平台可能缓存封面及标题。</p>
      <div className={`site-preview${mobile?" is-mobile":""}`}><div className="site-preview-tab">{preview.brand.icon&&<img src={preview.brand.icon} alt="浏览器图标"/>}{preview.brand.title}</div><div className="site-preview-body"><div className="site-brand"> <span className="site-brand-mark">{preview.brand.logo?<img src={preview.brand.logo} alt="Logo预览"/>:"560"}</span><span className="site-brand-text">{preview.brand.text}</span></div><p className="site-preview-town">欢迎来到五六零人工智能社区AI小镇</p><p>{preview.brand.description}</p>{preview.brand.shareImage&&<img className="site-share-preview" src={preview.brand.shareImage} alt="分享封面预览"/>}<div className="site-footer"><FooterContents value={preview.footer}/></div></div></div>
    </section>
    <section className="account-panel system-panel"><h2>最近配置记录</h2><p className="account-help">保留最近20条展示；历史版本与图片仍保留用于恢复。完整操作记录可在全局日志查看。</p><div className="site-history">{record.history.map(item=><details key={item.version}><summary>版本 {item.version} · {item.changed_group?groups[item.changed_group]:"初始配置"} · {item.actor||"系统默认"} · {new Date(item.created_at).toLocaleString("zh-CN")}{item.restored_from!==null?` · 恢复自版本 ${item.restored_from}`:""}</summary><dl>{Object.entries(item.settings[item.changed_group||group]).map(([key,value])=><div key={key}><dt>{settingLabels[key]}</dt><dd>{value||"未设置"}</dd></div>)}</dl></details>)}</div></section>
    </>}
  </div>;
}
