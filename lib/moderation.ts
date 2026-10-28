export const moderationCategories=['辱骂','人身侮辱','政治敏感','其他'] as const;
export type WordRule={term:string;category:string;enabled:boolean};
export type ManagedWord=WordRule&{id:string;version:number;updated_at:string};
/** Literal matching only: no staff-supplied regular expressions are executed. */
export function normalizedChat(value:string){return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\p{Z}\p{P}\p{S}\p{Cf}\s]/gu,'');}
export function wordRule(value:unknown):WordRule{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('词条格式无效');
 const r=value as WordRule;
 if(typeof r.term!=='string'||r.term.length>64||/[\r\n]/.test(r.term))throw new Error('词语需为 1–64 个字符且不能换行');
 const term=r.term.trim(),canonical=normalizedChat(term);
 if(!canonical||canonical.length>64)throw new Error('请输入有效词语，不能只有标点或空格');
 if(!moderationCategories.includes(r.category as typeof moderationCategories[number])||typeof r.enabled!=='boolean')throw new Error('分类或启用状态无效');
 return {term,category:r.category,enabled:r.enabled};
}
export function matchedWord(text:string,rules:WordRule[]){const normalized=normalizedChat(text);return rules.find(r=>r.enabled&&normalized.includes(normalizedChat(r.term)))??null;}
function csvRows(source:string){
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw new Error('CSV 引号格式错误');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(cell);cell='';closed=false;if(c!==','){rows.push(row);row=[];if(c==='\r'&&source[i+1]==='\n')i++;}}
  else{if(closed)throw new Error('CSV 引号后只能是逗号或换行');cell+=c;}
 }
 if(quoted)throw new Error('CSV 引号未闭合');if(cell||row.length||closed){row.push(cell);rows.push(row);}return rows;
}
export function parseWordImport(source:unknown,format:unknown){
 if(typeof source!=='string'||new TextEncoder().encode(source).length>262144||!['txt','csv'].includes(format as string))throw new Error('请选择 TXT 或 CSV，文件不得超过 256 KB');
 const clean=source.replace(/^\uFEFF/,'');
 const rows=format==='csv'?csvRows(clean):clean.split(/\r?\n/).map(s=>[s]);
 if(format==='csv'){const header=rows.shift();if(header?.join(',')!=='词语,分类,启用')throw new Error('CSV 首行必须是：词语,分类,启用');}
 const content=rows.map((cells,i)=>({cells,line:i+(format==='csv'?2:1)})).filter(r=>r.cells.some(c=>c.trim()));
 if(!content.length||content.length>1000)throw new Error('每次导入 1–1000 条词语');
 const rules:WordRule[]=[],errors:{line:number;error:string}[]=[],seen=new Set<string>();let duplicates=0;
 for(const {cells,line} of content)try{
  if(format==='csv'&&(cells.length!==3||!['启用','停用','true','false','1','0'].includes(cells[2].trim())))throw new Error('需包含词语、分类和启用（启用/停用）三列');
  const rule=wordRule({term:cells[0],category:format==='csv'?cells[1].trim():'其他',enabled:format==='csv'?!['停用','false','0'].includes(cells[2].trim()):true});
  const key=normalizedChat(rule.term);if(seen.has(key)){duplicates++;continue;}seen.add(key);rules.push(rule);
 }catch(error){errors.push({line,error:(error as Error).message});}
 return {rules,errors,duplicates};
}
