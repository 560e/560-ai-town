"use client";
import {useCallback,useEffect,useState} from 'react';
import {accountRequest} from './AccountProvider';
type Item={id:string;hint:string;createdAt:string;usedAt:string|null;revokedAt:string|null;usedBy:string|null};
type List={items:Item[];total:number;available:number;used:number};
export default function InvitationManager(){
  const [data,setData]=useState<List|null>(null),[page,setPage]=useState(1),[count,setCount]=useState(10),[codes,setCodes]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const read=useCallback(async()=>{const r=await fetch(`/api/system/invitations?page=${page}`,{cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'无法读取邀请码');setData(v);},[page]);
  useEffect(()=>{void read().catch(e=>setError(e.message));},[read]);
  async function generate(){
    if(codes.length&&!window.confirm('请确认已保存上一批完整邀请码。继续会替换当前显示的代码。'))return;
    setBusy(true);setError('');setNotice('');
    try{const r=await accountRequest('/api/system/invitations',{count});setCodes(r.codes);setNotice('生成成功，请立即复制或下载保存，完整邀请码只显示这一次。');await read();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function revoke(id:string){
    if(!window.confirm('停用后此邀请码不能再注册，确定吗？'))return;
    setBusy(true);setError('');try{await accountRequest('/api/system/invitations',{id},'DELETE');await read();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function download(){const url=URL.createObjectURL(new Blob([codes.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='小镇邀请码.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section className="account-panel" aria-label="邀请码管理"><h3>邀请码管理</h3><p className="account-help">每个邀请码仅供一位新居民成功注册。生成邀请码不会自动开启注册限制；请在上方保存开关。完整邀请码只在生成时显示，记录中仅保留摘要。</p>
    <div className="system-actions"><label>生成数量 <input aria-label="邀请码生成数量" type="number" style={{width:90}} min={1} max={100} value={count} disabled={busy} onChange={e=>setCount(Number(e.target.value))}/></label><button className="account-primary" disabled={busy||!Number.isInteger(count)||count<1||count>100} onClick={()=>void generate()}>生成邀请码</button><button className="account-secondary" disabled={busy} onClick={()=>void read().catch(e=>setError(e.message))}>刷新记录</button></div>
    {notice&&<p role="status">{notice}</p>}{error&&<p className="account-error" role="alert">{error}</p>}
    {!!codes.length&&<div><label htmlFor="generated-invites">本次生成的邀请码（请保存）</label><textarea id="generated-invites" readOnly rows={6} style={{width:'100%',resize:'vertical'}} value={codes.join('\n')}/><div className="system-actions"><button className="account-secondary" onClick={()=>void navigator.clipboard.writeText(codes.join('\n')).then(()=>setNotice('已复制邀请码')).catch(()=>setError('复制失败，请选择文本复制或下载。'))}>复制全部</button><button className="account-secondary" onClick={download}>下载文本</button></div></div>}
    {data&&<><p className="account-help">共 {data.total} 个 · 未使用 {data.available} 个 · 已使用 {data.used} 个</p><div style={{overflowX:'auto'}}><table className="admin-table" style={{width:'100%',textAlign:'left'}}><thead><tr><th>邀请码摘要</th><th>状态</th><th>使用者</th><th>生成时间</th><th>操作</th></tr></thead><tbody>{data.items.map(i=><tr key={i.id}><td>{i.hint}</td><td>{i.usedAt?'已使用':i.revokedAt?'已停用':'未使用'}</td><td>{i.usedBy||'—'}</td><td>{new Date(i.createdAt).toLocaleString('zh-CN')}</td><td>{!i.usedAt&&!i.revokedAt&&<button className="account-secondary" disabled={busy} onClick={()=>void revoke(i.id)}>停用</button>}</td></tr>)}</tbody></table></div>{!data.items.length&&<p>暂无邀请码记录</p>}<div className="system-actions"><button disabled={page===1||busy} onClick={()=>setPage(p=>p-1)}>上一页</button><span>第 {page} 页</span><button disabled={page*50>=data.total||busy} onClick={()=>setPage(p=>p+1)}>下一页</button></div></>}
  </section>;
}
