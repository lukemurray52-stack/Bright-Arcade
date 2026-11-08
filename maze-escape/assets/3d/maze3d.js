/* Bright Arcade Maze Escape — genuine lightweight WebGL 3D renderer.
   Self-contained; no CDN, engine download, data collection or remote dependency.
   The original accessible first-person canvas remains the automatic fallback. */
(function(){'use strict';
const THEMES={
 classic:{wall:0,floor:1,trim:2,ceil:3,sky1:[.07,.055,.24],sky2:[.28,.17,.43],fog:[.17,.13,.35],accent:[.72,.37,1],base:[.51,.45,.75],roof:true},
 jungle:{wall:8,floor:1,trim:2,ceil:3,sky1:[.22,.63,.94],sky2:[.83,.96,.93],fog:[.44,.65,.52],accent:[.75,.97,.38],base:[.52,.72,.5],roof:false},
 castle:{wall:0,floor:1,trim:2,ceil:3,sky1:[.13,.13,.25],sky2:[.37,.33,.44],fog:[.29,.27,.38],accent:[.83,.57,1],base:[.67,.63,.78],roof:true},
 space:{wall:0,floor:1,trim:2,ceil:3,sky1:[.018,.035,.12],sky2:[.06,.14,.29],fog:[.065,.17,.3],accent:[.2,.96,1],base:[.58,.82,.96],roof:true},
 school:{wall:0,floor:1,trim:2,ceil:3,sky1:[.3,.69,.97],sky2:[.81,.96,1],fog:[.63,.81,.92],accent:[.22,.68,1],base:[.83,.92,1],roof:true}
};
const VS=`precision highp float;
attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute float aMaterial;attribute vec3 aTint;attribute float aEmit;
uniform vec3 uEye;uniform float uAngle;uniform float uAspect;uniform float uFocus;uniform float uBob;uniform float uPitch;uniform float uScale;
varying vec2 vUV;varying float vMaterial;varying vec3 vNormal;varying vec3 vTint;varying float vEmit;varying float vDistance;varying vec3 vWorld;
void main(){vec3 pos=aPosition;pos.xz*=uScale;vec3 relative=pos-uEye;
 float cs=cos(uAngle),sn=sin(uAngle);
 float side=-sn*relative.x+cs*relative.z;
 float forward=cs*relative.x+sn*relative.z;
 float vertical=relative.y-uBob;
 float depth=forward*cos(uPitch)+vertical*sin(uPitch);
 float high=vertical*cos(uPitch)-forward*sin(uPitch);
 float nearP=.06,farP=92.;
 gl_Position=vec4(side*uFocus/uAspect,high*uFocus,(farP+nearP)/(farP-nearP)*depth-2.*farP*nearP/(farP-nearP),depth);
 vUV=aUV;vMaterial=aMaterial;vNormal=aNormal;vTint=aTint;vEmit=aEmit;vDistance=depth;vWorld=pos;
}`;
const FS=`precision mediump float;
varying vec2 vUV;varying float vMaterial;varying vec3 vNormal;varying vec3 vTint;varying float vEmit;varying float vDistance;varying vec3 vWorld;
uniform sampler2D uAtlas;uniform vec3 uFog;uniform float uTime;uniform float uFogStart;uniform float uFogEnd;
void main(){float m=floor(vMaterial+.5);
 float col=mod(m,4.);float row=3.-floor(m/4.);
 vec2 tileUV=clamp(vUV,.008,.992);
 vec2 texUV=(vec2(col,row)+tileUV)/4.;
 vec3 tex=texture2D(uAtlas,texUV).rgb;
 vec3 n=normalize(vNormal);
 vec3 dir=normalize(vec3(-.56,.81,.38));
 float face=.68+.27*max(0.,dot(n,dir));
 float lower=abs(n.y)<.3?mix(.65,1.,smoothstep(.04,.4,vWorld.y)) : 1.;
 float light=face*lower+.12*max(0.,dot(n,vec3(0.,1.,0.)));
 vec3 rgb=tex*vTint*light;
 rgb+=tex*vTint*vEmit*(.55+.1*sin(uTime*2.4));
 float fog=smoothstep(uFogStart,uFogEnd,vDistance);
 rgb=mix(rgb,uFog,fog*.90);
 gl_FragColor=vec4(pow(max(rgb,vec3(0.)),vec3(.94)),1.);
}`;
const SKYVS=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const SKYFS=`precision mediump float;varying vec2 vUv;uniform vec3 uTop;uniform vec3 uHorizon;uniform float uTime;uniform float uSpace;uniform float uCastle;
float hash(vec2 x){return fract(sin(dot(x,vec2(127.1,311.7)))*43758.5453);}
float cloud(vec2 uv){float s=0.;s+=.6*sin(uv.x*9.+sin(uv.y*8.)*2.+uTime*.025);s+=.27*sin(uv.x*24.-uv.y*11.+uTime*.04);s+=.13*sin(uv.x*51.+uv.y*16.);return smoothstep(.52,.92,s)*smoothstep(.46,.68,uv.y);}
void main(){float t=smoothstep(.12,1.,vUv.y);vec3 c=mix(uHorizon,uTop,t);
 float sun=1.-smoothstep(.02,.25,length((vUv-vec2(.79,.80))*vec2(1.0,1.4)));
 c=mix(c,vec3(1.,.94,.72),sun*.36*(1.-uSpace));
 float clouds=cloud(vUv);c=mix(c,vec3(.99,1.,1.),clouds*.31*(1.-uSpace));
 float stars=step(.9976,hash(floor(vUv*vec2(650.,400.))))*smoothstep(.22,.82,vUv.y);
 c+=vec3(.55,.84,1.)*stars*(uSpace*.68+uCastle*.18);
 gl_FragColor=vec4(c,1.);
}`;
function shader(gl,type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;}
function program(gl,v,f){const pr=gl.createProgram();gl.attachShader(pr,shader(gl,gl.VERTEX_SHADER,v));gl.attachShader(pr,shader(gl,gl.FRAGMENT_SHADER,f));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));return pr;}
const RGB=(x)=>x||[1,1,1];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const seedRand=(seed)=>()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return (seed>>>0)/4294967296;};
class Mesh{
 constructor(){this.v=[];}
 tri(a,b,c,n,mat,tint,emit=0,uvs=[[0,0],[1,0],[1,1]]){
  if(!n){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...n)||1;n=n.map(x=>x/len);}
  const cc=RGB(tint);for(const [i,p] of [a,b,c].entries())this.v.push(...p,...n,...uvs[i],mat,...cc,emit);
 }
 quad(a,b,c,d,mat=0,tint=[1,1,1],emit=0,uv=[[0,0],[1,0],[1,1],[0,1]]){
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],ll=Math.hypot(...n)||1;const norm=n.map(x=>x/ll);
  this.tri(a,b,c,norm,mat,tint,emit,[uv[0],uv[1],uv[2]]);this.tri(a,c,d,norm,mat,tint,emit,[uv[0],uv[2],uv[3]]);
 }
 box(x0,y0,z0,x1,y1,z1,mat=0,tint=[1,1,1],emit=0){
  const v=(x,y,z)=>[x,y,z];
  this.quad(v(x0,y0,z1),v(x1,y0,z1),v(x1,y1,z1),v(x0,y1,z1),mat,tint,emit);
  this.quad(v(x1,y0,z0),v(x0,y0,z0),v(x0,y1,z0),v(x1,y1,z0),mat,tint,emit);
  this.quad(v(x0,y0,z0),v(x0,y0,z1),v(x0,y1,z1),v(x0,y1,z0),mat,tint,emit);
  this.quad(v(x1,y0,z1),v(x1,y0,z0),v(x1,y1,z0),v(x1,y1,z1),mat,tint,emit);
  this.quad(v(x0,y1,z1),v(x1,y1,z1),v(x1,y1,z0),v(x0,y1,z0),mat,tint,emit);
  this.quad(v(x0,y0,z0),v(x1,y0,z0),v(x1,y0,z1),v(x0,y0,z1),mat,tint,emit);
 }
 plane(x0,z0,x1,z1,y,mat,tint,emit=0){this.quad([x0,y,z1],[x1,y,z1],[x1,y,z0],[x0,y,z0],mat,tint,emit)}
 finish(gl){const d=new Float32Array(this.v),buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);return {buffer:buf,count:d.length/13};}
}
class Renderer{
 constructor(host,view,getState){
  this.host=host;this.canvas=view;this.getState=getState;this.wallHeight=2.13;this.ready=false;this.smoothUnlock=0;this.lastTime=0;this.themeName='';this.stateHash='';this.renderScale=1;this.slowFrames=0;this.fastFrames=0;this.lastPerfTime=0;
  const gl=view.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'})||view.getContext('experimental-webgl',{antialias:true,alpha:false});
  if(!gl)throw new Error('WebGL unavailable');this.gl=gl;
  this.program=program(gl,VS,FS);this.skyProgram=program(gl,SKYVS,SKYFS);
  this.a={};for(const name of ['aPosition','aNormal','aUV','aMaterial','aTint','aEmit'])this.a[name]=gl.getAttribLocation(this.program,name);
  this.u={};for(const name of ['uEye','uAngle','uAspect','uFocus','uBob','uPitch','uScale','uAtlas','uFog','uTime','uFogStart','uFogEnd'])this.u[name]=gl.getUniformLocation(this.program,name);
  this.skyA=gl.getAttribLocation(this.skyProgram,'aPosition');this.skyU={};for(const name of ['uTop','uHorizon','uTime','uSpace','uCastle'])this.skyU[name]=gl.getUniformLocation(this.skyProgram,name);
  this.skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  this.staticMesh=null;this.dynamicBuffer=gl.createBuffer();this.dynamicCapacity=0;
  this.atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.atlas);
  const fallback=new Uint8Array([160,185,194,255]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,fallback);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
  this.ready=true;
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;document.body.classList.remove('maze-webgl-active')});
  this.rebuild();
 }
 loadTexture(theme){
  if(this.themeName===theme)return;this.themeName=theme;
  const image=new Image();const target=theme;
  image.onload=()=>{
   if(this.themeName!==target||!this.ready)return;
   try{const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.generateMipmap(gl.TEXTURE_2D);}catch(error){console.warn('Maze theme atlas could not load; keeping fallback material.',error);}
  };
  image.onerror=()=>{console.warn('Maze theme texture missing:',target)};
  image.src='assets/3d/'+theme+'_atlas.png';
 }
 rebuild(){
  if(!this.ready)return;
  const s=this.getState();if(!s||!s.maze||!s.maze.length)return;
  const theme=s.theme||'jungle';const t=THEMES[theme]||THEMES.jungle;
  this.loadTexture(theme);
  const maze=s.maze,H=maze.length,wallH=theme==='castle'?2.32:theme==='jungle'?2.16:2.12;
  this.wallHeight=wallH;this.size=H;this.smoothUnlock=s.unlocked?1:0;
  const m=new Mesh(),rand=seedRand(H*11471+theme.split('').reduce((n,c)=>n+c.charCodeAt(0),0));
  const open=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&maze[r][c]===0;
  const nearWall=(r,c)=>!open(r-1,c)||!open(r+1,c)||!open(r,c-1)||!open(r,c+1);
  // An exterior environment is real 3D geometry, not a flat image behind the door.
  m.plane(-9,-9,H+9,H+9,-.095,10,theme==='space'?[.45,.6,.77]:[.8,1,.77]);
  // Long atmospheric shapes only in the outdoor themes.
  if(theme==='jungle'||theme==='school'||theme==='castle'){
   for(let j=0;j<28;j++){
    const ang=j/28*Math.PI*2,rr=H/2+8+rand()*6,x=H/2+Math.cos(ang)*rr,z=H/2+Math.sin(ang)*rr;
    this.hill(m,x,z,1.5+rand()*3,2.1+rand()*2,theme==='castle'?[.32,.34,.43]:theme==='school'?[.47,.72,.63]:[.33,.58,.41]);
   }
  }
  const wallMat=theme==='jungle'?8:0;
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){
   const isExit=r===s.exitR&&c===s.exitC;
   if(open(r,c)){
    // Tile variation and edge shading create depth without giant square blocks.
    const v=.91+rand()*.16;
    m.plane(c,r,c+1,r+1,.007,1,[v,v,v]);
    if(theme!=='jungle'&&t.roof)m.plane(c,r,c+1,r+1,wallH+.06,3,[.89,.92,1]);
    if(nearWall(r,c)){
     const line=[.64,.70,.79];
     if(!open(r-1,c))m.plane(c,r,c+1,r+.07,.009,1,line);
     if(!open(r+1,c))m.plane(c,r+.93,c+1,r+1,.009,1,line);
     if(!open(r,c-1))m.plane(c,r,c+.07,r+1,.009,1,line);
     if(!open(r,c+1))m.plane(c+.93,r,c+1,r+1,.009,1,line);
    }
    // Recessed floor motifs and occasional inlaid tiles.
    if(rand()<.052&&theme!=='jungle')m.plane(c+.14,r+.14,c+.86,r+.86,.012,14,[.35,.54,.7],.10);
   }
   if(maze[r][c]!==1||isExit)continue;
   const faces=[];
   if(open(r-1,c))faces.push({side:'n',a:[c,0,r],b:[c+1,0,r],c:[c+1,wallH,r],d:[c,wallH,r]});
   if(open(r+1,c))faces.push({side:'s',a:[c+1,0,r+1],b:[c,0,r+1],c:[c,wallH,r+1],d:[c+1,wallH,r+1]});
   if(open(r,c-1))faces.push({side:'w',a:[c,0,r+1],b:[c,0,r],c:[c,wallH,r],d:[c,wallH,r+1]});
   if(open(r,c+1))faces.push({side:'e',a:[c+1,0,r],b:[c+1,0,r+1],c:[c+1,wallH,r+1],d:[c+1,wallH,r]});
   for(const f of faces){
    const shade=(theme==='jungle'?1.02:.9)+rand()*.18;
    m.quad(f.a,f.b,f.c,f.d,wallMat,[shade,shade,shade]);
    this.wallTrim(m,f,theme,wallH);
    const chance=rand();if(chance<.28)this.wallDecoration(m,f,theme,wallH,rand);
   }
   if(theme==='jungle'&&rand()<.25)m.box(c-.012,wallH-.06,r-.012,c+1.012,wallH+.16,r+1.012,8,[.83,1,.8]);
  }
  // Theme-specific world detail: accents, foliage, lights and environmental props.
  let budget=Math.min(90,Math.round(H*H*.06));
  for(let r=2;r<H-2&&budget>0;r++)for(let c=2;c<H-2&&budget>0;c++)if(open(r,c)&&rand()<(theme==='jungle'?.29:.12)){
   if(theme==='jungle')this.fern(m,c+.12,r+.13,.25+rand()*.15);
   else if(theme==='castle')this.floorAccent(m,c,r,theme,rand);
   else if(theme==='space')this.floorAccent(m,c,r,theme,rand);
   else if(theme==='classic')this.floorAccent(m,c,r,theme,rand);
   else this.floorAccent(m,c,r,theme,rand);
   budget--;
  }
  this.buildGateArch(m,s,t,wallH);
  // Exterior path and scenery deliberately aligned with the perimeter gateway.
  this.buildOutside(m,s,t,theme,rand);
  if(this.staticMesh)this.gl.deleteBuffer(this.staticMesh.buffer);
  this.staticMesh=m.finish(this.gl);
  this.exit=s;this.lastTime=0;
 }
 wallTrim(m,f,theme,height){
  const norm=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
  const p=(x,t)=>[f.a[0]+(f.b[0]-f.a[0])*x+norm[0]*.015,t,f.a[2]+(f.b[2]-f.a[2])*x+norm[1]*.015];
  // Continuous wainscot and upper band unify adjacent tiles as one corridor.
  m.quad(p(0,.04),p(1,.04),p(1,.18),p(0,.18),theme==='jungle'?0:2,[.82,.85,.89]);
  m.quad(p(0,height-.16),p(1,height-.16),p(1,height-.04),p(0,height-.04),theme==='jungle'?8:2,[.97,1,1]);
  if(theme==='jungle'){
   m.quad(p(0,.18),p(1,.18),p(1,.31),p(0,.31),0,[.77,.84,.7]);
  }else if(theme==='space'||theme==='classic'){
   m.quad(p(.07,height-.12),p(.93,height-.12),p(.93,height-.08),p(.07,height-.08),7,theme==='space'?[.38,.9,1]:[.84,.55,1],.26);
  }else if(theme==='school'){
   m.quad(p(0,.28),p(1,.28),p(1,.37),p(0,.37),14,[.64,.84,1],.12);
  }
 }
 wallDecoration(m,f,theme,height,rand){
  const pp=(u,y,depth)=>{
   const x=f.a[0]+(f.b[0]-f.a[0])*u,z=f.a[2]+(f.b[2]-f.a[2])*u;
   const norm=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
   return [x+norm[0]*depth,y,z+norm[1]*depth];
  };
  if(theme==='jungle'){
   // 3D foliage hanging in front of the hedge surface at different depths.
   for(let i=0;i<7;i++){
    const u=.09+i*.123+rand()*.10,drop=.19+rand()*.53,depth=.04+rand()*.08;
    m.quad(pp(u-.065,height-.10,depth),pp(u+.085,height-drop*.35,depth+.045),pp(u+.035,height-drop,depth+.092),pp(u-.075,height-drop*.65,depth+.03),8,[.74+rand()*.20,.96+rand()*.12,.72+rand()*.19]);
   }
  }else if(theme==='castle'){
   const a=pp(.38,.72,.025),b=pp(.62,.72,.025),c=pp(.62,1.56,.025),d=pp(.38,1.56,.025);
   m.quad(a,b,c,d,9,[.62,.52,.9]);
   this.lamp(m,pp(.82,1.22,.12),theme);
  }else if(theme==='school'){
   m.quad(pp(.12,.68,.02),pp(.88,.68,.02),pp(.88,1.54,.02),pp(.12,1.54,.02),rand()<.6?9:11,[.92,1,1]);
  }else if(theme==='space'){
   m.quad(pp(.16,.82,.025),pp(.84,.82,.025),pp(.84,1.61,.025),pp(.16,1.61,.025),11,[.68,1,1],.14);
   this.lamp(m,pp(.50,1.92,.06),theme);
  }else{
   m.quad(pp(.2,.65,.025),pp(.8,.65,.025),pp(.8,1.54,.025),pp(.2,1.54,.025),9,[.95,.88,1],.12);
   this.lamp(m,pp(.8,1.82,.09),theme);
  }
 }
 lamp(m,p,theme){
  const glow=THEMES[theme].accent;
  m.box(p[0]-.06,p[1]-.07,p[2]-.055,p[0]+.06,p[1]+.08,p[2]+.055,6,[.65,.78,.86]);
  m.box(p[0]-.045,p[1]-.02,p[2]-.067,p[0]+.045,p[1]+.055,p[2]+.067,7,glow,.68);
 }
 fern(m,x,z,s){
  m.box(x-.012,.01,z-.012,x+.012,.17,z+.012,8,[.38,.6,.24]);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3,dx=Math.cos(a)*s,dz=Math.sin(a)*s;
   m.tri([x,.16,z],[x+dx,.035,z+dz],[x+dx*.48,.25,z+dz*.48],null,8,[.42,.95,.43]);
   m.tri([x,.15,z],[x+dx*.66,.045,z+dz*.66],[x+dx*.36,.24,z+dz*.36],null,8,[.53,.98,.50]);
  }
 }
 tree(m,x,z,scale=1,theme='jungle'){
  const tr=theme==='castle'?[.35,.29,.37]:[.53,.38,.25];
  m.box(x-.075*scale,0,z-.075*scale,x+.075*scale,.83*scale,z+.075*scale,5,tr);
  const leaf=theme==='castle'?[.37,.36,.49]:theme==='school'?[.41,.80,.49]:[.3,.69,.33];
  for(let i=0;i<4;i++){
   const yy=.75*scale+i*.26*scale,rr=(.52-i*.065)*scale;
   this.cone(m,x,yy,z,rr,.60*scale,8,8,leaf);
  }
 }
 cone(m,x,y,z,r,height,segments,mat,tint){
  for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
   m.tri([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x,y+height,z],null,mat,tint);
  }
 }
 hill(m,x,z,rr,hh,tint){
  this.cone(m,x,-.15,z,rr,hh,8,10,tint);
 }
 floorAccent(m,c,r,theme,rand){
  if(theme==='classic'){
   m.box(c+.17,.014,r+.17,c+.83,.023,r+.83,14,[.48,.78,1],.28);
  }else if(theme==='space'){
   m.box(c+.36,.015,r+.36,c+.64,.032,r+.64,7,[.49,1,1],.28);
  }else if(theme==='school'){
   m.box(c+.19,.014,r+.19,c+.81,.022,r+.81,14,[.48,.8,.99],.10);
  }else if(theme==='castle'){
   m.box(c+.21,.014,r+.21,c+.79,.019,r+.79,0,[.7,.65,.78]);
  }
 }
 gateCoord(s,u,y,d=0){
  const cx=s.exitC+.5,cz=s.exitR+.5,n=s.exitSide==='north'?[0,-1]:s.exitSide==='south'?[0,1]:s.exitSide==='west'?[-1,0]:[1,0];
  const tan=[-n[1],n[0]];
  return [cx+tan[0]*u+n[0]*d,y,cz+tan[1]*u+n[1]*d];
 }
 gateBox(m,s,u0,y0,d0,u1,y1,d1,mat,tint,emit=0){
  const p=(u,y,d)=>this.gateCoord(s,u,y,d);
  // Six textured sides of a box in door-local coordinates.
  m.quad(p(u0,y0,d0),p(u1,y0,d0),p(u1,y1,d0),p(u0,y1,d0),mat,tint,emit);
  m.quad(p(u1,y0,d1),p(u0,y0,d1),p(u0,y1,d1),p(u1,y1,d1),mat,tint,emit);
  m.quad(p(u0,y0,d1),p(u0,y0,d0),p(u0,y1,d0),p(u0,y1,d1),mat,tint,emit);
  m.quad(p(u1,y0,d0),p(u1,y0,d1),p(u1,y1,d1),p(u1,y1,d0),mat,tint,emit);
  m.quad(p(u0,y1,d0),p(u1,y1,d0),p(u1,y1,d1),p(u0,y1,d1),mat,tint,emit);
  m.quad(p(u0,y0,d1),p(u1,y0,d1),p(u1,y0,d0),p(u0,y0,d0),mat,tint,emit);
 }
 buildGateArch(m,s,t,H){
  const stone=s.theme==='jungle'||s.theme==='castle'?0:6;
  const trim=2;
  // Exterior wall opening, with two stone piers and a segmented rounded arch.
  this.gateBox(m,s,-.5,0,-.19,-.365,H,.19,stone,[.90,.94,.94]);
  this.gateBox(m,s,.365,0,-.19,.5,H,.19,stone,[.90,.94,.94]);
  this.gateBox(m,s,-.5,1.99,-.21,.5,H,.21,trim,[.95,1,.97]);
  for(let i=0;i<10;i++){
   const a=Math.PI*i/10,b=Math.PI*(i+1)/10;
   const inner=.365,outer=.505,cy=1.48;
   const pi=(r,ang,d)=>this.gateCoord(s,Math.cos(ang)*r,cy+Math.sin(ang)*r,d);
   const shade=.88+(i%3)*.065;
   m.quad(pi(outer,a,-.24),pi(outer,b,-.24),pi(inner,b,-.255),pi(inner,a,-.255),trim,[shade,shade,shade]);
   m.quad(pi(inner,a,.22),pi(inner,b,.22),pi(outer,b,.215),pi(outer,a,.215),trim,[shade*.93,shade*.95,shade]);
  }
  this.gateBox(m,s,-.26,2.0,-.25,.26,2.15,.25,9,[.88,.95,1],.1);
  this.gateBox(m,s,-.22,2.02,-.265,.22,2.12,-.249,12,[1,1,1],.45);
  this.gateBox(m,s,-.48,0,-.22,-.36,.08,.22,trim,[1.15,1.12,1]);
  this.gateBox(m,s,.36,0,-.22,.48,.08,.22,trim,[1.15,1.12,1]);
  this.gateBox(m,s,-.36,0,-.48,.36,.025,.65,1,[1.04,1.02,.9]);
  if(s.theme==='jungle'){
   // Ivy hanging over the gateway — real 3D leaves, not a painted poster.
   for(let i=0;i<12;i++){
    const u=-.5+i/11,drop=.10+.10*(i%3);
    const a=this.gateCoord(s,u,2.08,-.29),b=this.gateCoord(s,u+.045,1.96-drop,-.34),c=this.gateCoord(s,u-.04,1.96-drop*.75,-.35);
    m.tri(a,b,c,null,8,[.76,.96,.67]);
   }
  }
 }

 buildOutside(m,s,t,theme,rand){
  const n=s.exitSide==='north'?[0,-1]:s.exitSide==='south'?[0,1]:s.exitSide==='west'?[-1,0]:[1,0],l=[-n[1],n[0]],cx=s.exitC+.5,cz=s.exitR+.5;
  const X=(u,d)=>cx+u*l[0]+d*n[0],Z=(u,d)=>cz+u*l[1]+d*n[1];
  for(let j=0;j<7;j++){
   const d=j*.88+.5,ww=.47+j*.045;
   const a=[X(-ww,d),.005,Z(-ww,d)],b=[X(ww,d),.005,Z(ww,d)],c=[X(ww,d+.87),.005,Z(ww,d+.87)],dd=[X(-ww,d+.87),.005,Z(-ww,d+.87)];
   m.quad(a,b,c,dd,theme==='jungle'||theme==='castle'?1:theme==='space'?6:theme==='school'?1:14,[1.08,1.06,.99]);
  }
  if(['jungle','school','castle'].includes(theme)){
   for(let j=0;j<10;j++){
    const lateral=(j%2?1:-1)*(1.4+rand()*3.8),d=1.5+rand()*8;
    this.tree(m,X(lateral,d),Z(lateral,d),.55+rand()*.85,theme);
    if(theme==='jungle'&&j<5)this.fern(m,X(lateral*.4,d),Z(lateral*.4,d),.42);
   }
  }else if(theme==='space'){
   for(let j=0;j<9;j++){
    const u=(j%2?1:-1)*(1.6+rand()*2.2),d=1+rand()*10;
    this.gateBoxOutside(m,X(u,d),Z(u,d),theme,t);
   }
  }else{
   for(let j=0;j<11;j++){
    const u=(j%2?1:-1)*(1.6+rand()*3.5),d=1+rand()*9;
    m.box(X(u,d)-.3,0,Z(u,d)-.3,X(u,d)+.3,.7+rand()*.9,Z(u,d)+.3,0,[.5,.45,.9]);
    m.box(X(u,d)-.16,.68,Z(u,d)-.16,X(u,d)+.16,.76,Z(u,d)+.16,7,[.65,.45,1],.3);
   }
  }
 }
 gateBoxOutside(m,x,z,theme,t){
  m.box(x-.45,0,z-.45,x+.45,1.35,z+.45,6,[.65,.86,1]);
  m.box(x-.3,.36,z-.46,x+.3,1.13,z-.45,7,t.accent,.32);
 }
 makeGateMesh(s,openness){
  const m=new Mesh(),angle=openness*1.48,u0=-.36;
  const p=(u,y,dep)=>{
   const delta=u-u0,localU=u0+Math.cos(angle)*delta-Math.sin(angle)*dep;
   const localD=Math.sin(angle)*delta+Math.cos(angle)*dep;
   return this.gateCoord(s,localU,y,localD);
  };
  const slab=(l,r,y0,y1,d0,d1,mat,tint,emit=0)=>{
   const A=(u,y,d)=>p(u,y,d);
   m.quad(A(l,y0,d0),A(r,y0,d0),A(r,y1,d0),A(l,y1,d0),mat,tint,emit);
   m.quad(A(r,y0,d1),A(l,y0,d1),A(l,y1,d1),A(r,y1,d1),mat,tint,emit);
   m.quad(A(l,y0,d1),A(l,y0,d0),A(l,y1,d0),A(l,y1,d1),mat,tint,emit);
   m.quad(A(r,y0,d0),A(r,y0,d1),A(r,y1,d1),A(r,y1,d0),mat,tint,emit);
   m.quad(A(l,y1,d0),A(r,y1,d0),A(r,y1,d1),A(l,y1,d1),mat,tint,emit);
  };
  slab(-.355,.355,.06,1.73,-.07,.06,5,[.87,.87,.9]);
  // Ribbing, metal straps, hinges and handle.
  for(let j=0;j<3;j++)slab(-.344,.346,.24+j*.55,.28+j*.55,-.082,-.07,6,[.67,.7,.8]);
  for(let j=0;j<2;j++)slab(-.31,.31,.39+j*.86,.45+j*.86,-.092,-.078,2,[.91,.97,1]);
  slab(.20,.26,.82,.91,-.12,-.075,7,[1,.83,.27],.38);
  if(openness<.98){slab(-.055,.055,.85,1.09,-.126,-.113,7,[1,.8,.25],.35);}
  return m;
 }
 dynamicMesh(s,now){
  const m=this.makeGateMesh(s,this.smoothUnlock);
  for(const token of s.tokens)if(!s.collected[token.word])this.addToken(m,token,now,s.theme);
  return new Float32Array(m.v);
 }
 addToken(m,t,now,theme){
  const x=t.x,z=t.y,y=.85+Math.sin(now*.0023+x*1.3)*.095,sz=.165;
  // Real 3D rotating crystal marker with levitating halo, small plinth and light.
  m.box(x-.19,0,z-.19,x+.19,.14,z+.19,theme==='jungle'?0:6,[.87,.93,1]);
  const a=now*.0012+x,rx=Math.cos(a)*sz,rz=Math.sin(a)*sz;
  const rot=(u,v,h)=>[x+u*Math.cos(a)-v*Math.sin(a),y+h,z+u*Math.sin(a)+v*Math.cos(a)];
  const top=rot(0,0,sz*1.8),bot=rot(0,0,-sz*1.3),pts=[rot(sz,0,0),rot(0,sz,0),rot(-sz,0,0),rot(0,-sz,0)];
  for(let i=0;i<4;i++){
   m.tri(pts[i],pts[(i+1)%4],top,null,7,[1.22,1.04,.48],.65);
   m.tri(pts[(i+1)%4],pts[i],bot,null,7,[.66,.9,1.22],.38);
  }
  // Low-tech halo: small illuminated raised square under the crystal.
  m.box(x-.26,.016,z-.26,x+.26,.035,z+.26,7,[1.05,.91,.54],.35);
 }
 bindMesh(mesh){
  const gl=this.gl,sz=13*4;
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
  const entries=[['aPosition',3,0],['aNormal',3,3],['aUV',2,6],['aMaterial',1,8],['aTint',3,9],['aEmit',1,12]];
  for(const [name,count,offset] of entries){const loc=this.a[name];if(loc<0)continue;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,count,gl.FLOAT,false,sz,offset*4)}
 }
 draw(now){
  if(!this.ready)return;
  const s=this.getState();if(!s||!s.maze||!s.maze.length)return;
  if(!this.staticMesh||this.size!==s.maze.length||this.themeName!==s.theme)this.rebuild();
  const canvas=this.canvas,gl=this.gl,rect=this.host.getBoundingClientRect();
  // Adapt rendering resolution instead of stuttering on slower classroom GPUs.
  const perfDelta=this.lastPerfTime?now-this.lastPerfTime:16;this.lastPerfTime=now;
  if(perfDelta>34){this.slowFrames++;this.fastFrames=0;}
  else if(perfDelta<19){this.fastFrames++;this.slowFrames=Math.max(0,this.slowFrames-1);}
  else{this.fastFrames=0;this.slowFrames=Math.max(0,this.slowFrames-1);}
  if(this.slowFrames>=20){this.renderScale=Math.max(.67,this.renderScale-.14);this.slowFrames=0;}
  if(this.fastFrames>=180){this.renderScale=Math.min(1,this.renderScale+.10);this.fastFrames=0;}
  const pr=Math.min(1.5,window.devicePixelRatio||1)*this.renderScale,w=Math.max(2,Math.min(1800,Math.round(rect.width*pr))),h=Math.max(2,Math.min(1120,Math.round(rect.height*pr)));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);
  // Pass one: dynamic horizon, atmosphere, stars (inside the GPU, not a billboard).
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.useProgram(this.skyProgram);
  const t=THEMES[s.theme]||THEMES.jungle,sk=this.skyU;
  gl.uniform3fv(sk.uTop,t.sky1);gl.uniform3fv(sk.uHorizon,t.sky2);gl.uniform1f(sk.uTime,now*.001);gl.uniform1f(sk.uSpace,s.theme==='space'?1:0);gl.uniform1f(sk.uCastle,s.theme==='castle'?.85:0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.enableVertexAttribArray(this.skyA);gl.vertexAttribPointer(this.skyA,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
  // Pass two: true 3D depth-tested world geometry, lighting, texture atlas, mist.
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);
  const u=this.u,drift=s.moveBlend||0;
  gl.uniform1f(u.uScale,1.36);gl.uniform3f(u.uEye,s.playerX*1.36,.88,s.playerY*1.36);
  gl.uniform1f(u.uAngle,s.playerAngle);gl.uniform1f(u.uAspect,w/h);gl.uniform1f(u.uFocus,1.35);
  gl.uniform1f(u.uBob,Math.sin(s.headBob||0)*.025*drift);gl.uniform1f(u.uPitch,0.015);
  gl.uniform1f(u.uTime,now*.001);gl.uniform3fv(u.uFog,t.fog);
  gl.uniform1f(u.uFogStart,s.theme==='space'?11:13);gl.uniform1f(u.uFogEnd,s.theme==='school'?39:31);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.uniform1i(u.uAtlas,0);
  if(this.staticMesh){this.bindMesh(this.staticMesh);gl.drawArrays(gl.TRIANGLES,0,this.staticMesh.count);}
  const elapsed=Math.min(.05,Math.max(0,(now-(this.lastTime||now))/1000));this.lastTime=now;
  this.smoothUnlock+=((s.unlocked?1:0)-this.smoothUnlock)*Math.min(1,elapsed*2.5);
  const d=this.dynamicMesh(s,now);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,d,gl.DYNAMIC_DRAW);
  this.bindMesh({buffer:this.dynamicBuffer});gl.drawArrays(gl.TRIANGLES,0,d.length/13);
 }
}
window.Maze3DRenderer=Renderer;
})();
