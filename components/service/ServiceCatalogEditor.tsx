"use client";
import {districtOptions,type ServiceCatalog} from '@/lib/service';
export default function ServiceCatalogEditor({value,onChange}:{value:ServiceCatalog;onChange:(catalog:ServiceCatalog)=>void}){
 const move=(index:number,offset:number)=>{const categories=[...value.categories];[categories[index],categories[index+offset]]=[categories[index+offset],categories[index]];onChange({...value,categories});};
 return <div className="service-editor-section"><h3>称号分类</h3><p className="service-muted">分类用于浏览筛选，例如学习类、共创类。荣誉／权限仍是称号的业务属性，分类不会授予权限。新分类发布后，可在身份称号编辑页中选择。</p>
  {value.categories.map((category,index)=><div className="service-catalog-row" key={category.id}><input aria-label={`分类${index+1}名称`} value={category.name} placeholder="例如：学习类" maxLength={20} onChange={e=>onChange({...value,categories:value.categories.map(c=>c.id===category.id?{...c,name:e.target.value}:c)})}/><label><input type="checkbox" checked={category.enabled} onChange={e=>onChange({...value,categories:value.categories.map(c=>c.id===category.id?{...c,enabled:e.target.checked}:c)})}/>公开展示</label><button type="button" aria-label={`上移分类${index+1}`} disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button type="button" aria-label={`下移分类${index+1}`} disabled={index===value.categories.length-1} onClick={()=>move(index,1)}>↓</button></div>)}
  {!value.categories.length&&<p className="service-muted">尚未设置分类。现有未分类称号仍可在“全部分类”中查看。</p>}
  <button type="button" className="account-secondary" disabled={value.categories.length>=40} onClick={()=>onChange({...value,categories:[...value.categories,{id:`cat_${crypto.randomUUID().replaceAll('-','')}`,name:'',enabled:true}]})}>＋ 新增分类</button>
  <h3>展示板开放版块</h3><p className="service-muted">仅勾选的版块进入前台筛选菜单。关闭分类或版块后，相关称号从展示板撤下；已有身份、申请记录及直接访问权限不变。这项设置不代表其他版块的业务功能已上线。</p>
  <div className="service-catalog-districts">{districtOptions.map(([id,name])=><label key={id}><input type="checkbox" checked={value.districts.includes(id)} onChange={e=>onChange({...value,districts:e.target.checked?[...value.districts,id]:value.districts.filter(d=>d!==id)})}/> {name}</label>)}</div>
 </div>;
}
