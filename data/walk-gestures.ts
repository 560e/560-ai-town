interface Point {x:number;y:number;type:string}
const still=()=>({rotateX:0,rotateY:0,zoomDelta:0});

// Only pointers that started on the scene canvas are registered by WalkControls.
export class WalkGesture {
 private points=new Map<number,Point>();
 blocksClick=false;
 get pointerIds(){return [...this.points.keys()];}

 start(id:number,x:number,y:number,type:string){
  if(this.points.has(id))return false;
  if(this.points.size&&(type!=='touch'||[...this.points.values()].some(point=>point.type!=='touch')))return false;
  if(!this.points.size)this.blocksClick=false;
  this.points.set(id,{x,y,type});
  if(this.points.size>1)this.blocksClick=true;
  return true;
 }

 move(id:number,x:number,y:number){
  const point=this.points.get(id);
  if(!point)return still();
  const dx=x-point.x,dy=y-point.y;
  if(this.points.size===1){point.x=x;point.y=y;return {rotateX:dx,rotateY:dy,zoomDelta:0};}
  const pair=[...this.points.values()];
  const before=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
  point.x=x;point.y=y;
  if(this.points.size!==2)return still();
  const after=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
  // Avoid a singular ratio when fingers meet; the next movement starts a new baseline.
  if(before<2||after<2)return still();
  return {rotateX:0,rotateY:0,zoomDelta:Math.log(before/after)*500};
 }

 // Every point is kept current even while pinching, so lifting rebases rotation.
 end(id:number){this.points.delete(id);}
 reset(){if(this.points.size)this.blocksClick=true;this.points.clear();}
}
