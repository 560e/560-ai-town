"use client";
import {useEffect,useState} from 'react';
import {statuses} from '@/lib/service';
import {formatTime,serviceRequest,Status} from './shared';
type Item={id:string;version:number;resident:string;title_name:string;status:string;updated_at:string};
type Result={id:string;ok:boolean;status?:string;error?:string;label:string};
export default function ApplicationManagementTable({items,busy,onBusy,onRead,onChanged}:{items:Item[];busy:boolean;onBusy:(value:boolean)=>void;onRead:(id:string)=>void;onChanged:()=>Promise<void>}){
  const [selected,setSelected]=useState<string[]>([]),[decision,setDecision]=useState('approved'),[reason,setReason]=useState(''),[results,setResults]=useState<Result[]>([]),[error,setError]=useState('');
  useEffect(()=>{setSelected([]);},[items]);
  const chosen=items.filter(item=>selected.includes(item.id));
  const run=async()=>{
    onBusy(true);setError('');setResults([]);
    try{
      const data=await serviceRequest('/api/manage/service',{op:'batchApplications',items:chosen.map(({id,version})=>({id,version})),decision,reason});
      setResults(data.results.map((result:Result)=>({...result,label:chosen.find(item=>item.id===result.id)?.resident+' · '+chosen.find(item=>item.id===result.id)?.title_name})));
      setSelected([]);setReason('');await onChanged();
    }catch(e){setError((e as Error).message);}finally{onBusy(false);}
  };
  return <>
    <p className="service-muted">按状态筛选后勾选申请，可统一处理当前页记录。有审核权限的工作人员也可审核自己的申请。</p>
    <div className="service-batch-actions">
      <strong>已选 {chosen.length} 条</strong>
      <label>批量操作<select aria-label="申请批量操作" value={decision} disabled={busy} onChange={e=>setDecision(e.target.value)}><option value="approved">通过并授予称号</option><option value="returned">退回补充</option><option value="rejected">拒绝申请</option><option value="deleted">删除申请记录</option></select></label>
      <label className="service-batch-reason">{decision==='deleted'?'删除原因':'处理意见'}（用户可见）<textarea aria-label="批量处理原因" value={reason} maxLength={500} rows={2} disabled={busy} onChange={e=>setReason(e.target.value)} placeholder="请填写处理原因"/></label>
      <button className="account-primary" disabled={busy||!chosen.length||!reason.trim()} onClick={()=>void run()}>{busy?'正在处理…':`确认${decision==='deleted'?'删除':'处理'} ${chosen.length} 条`}</button>
    </div>
    <p className="service-muted">{decision==='deleted'?'删除后记录移出申请列表，保留处理与审计历史；已授予的称号和权限不受影响。':'审核仅处理待审核申请。已处理、版本已更新或超出权限的记录会跳过，并列出原因。'}</p>
    {error&&<p className="account-error" role="alert">{error}</p>}
    {!!results.length&&<div className="service-batch-results" role="status"><strong>本批已完成 {results.filter(r=>r.ok).length} 条，未处理 {results.filter(r=>!r.ok).length} 条</strong><ul>{results.map(r=><li key={r.id}>{r.label}：{r.ok?(r.status==='deleted'?'已删除':statuses[r.status||'']||'已处理'):r.error}</li>)}</ul></div>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th><input type="checkbox" aria-label="选择当前页全部申请" disabled={busy||!items.length} checked={!!items.length&&chosen.length===items.length} ref={node=>{if(node)node.indeterminate=chosen.length>0&&chosen.length<items.length;}} onChange={e=>setSelected(e.target.checked?items.map(item=>item.id):[])}/></th><th>居民</th><th>称号</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><input type="checkbox" aria-label={`选择${item.resident}的${item.title_name}申请`} disabled={busy} checked={selected.includes(item.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))}/></td><td>{item.resident}</td><td>{item.title_name}</td><td><Status value={item.status}/></td><td>{formatTime(item.updated_at)}</td><td><div className="service-row-actions"><button disabled={busy} onClick={()=>onRead(item.id)}>查看并处理</button><button disabled={busy} onClick={()=>{setSelected([item.id]);setDecision('deleted');setReason('');}}>删除</button></div></td></tr>)}</tbody></table></div>
  </>;
}
