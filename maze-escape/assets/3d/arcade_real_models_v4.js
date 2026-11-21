/* Maze Escape V4 – real mesh/texture GLB importer for public-domain arcade assets.
 * No floating billboards: vertices, node transforms, UV material colours and depth
 * are baked directly into the existing Maze3DRenderer world mesh.
 * Source: Amusement Arcade and Seaside Pier, 3dassets.dev, CC0-1.0.
 * External CDN used only by this optional enhancement; procedural V4 models
 * remain in place if access is blocked, offline, or model decoding fails.
 */
(function(){'use strict';
const core=window.__mazeArcadeV4;if(!core)return;
const urls={
 racer:'https://cdn.3dassets.dev/assets/35406/v1/model.glb',
 claw:'https://cdn.3dassets.dev/assets/35409/v1/model.glb',
 hockey:'https://cdn.3dassets.dev/assets/35407/v1/model.glb',
 pinball:'https://cdn.3dassets.dev/assets/35410/v1/model.glb',
 dance:'https://cdn.3dassets.dev/assets/35411/v1/model.glb',
 prizes:'https://cdn.3dassets.dev/assets/35413/v1/model.glb'
};
const cache={},original={...core.BUILDERS};
const stats={loaded:[],failed:[],status:{}};
let rebuildQueued=false;
function scheduleRebuild(){
 if(rebuildQueued)return;rebuildQueued=true;
 setTimeout(()=>{
   rebuildQueued=false;
   try{const renderer=window.__mazeRenderer;
    if(renderer?.ready&&renderer.getState?.()?.theme==='classic')renderer.rebuild();
   }catch(e){console.warn('Arcade V4 mesh refresh failed',e)}
 },180);
}
window.__mazeArcadeV4.glb=stats;
function parseGLB(buf){
 const dv=new DataView(buf);if(dv.getUint32(0,true)!==0x46546c67)throw Error('Not GLB');
 if(dv.getUint32(4,true)!==2)throw Error('Expected glTF 2.0');
 let o=12,js=null,bin=null;
 while(o+8<=buf.byteLength){let size=dv.getUint32(o,true),type=dv.getUint32(o+4,true);o+=8;
  if(type===0x4e4f534a){const raw=new Uint8Array(buf,o,size);js=JSON.parse(new TextDecoder().decode(raw));}
  if(type===0x004e4942)bin=new DataView(buf,o,size);
  o+=size;
 }
 if(!js||!bin)throw Error('GLB missing JSON or binary');
 return {js,bin};
}
const identity=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function mul(A,B){const R=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let n=0;for(let k=0;k<4;k++)n+=A[k*4+r]*B[c*4+k];R[c*4+r]=n;}return R;}
function nodeMatrix(n){if(n.matrix)return n.matrix;
 const [x,y,z,w]=n.rotation||[0,0,0,1], [sx,sy,sz]=n.scale||[1,1,1], [tx,ty,tz]=n.translation||[0,0,0];
 return [(1-2*(y*y+z*z))*sx,2*(x*y+z*w)*sx,2*(x*z-y*w)*sx,0,
  2*(x*y-z*w)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+x*w)*sy,0,
  2*(x*z+y*w)*sz,2*(y*z-x*w)*sz,(1-2*(x*x+y*y))*sz,0,
  tx,ty,tz,1];
}
function transform(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
const COMPONENT={5120:['getInt8',1],5121:['getUint8',1],5122:['getInt16',2],5123:['getUint16',2],5125:['getUint32',4],5126:['getFloat32',4]};
const WIDTH={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function accessor(g,b,index){
 const acc=g.accessors[index],view=g.bufferViews[acc.bufferView],prop=COMPONENT[acc.componentType];
 if(!prop)throw Error('Unsupported GLB component '+acc.componentType);
 const [read,bytes]=prop,len=WIDTH[acc.type],step=view.byteStride||bytes*len;
 const start=(view.byteOffset||0)+(acc.byteOffset||0);
 const result=[];
 for(let i=0;i<acc.count;i++){
  const row=[];for(let j=0;j<len;j++){
   let n=b[read](start+i*step+j*bytes,true);
   if(acc.normalized){if(acc.componentType===5121)n/=255;else if(acc.componentType===5123)n/=65535;else if(acc.componentType===5120)n=Math.max(-1,n/127);else if(acc.componentType===5122)n=Math.max(-1,n/32767);}
   row.push(n);
  }
  result.push(row);
 }
 return result;
}
async function imagePixels(g,bin,imgIndex){
 const it=g.images?.[imgIndex];if(!it)return null;
 const view=g.bufferViews?.[it.bufferView];if(!view)return null;
 const start=view.byteOffset||0,end=start+view.byteLength;
 const src=new Uint8Array(bin.buffer,bin.byteOffset+start,end-start);
 const blob=new Blob([src],{type:it.mimeType||'image/webp'});
 let image=null;
 try{image=await createImageBitmap(blob);}catch{return null;}
 const c=document.createElement('canvas');c.width=Math.min(320,image.width);c.height=Math.min(320,image.height);
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,c.width,c.height);
 return {data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};
}
function texAt(img,uv){
 if(!img||!uv)return [1,1,1,1];
 const x=Math.max(0,Math.min(img.w-1,Math.floor(((uv[0]%1+1)%1)*img.w)));
 const y=Math.max(0,Math.min(img.h-1,Math.floor((1-((uv[1]%1+1)%1))*img.h)));
 const k=(y*img.w+x)*4,d=img.data;
 return [d[k]/255,d[k+1]/255,d[k+2]/255,d[k+3]/255];
}
async function decodeModel(buf){
 const {js:g,bin}=parseGLB(buf),imgs=[];
 if(g.images)for(let i=0;i<g.images.length;i++)imgs.push(await imagePixels(g,bin,i));
 const reads=new Map(),get=id=>{if(!reads.has(id))reads.set(id,accessor(g,bin,id));return reads.get(id);};
 const out=[],roots=(g.scenes?.[g.scene||0]?.nodes)||g.nodes?.map((_,i)=>i)||[];
 const visit=(i,parent)=>{
  const node=g.nodes[i],world=mul(parent,nodeMatrix(node));
  if(node.mesh!==undefined){
   for(const prim of g.meshes[node.mesh].primitives||[]){
    if(prim.mode!==undefined&&prim.mode!==4)continue;
    const pos=get(prim.attributes.POSITION),uv=prim.attributes.TEXCOORD_0!==undefined?get(prim.attributes.TEXCOORD_0):null;
    const indices=prim.indices!==undefined?get(prim.indices).map(v=>v[0]):pos.map((_,n)=>n);
    const mat=g.materials?.[prim.material||0]||{},pbr=mat.pbrMetallicRoughness||{},factor=pbr.baseColorFactor||[1,1,1,1];
    const sourceTex=pbr.baseColorTexture?.index;
    const tex=g.textures?.[sourceTex],img=tex?imgs[(tex.extensions?.EXT_texture_webp?.source??tex.source)]:null;
    const glow=mat.emissiveFactor||[0,0,0],em=Math.min(1,Math.max(...glow));
    for(let t=0;t+2<indices.length;t+=3){
     const idx=indices.slice(t,t+3),face=idx.map(id=>transform(world,pos[id])),avg=uv?idx.reduce((a,id)=>[a[0]+uv[id][0]/3,a[1]+uv[id][1]/3],[0,0]):null;
     const sample=texAt(img,avg),col=[0,1,2].map(j=>Math.max(.05,Math.min(1.6,factor[j]*sample[j])));
     if((factor[3]||1)*sample[3]<.3)continue;
     out.push({face,col,em});
    }
   }
  }
  for(const id of node.children||[])visit(id,world);
 };
 roots.forEach(n=>visit(n,identity()));
 if(!out.length)throw Error('GLB had no triangle meshes');
 let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const t of out)for(const v of t.face)for(let i=0;i<3;i++){min[i]=Math.min(min[i],v[i]);max[i]=Math.max(max[i],v[i]);}
 return {tris:out,min,max};
}
function appendAsset(A,model){
 const {min,max,tris}=model,span=max.map((v,i)=>v-min[i]);
 // Preserve original proportions; footprint is one or two solid floor cells.
 const wide=A._v4Wide===true,allowX=.89,allowZ=wide?1.73:.88;
 const scale=Math.min(allowX/(span[0]||1),allowZ/(span[2]||1),2.85/(span[1]||1));
 const cx=(min[0]+max[0])*.5,cz=(min[2]+max[2])*.5;
 const P=p=>A.P((p[0]-cx)*scale,(p[1]-min[1])*scale,(p[2]-cz)*scale);
 for(const t of tris){
  const a=P(t.face[0]),b=P(t.face[1]),c=P(t.face[2]);
  const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],L=Math.hypot(...n)||1,normal=n.map(x=>x/L);
  const em=t.em>.1?.22:0;
  // Direct mesh insertion preserves the detailed .glb triangle geometry and
  // UV-baked per-face colours rather than converting it to an upright sprite.
  for(const p of [a,b,c])A.m.v.push(...p,...normal,0,0,7,...t.col,em);
 }
}
for(const [kind,url] of Object.entries(urls)){
 core.BUILDERS[kind]=function(A){
   const model=cache[kind];
   if(!model)return original[kind](A);
   A._v4Wide=A._v4Wide||false;
   try{appendAsset(A,model);}catch(err){console.warn('Arcade GLB draw failed',kind,err);original[kind](A);}
 };
 stats.status[kind]='loading';
 fetch(url,{mode:'cors',cache:'force-cache'})
   .then(resp=>{if(!resp.ok)throw Error('HTTP '+resp.status);return resp.arrayBuffer();})
   .then(decodeModel)
   .then(model=>{
     cache[kind]=model;stats.loaded.push(kind);stats.status[kind]='ready';
     scheduleRebuild();
   })
   .catch(err=>{stats.failed.push(kind);stats.status[kind]='fallback';console.warn('Arcade V4: offline/local model fallback for '+kind+':',err.message);});
}
window.__mazeArcadeV4.testGlbDecoder={parseGLB,decodeModel,appendAsset};
})();
