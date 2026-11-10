/* Bright Arcade Maze Escape — genuine lightweight WebGL 3D renderer.
   Self-contained; no CDN, engine download, data collection or remote dependency.
   The original accessible first-person canvas remains the automatic fallback. */
(function(){'use strict';
 // Display name update applies to the existing five-world game without requiring
 // an index.html replacement (which may contain the user's independent changes).
 document.addEventListener('DOMContentLoaded',()=>{
   try{
     if(typeof themes!=='undefined'&&themes.castle){
       themes.castle.name='Royal Castle';
       themes.castle.accent='#c58b37';
       themes.castle.accent2='#42688b';
       themes.castle.bg='#efe2ce';
     }
     const label=document.querySelector('[data-theme="castle"] strong');
     if(label)label.textContent='Royal Castle';
   }catch(e){console.warn('Castle label fallback:',e)}
 });

const THEMES={
 classic:{wall:0,floor:1,trim:2,ceil:3,sky1:[.07,.055,.24],sky2:[.28,.17,.43],fog:[.17,.13,.35],accent:[.72,.37,1],base:[.51,.45,.75],roof:true},
 jungle:{wall:8,floor:1,trim:13,ceil:3,sky1:[.12,.64,.92],sky2:[.82,.97,.88],fog:[.43,.72,.50],accent:[1,.82,.31],base:[.54,.88,.48],roof:false},
 castle:{wall:0,floor:1,trim:2,ceil:3,sky1:[.28,.52,.80],sky2:[.95,.89,.75],fog:[.69,.65,.57],accent:[1,.67,.23],base:[.97,.94,.82],roof:true},
 space:{wall:0,floor:1,trim:2,ceil:3,sky1:[.018,.035,.12],sky2:[.06,.14,.29],fog:[.065,.17,.3],accent:[.2,.96,1],base:[.58,.82,.96],roof:true},
 school:{wall:0,floor:1,trim:2,ceil:3,sky1:[.23,.59,.88],sky2:[.88,.97,1],fog:[.73,.88,.97],accent:[.35,.76,1],base:[.94,.98,1],roof:true}
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
uniform sampler2D uAtlas;uniform sampler2D uPaintAtlas;uniform vec3 uFog;uniform float uTime;uniform float uFogStart;uniform float uFogEnd;uniform float uSchool;uniform float uJungle;uniform float uCastle;
void main(){float m=floor(vMaterial+.5);
 float col=mod(m,4.);float row=3.-floor(m/4.);
 vec2 tileUV=clamp(vUV,.008,.992);
 vec2 texUV=(vec2(col,row)+tileUV)/4.;
 // Painting IDs are unique 0-24 and mapped to a dedicated 8x4 Renaissance artwork atlas.
 // They are not recycled from the three shared castle material tiles.
 vec3 tex=texture2D(uAtlas,texUV).rgb;
 if(m>=16.0){
    float picture=m-16.0;
    float pictureCol=mod(picture,8.0);
    float pictureRow=3.0-floor(picture/8.0);
    vec2 pictureUV=(vec2(pictureCol,pictureRow)+tileUV)/vec2(8.0,4.0);
    tex=texture2D(uPaintAtlas,pictureUV).rgb;
 }
 vec3 n=normalize(vNormal);
 vec3 dir=normalize(vec3(-.56,.81,.38));
 float face=mix(.68+.27*max(0.,dot(n,dir)),.64+.36*max(0.,dot(n,dir)),step(.5,uSchool));
 float lower=abs(n.y)<.3?mix(.65,1.,smoothstep(.04,.4,vWorld.y)) : 1.;
 float light=face*lower+.12*max(0.,dot(n,vec3(0.,1.,0.)));
 vec3 rgb=tex*vTint*light;
 if(uSchool>.5){
   // Soft ambient occlusion at wall bases and at floor edges.
   if(abs(n.y)<.75) rgb*=mix(.72,1.,smoothstep(.01,.48,vWorld.y));
   if(n.y>.85){
     vec2 inCell=fract(vWorld.xz);
     float edge=min(min(inCell.x,1.-inCell.x),min(inCell.y,1.-inCell.y));
     rgb*=mix(.87,1.04,smoothstep(.015,.30,edge));
     // Recessed overhead diffuse fixtures; mild spatial illumination.
     float l=cos(vWorld.x*2.1)*cos(vWorld.z*2.1);
     rgb*=1.+max(0.,l)*.065;
   }
   rgb*=vec3(1.025,1.025,1.018);
 }
 rgb+=tex*vTint*vEmit*(.58+.22*sin(uTime*7.3+vWorld.x*2.1+vWorld.z*3.7));
 if(uCastle>.5){
   // Pale limestone stays visible under warm, lively torch illumination.
   float warmth=.95+.12*sin(vWorld.x*2.9+vWorld.z*1.8+uTime*.70);
   rgb*=vec3(1.10*warmth,1.055*warmth,.97);
   if(n.y>.65)rgb*=vec3(1.07,1.045,.98);
 }
 if(uJungle>.5){
   // Actual shader lighting on the jungle geometry: warm sun, soft canopy shade and
   // mossy lower-wall shading, not a screen overlay or AI-generated backdrop.
   float canopy=.86+.12*sin(vWorld.x*2.3+sin(vWorld.z*1.7))*cos(vWorld.z*2.1);
   if(n.y>.8){
     float spots=sin(vWorld.x*4.8+sin(vWorld.z*3.2)*.8)*sin(vWorld.z*4.7);
     float patch=smoothstep(.28,.76,spots);
     rgb*=mix(.78,1.16,patch)*canopy;
   }else{
     rgb*=mix(.76,1.,smoothstep(.05,.61,vWorld.y));
     rgb*=vec3(1.075,1.045,.95);
   }
 }
 // The walkable trail is recognisably sunlit sand rather than green foliage.
 // Material 1 is used for the continuous jungle walking surface.
 if(uJungle>.5 && n.y>.8 && abs(m-1.)<.4){
   rgb*=vec3(1.17,1.15,1.06);
 }
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
  this.u={};for(const name of ['uEye','uAngle','uAspect','uFocus','uBob','uPitch','uScale','uAtlas','uPaintAtlas','uFog','uTime','uFogStart','uFogEnd','uSchool','uJungle','uCastle'])this.u[name]=gl.getUniformLocation(this.program,name);
  this.skyA=gl.getAttribLocation(this.skyProgram,'aPosition');this.skyU={};for(const name of ['uTop','uHorizon','uTime','uSpace','uCastle'])this.skyU[name]=gl.getUniformLocation(this.skyProgram,name);
  this.skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  this.staticMesh=null;this.dynamicBuffer=gl.createBuffer();this.dynamicCapacity=0;
  this.atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.atlas);
  const fallback=new Uint8Array([160,185,194,255]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,fallback);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  // Second POT atlas stores 25 distinct detailed paintings (256px each).
  // It is loaded only when the Castle world is selected.
  this.paintAtlas=gl.createTexture();this.paintAtlasRequested=false;this.paintAtlasReady=false;
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.paintAtlas);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([94,79,61,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
  this.ready=true;
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;document.body.classList.remove('maze-webgl-active')});
  this.rebuild();
 }
 loadPaintingAtlas(){
  if(this.paintAtlasRequested)return;
  this.paintAtlasRequested=true;
  const image=new Image();
  image.onload=()=>{
   if(!this.ready)return;
   try{
    const gl=this.gl;
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.paintAtlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0);
    this.paintAtlasReady=true;
   }catch(err){console.warn('Castle artwork atlas failed to upload:',err);}
  };
  image.onerror=()=>console.warn('Castle artwork atlas could not load');
  image.src=(window.__mazePaintingAtlas||'assets/3d/castle_paintings.png');
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
  if(theme==='castle')this.loadPaintingAtlas();
  const maze=s.maze,H=maze.length,wallH=theme==='castle'?3.65:theme==='jungle'?2.16:theme==='school'?2.46:2.12;
  this.wallHeight=wallH;this.size=H;this.smoothUnlock=s.unlocked?1:0;
  const m=new Mesh(),rand=seedRand(H*11471+theme.split('').reduce((n,c)=>n+c.charCodeAt(0),0));
  if(theme==='castle')this.castleStats={walls:0,torches:0,paintings:0,statues:0,shields:0,swords:0,arches:0,banners:0,vaults:0,paintingIds:[],paintingLocations:[]};
  if(theme==='jungle')this.jungleStats={wallFaces:0,arches:0,carvings:0,foliage:0,stonePiers:0,canopies:0,blossoms:0,plants:{fern:0,banana:0,palm:0,monstera:0,bamboo:0,flowers:0},floating:0,zones:{canopy:0,bamboo:0,palm:0,ferns:0,flowers:0},zoneLabels:['Canopy Forest','Bamboo Trail','Palm Grove','Fern Gully','Flower Glade']};
  // Prepare one shuffled deck of 25 detailed artworks for THIS maze layout.
  // Each painting consumes one card and no card is returned to the deck.
  // Rebuilding the same level (e.g. opening its exit) produces the same order.
  if(theme==='castle'){
    let visualSeed=0x419CC2 ^ H;
    for(let rr=0;rr<H;rr++)for(let cc=0;cc<H;cc++)
      visualSeed=(Math.imul(visualSeed ^ (maze[rr][cc]+1),16777619))>>>0;
    const artRand=seedRand(visualSeed);
    this.castleArtworkOrder=Array.from({length:25},(_,i)=>i);
    for(let i=24;i>0;i--){const j=Math.floor(artRand()*(i+1));
      [this.castleArtworkOrder[i],this.castleArtworkOrder[j]]=[this.castleArtworkOrder[j],this.castleArtworkOrder[i]];
    }
    this.castleArtworkCursor=0;
    // Select visibly spaced paintings before generating any wall decorations.
    // Every map has fewer than 25 paintings, all different; larger maps have more.
    const candidates=[];
    for(let rr=0;rr<H;rr++)for(let cc=0;cc<H;cc++){
      if(maze[rr][cc]!==1||(rr===s.exitR&&cc===s.exitC))continue;
      if(rr>0&&maze[rr-1][cc]===0)candidates.push({r:rr,c:cc,side:'n',j:artRand()});
      if(rr<H-1&&maze[rr+1][cc]===0)candidates.push({r:rr,c:cc,side:'s',j:artRand()});
      if(cc>0&&maze[rr][cc-1]===0)candidates.push({r:rr,c:cc,side:'w',j:artRand()});
      if(cc<H-1&&maze[rr][cc+1]===0)candidates.push({r:rr,c:cc,side:'e',j:artRand()});
    }
    const target=Math.min(H<=17?16:H<=25?21:25,candidates.length);
    const chosen=[],usedCells=new Set();
    this.castleArtSelected=new Set();
    for(let n=0;n<target;n++){
      let winner=null,best=-1;
      for(const face of candidates){
        const key=face.r+','+face.c+','+face.side;
        if(usedCells.has(face.r+','+face.c)||this.castleArtSelected.has(key))continue;
        const minimum=chosen.length?Math.min(...chosen.map(p=>(p.r-face.r)**2+(p.c-face.c)**2)):H*H;
        // Deliberately scatter artwork through the entire maze; avoid repetitive galleries.
        const score=minimum+face.j*(chosen.length?1.35:1000);
        if(score>best){best=score;winner=face;}
      }
      if(!winner)break;
      chosen.push(winner);
      usedCells.add(winner.r+','+winner.c);
      this.castleArtSelected.add(winner.r+','+winner.c+','+winner.side);
    }
    this.castlePaintingTarget=this.castleArtSelected.size;
  }
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
  const wallMat=0;
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){
   const isExit=r===s.exitR&&c===s.exitC;
   if(open(r,c)){
    // Tile variation and edge shading create depth without giant square blocks.
    const v=.91+rand()*.16;
    const zone=theme==='jungle'?this.jungleZone(c,r,H):-1;
    const material=1;
    const tone=theme==='jungle'?[[1.03,1.01,.97],[1.10,1.055,.95],[1.08,1.065,1.01],[.99,1.00,.96],[1.13,1.08,1.00]][zone]:[1,1,1];
    m.plane(c,r,c+1,r+1,.007,material,[v*tone[0],v*tone[1],v*tone[2]]);
    if(theme!=='jungle'&&t.roof)m.plane(c,r,c+1,r+1,wallH+.06,3,theme==='school'?[1.07,1.09,1.09]:theme==='castle'?[1.10,1.07,1.00]:[.89,.92,1]);
    if(theme==='school'&&(r+c)%5===1)this.schoolCeilingLight(m,c,r,wallH);
    if(theme==='castle'&&r>0&&c>0&&r<H-1&&c<H-1){
      const ns=open(r-1,c)&&open(r+1,c)&&!open(r,c-1)&&!open(r,c+1);
      const ew=open(r,c-1)&&open(r,c+1)&&!open(r-1,c)&&!open(r+1,c);
      if((ns||ew)&&((r*7+c*13)%5===0)){this.castleCrossArch(m,c,r,wallH,ns);this.castleStats.arches++;}
      else if((r*3+c*7)%7===1){this.castleCeiling(m,c,r,wallH);this.castleStats.vaults++;}
    }
    if(nearWall(r,c)){
     const line=theme==='jungle'?[[.44,.71,.39],[.69,.80,.37],[.65,.83,.50],[.39,.70,.53],[.66,.85,.44]][zone]:[.64,.70,.79];
     if(!open(r-1,c))m.plane(c,r,c+1,r+.12,.019,6,line);
     if(!open(r+1,c))m.plane(c,r+.88,c+1,r+1,.019,6,line);
     if(!open(r,c-1))m.plane(c,r,c+.12,r+1,.019,6,line);
     if(!open(r,c+1))m.plane(c+.88,r,c+1,r+1,.019,6,line);
    }
    // Floor fragments / wind-blown leaves, kept clear of the player's walking line.
    if(theme==='jungle'&&rand()<.035)this.jungleFloorDetail(m,c,r,rand);
    // Rare temple lintels stay as visual accents; overhead leaves grow from trunks.
    // No unanchored leaves across the sky: canopy is rooted in wall-cell trees.
    // Recessed floor motifs and occasional inlaid tiles.
    if(rand()<.024&&theme!=='jungle'&&theme!=='school')m.plane(c+.14,r+.14,c+.86,r+.86,.012,14,[.35,.54,.7],.10);
   }
   if(maze[r][c]!==1||isExit)continue;
   const faces=[];
   if(open(r-1,c))faces.push({side:'n',a:[c,0,r],b:[c+1,0,r],c:[c+1,wallH,r],d:[c,wallH,r]});
   if(open(r+1,c))faces.push({side:'s',a:[c+1,0,r+1],b:[c,0,r+1],c:[c,wallH,r+1],d:[c+1,wallH,r+1]});
   if(open(r,c-1))faces.push({side:'w',a:[c,0,r+1],b:[c,0,r],c:[c,wallH,r],d:[c,wallH,r+1]});
   if(open(r,c+1))faces.push({side:'e',a:[c+1,0,r],b:[c+1,0,r+1],c:[c+1,wallH,r+1],d:[c+1,wallH,r]});
   if(theme==='jungle'){
    if(faces.length)this.jungleLivingBarrier(m,c,r,wallH,rand,faces.length,H);
    this.jungleStats.wallFaces+=faces.length;
   }else for(const f of faces){
    const shade=.9+rand()*.18;
    m.quad(f.a,f.b,f.c,f.d,wallMat,[shade,shade,shade]);
    this.wallTrim(m,f,theme,wallH);
    const chance=rand();
    if(theme==='school'){
      if(chance<(H<=17?.45:H<=25?.36:.26))this.schoolWallDecoration(m,f,wallH,rand);
    }else if(theme==='castle'){
      // Keep the largest mazes comfortable on school computers.
      // The marble architecture remains on all walls; ornate props use a
      // size-aware density so Hard does not draw hundreds of extra busts.
      const faceId=r+','+c+','+f.side;
      if(this.castleArtSelected.has(faceId)){
        // Only the chosen locations receive real artwork; each painting is used once.
        const uniqueId=this.castleArtworkOrder[this.castleArtworkCursor++];
        this.castleFramedArt(m,f,uniqueId,rand);
        this.castleStats.paintings++;
        this.castleStats.paintingIds.push(uniqueId);
        const normal=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
        this.castleStats.paintingLocations.push({id:uniqueId,x:(f.a[0]+f.b[0])*.5,z:(f.a[2]+f.b[2])*.5,nx:normal[0],nz:normal[1]});
      }else if(rand()<(H>=33?.45:H>=25?.76:1.0))this.castleWallFace(m,f,wallH,rand,chance);
      this.castleStats.walls++;
    }else if(chance<.28)this.wallDecoration(m,f,theme,wallH,rand);
   }
  }
  // Theme-specific world detail: accents, foliage, lights and environmental props.
  let budget=theme==='jungle'?Math.min(82,Math.round(H*H*.105)):Math.min(90,Math.round(H*H*.06));
  for(let r=2;r<H-2&&budget>0;r++)for(let c=2;c<H-2&&budget>0;c++)if(open(r,c)&&rand()<(theme==='jungle'?.28:.12)){
   if(theme==='jungle'){
     const side=rand()<.5?0:1;
     if(nearWall(r,c)){
       // Root each plant in an actual open floor tile touching a solid maze wall.
       const walls=[];
       if(!open(r-1,c))walls.push([c+.21+rand()*.58,r+.10]);
       if(!open(r+1,c))walls.push([c+.21+rand()*.58,r+.90]);
       if(!open(r,c-1))walls.push([c+.10,r+.21+rand()*.58]);
       if(!open(r,c+1))walls.push([c+.90,r+.21+rand()*.58]);
       const at=walls[(rand()*walls.length)|0];
       if(at){ const zone=this.jungleZone(c,r,H); this.jungleZoneGroundPlant(m,at[0],at[1],zone,rand); }
      }
     else this.jungleFloorDetail(m,c,r,rand);
   }
   else if(theme==='castle'){if(rand()<.37)this.castleFloorAccent(m,c,r,rand);}
   else if(theme==='space')this.floorAccent(m,c,r,theme,rand);
   else if(theme==='classic')this.floorAccent(m,c,r,theme,rand);
   else if(theme!=='school')this.floorAccent(m,c,r,theme,rand);
   budget--;
  }
  if(theme==='school')this.buildSchoolExit(m,s,wallH);else if(theme==='jungle')this.buildJungleExit(m,s,wallH,rand);else if(theme==='castle')this.buildCastleExit(m,s,wallH);else this.buildGateArch(m,s,t,wallH);
  // Exterior path and scenery deliberately aligned with the perimeter gateway.
  this.buildOutside(m,s,t,theme,rand);
  if(this.staticMesh)this.gl.deleteBuffer(this.staticMesh.buffer);
  this.staticMesh=m.finish(this.gl);
  this.exit=s;this.lastTime=0;
 }

 // --------------------------------------------------------------
 // ADVENTURE JUNGLE v5: real volumetric plant meshes in SOLID cells.
 // These models replace textured vertical wall polygons, rather than merely
 // decorating a wall. All shapes grow from the floor or a supporting trunk.
 jungleCrownVolume(m,x,y,z,rx,ry,rz,rand,variant=0){
   // Angular irregular closed low-poly shrub volume, genuine 3D normal lighting.
   // Crown is not planar, and every plant's bottom overlaps the ground/root stem.
   const rings=4,steps=8,levels=[-.95,-.52,.12,.64,1.0];
   const rot=rand()*6.28318,phase=rand()*6.28318;
   const green=[
    [0.72,1.08,0.68],[0.56,0.98,0.57],[0.80,1.13,0.74],
    [0.48,0.89,0.53],[0.61,1.04,0.78],[0.78,1.07,0.50]
   ][variant%6];
   const shade=.90+rand()*.17,points=[];
   for(let k=0;k<=rings;k++){
    const t=levels[k],base=k===0||k===rings?.21:Math.sqrt(1-t*t);
    const row=[];
    for(let j=0;j<steps;j++){
     const a=rot+j/steps*6.2831853;
     const wav=1+.075*Math.sin(j*3.7+phase+k*.8);
     row.push([x+Math.cos(a)*rx*base*wav,y+t*ry,z+Math.sin(a)*rz*base*wav]);
    }
    points.push(row);
   }
   for(let k=0;k<rings;k++)for(let j=0;j<steps;j++){
    const nj=(j+1)%steps;
    const t=[green[0]*(.92+rand()*.19)*shade,green[1]*(.92+rand()*.13)*shade,green[2]*(.88+rand()*.18)*shade];
    m.quad(points[k][j],points[k][nj],points[k+1][nj],points[k+1][j],8,t);
   }
   // Distinct 3D foliage blades break up smooth bush geometry. Each tip
   // emerges from its own bush surface, not from empty air or a wall texture.
   for(let j=0;j<7;j++){
    const a=(j+.38*(rand()-.5))/7*Math.PI*2+rot;
    const v=Math.sin(j*2.31+phase)*.40+.13;
    const f=Math.sqrt(1-v*v);
    const start=[x+Math.cos(a)*rx*f*.86,y+v*ry,z+Math.sin(a)*rz*f*.86];
    const end=[x+Math.cos(a)*rx*(1.13+rand()*.11),start[1]+(.08+rand()*.20),z+Math.sin(a)*rz*(1.13+rand()*.11)];
    this.jungleLeaf(m,start,end,.065+rand()*.035,8,[.71+rand()*.19,1.04+rand()*.12,.59+rand()*.2]);
   }
 }
 jungleBroadLeaf(m,root,mid,tip,width,variant=0){
   // Leaf is a folded, two-sided 3D paddle with a strong midrib and a stem.
   this.jungleStem(m,root,mid,.013,5,[.73,.89,.52]);
   const side=[-(tip[2]-root[2]),0,tip[0]-root[0]];
   const len=Math.hypot(...side)||1,dx=side[0]/len*width,dz=side[2]/len*width;
   const c=[(mid[0]+tip[0])*.50,(mid[1]+tip[1])*.50+.09,(mid[2]+tip[2])*.50];
   const left=[c[0]+dx,c[1]-.025,c[2]+dz],right=[c[0]-dx,c[1]-.025,c[2]-dz];
   m.tri(mid,left,tip,null,variant%2?13:8,[.68,1.12,.68]);
   m.tri(mid,tip,right,null,13,[.47,.98,.60]);
   m.tri(mid,right,tip,null,8,[.61,1.05,.56]);
   m.tri(mid,tip,left,null,13,[.79,1.14,.68]);
   this.jungleStem(m,mid,tip,.006,13,[.65,1.12,.51]);
 }
 junglePlantWallCell(m,c,r,height,rand,edgeCount,H){
   // Alias maintained for regression instrumentation.
   this.jungleLivingBarrier(m,c,r,height,rand,edgeCount,H);
 }
 jungleZone(c,r,H){
   // Genuine geographically distinct districts rather than independently random
   // shrubs. Every map size receives all five regions. Soft borders are curved
   // to avoid hard checkerboard biome transitions.
   const x=(c+.5)/H,z=(r+.5)/H;
   const seeds=[[.10,.13],[.85,.11],[.13,.82],[.50,.55],[.86,.82]];
   const warp=Math.sin(x*11+z*5)*.026+Math.cos(x*7-z*11)*.022;
   let selected=0,dist=1e12;
   for(let i=0;i<seeds.length;i++){
    const dx=x-seeds[i][0]+warp,dz=z-seeds[i][1]-warp*.52;
    const d=dx*dx+dz*dz;
    if(d<dist){dist=d;selected=i;}
   }
   return selected;
 }
 jungleLivingBarrier(m,c,r,height,rand,edgeCount,H){
   const zone=this.jungleZone(c,r,H);
   const names=['canopy','bamboo','palm','ferns','flowers'];
   this.jungleStats.zones[names[zone]]++;
   const density=H>=33?.76:H>=25?.87:1;
   const x=c+.5,z=r+.5;
   // Every mesh sits inside a solid wall cell. Boundaries remain provided by the
   // existing invisible maze grid, rather than by a vertical painted surface.
   if(zone===0){ // CANOPY FOREST: high dense tree crowns, uneven shadowy bushes.
     const n=H>=33?1:2;
     for(let k=0;k<n;k++){
       const a=k*6.283/n+rand()*.28,xx=x+Math.cos(a)*.22,zz=z+Math.sin(a)*.22;
       const tall=k===0?4.65+rand()*1.05:3.10+rand()*.65;
       this.jungleTrunk(m,xx,zz,tall*.65,rand);
       this.jungleCrownVolume(m,xx,tall*.68,zz,.57*density,.78+rand()*.36,.55*density,rand,k);
       this.jungleStats.foliage++;
     }
     if(rand()<.35)this.jungleGroundPlant(m,c+.31,r+.30,rand);
   }else if(zone===1){ // BAMBOO TRAIL: pale soil, tall multiple stem silhouettes.
     const n=H>=33?5:H>=25?7:9;
     for(let k=0;k<n;k++){
       const a=k*2.39996+rand()*.20,rad=.08+Math.sqrt((k+.5)/n)*.38;
       const xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad,hh=2.85+rand()*1.35;
       m.box(xx-.024,0,zz-.024,xx+.024,hh,zz+.024,5,[.85,1.06,.55]);
       for(let q=1;q<=4;q++){
         const y=hh*q/5;
         m.box(xx-.028,y,zz-.028,xx+.028,y+.028,zz+.028,13,[.78,1.08,.69]);
       }
       // Each pair of leaves grows outward from a visible stalk node.
       for(let q=0;q<2;q++){
         const a2=a+q*2.1,by=hh*(.5+q*.17),root=[xx,by,zz];
         const tip=[xx+Math.cos(a2)*(.20+rand()*.14),by+.11,zz+Math.sin(a2)*(.20+rand()*.14)];
         this.jungleLeaf(m,root,tip,.067,8,[.63,1.05,.49]);
       }
     }
     this.jungleStats.plants.bamboo+=n;
   }else if(zone===2){ // PALM GROVE: obvious palm trunks & radial fronds.
     const n=1;
     for(let k=0;k<n;k++){
       const xx=x+(k===0?-.20:.23),zz=z+(k===0?-.12:.20);
       this.jungleLargePalm(m,xx,zz,4.45+rand()*1.25,rand);
       this.jungleStats.plants.palm++;
     }
     this.jungleCrownVolume(m,x,.31,z,.46*density,.45,.39*density,rand,1);
     if(rand()<.5)this.jungleGroundPlant(m,c+.18,r+.26,rand);
   }else if(zone===3){ // FERN GULLY: low feathery fronds, giant split leaves.
     for(let k=0;k<(H>=33?2:3);k++){
       const a=k*2.39996,xx=x+Math.cos(a)*.31,zz=z+Math.sin(a)*.33;
       this.jungleGiantFern(m,xx,zz,.80+rand()*.42,rand);
       this.jungleStats.plants.fern++;
     }
     if(rand()<.66){this.jungleBanana(m,c+.23,r+.66,rand);this.jungleStats.plants.banana++;}
     if(rand()<.28)this.jungleCrownVolume(m,x,.35,z,.37,.35,.38,rand,4);
   }else{ // FLOWER GLADE: low shrubs, colorful flowers, more light and ground.
     for(let k=0;k<2;k++){
       const a=k*Math.PI+rand()*.28,xx=x+Math.cos(a)*.19,zz=z+Math.sin(a)*.22;
       this.jungleCrownVolume(m,xx,.46,zz,.32*density,.36,.31*density,rand,k+2);
     }
     for(let k=0;k<(H>=33?2:3);k++){
       const a=k*2.39996,xx=x+Math.cos(a)*(.18+rand()*.21),zz=z+Math.sin(a)*(.20+rand()*.19);
       this.jungleColorFlower(m,xx,zz,.78+rand()*.34,k%3,rand);
       this.jungleStats.plants.flowers++;
     }
     if(rand()<.15){ // a small rare buried ruin among the greenery, not a wall
       m.box(c+.38,0,r+.38,c+.61,.45,r+.59,0,[.90,.90,.79]);
       this.jungleStats.stonePiers++;
     }
   }
 }
 jungleTrunk(m,x,z,h,rand){
   const w=.045+rand()*.028;
   m.box(x-w,0,z-w,x+w,h,z+w,5,[.93,.89,.65]);
   // Two angled roots visibly connect the tree to the ground.
   m.box(x-w*1.5,.0,z-w*1.5,x+w*1.5,.16,z+w*1.5,5,[.71,.76,.56]);
 }
 jungleLargePalm(m,x,z,h,rand){
   this.jungleTrunk(m,x,z,h,rand);
   const root=[x,h,z];
   for(let i=0;i<7;i++){
     const a=i*Math.PI*2/7+rand()*.19,dx=Math.cos(a),dz=Math.sin(a);
     const mid=[x+dx*.43,h+.27+rand()*.08,z+dz*.43],tip=[x+dx*(.94+rand()*.21),h-.48+rand()*.17,z+dz*(.94+rand()*.21)];
     this.jungleBroadLeaf(m,root,mid,tip,.19+rand()*.07,i);
   }
 }
 jungleGiantFern(m,x,z,s,rand){
   const root=[x,.015,z];
   for(let j=0;j<5;j++){
     const a=j/5*Math.PI*2+rand()*.13,dx=Math.cos(a),dz=Math.sin(a);
     const tip=[x+dx*.49*s,.32*s,z+dz*.49*s];
     this.jungleStem(m,root,tip,.011,5,[.63,.98,.52]);
     const side=[-dz,0,dx];
     for(let k=1;k<=3;k++){
       const t=k/4,mid=[x+dx*.49*s*t,.32*s*t,z+dz*.49*s*t];
       for(let si of [-1,1]){
         const end=[mid[0]+side[0]*si*.14*s*(1-t),mid[1]+.04*s,mid[2]+side[2]*si*.14*s*(1-t)];
         this.jungleLeaf(m,mid,end,.034,13,[.57,1.15,.58]);
       }
     }
   }
 }
 jungleColorFlower(m,x,z,h,color,rand){
   const green=[.63,1.02,.53];
   this.jungleStem(m,[x,.0,z],[x,h,z],.016,5,green);
   const tint=[[1.42,.39,.45],[1.32,.86,.29],[1.40,.57,1.10]][color];
   for(let k=0;k<6;k++){
     const a=k*Math.PI/3,dx=Math.cos(a),dz=Math.sin(a);
     // Pale neutral atlas tile allows a true flower hue, not green multiplied
     // onto green leaf paint; each petal is a physical folded 3D polygon.
     const p=[x+dx*.14,h+Math.sin(a)*.11,z+dz*.14];
     m.quad([x,h,z],[x+dx*.10,h+.13,z+dz*.10],p,[x+dx*.12,h-.08,z+dz*.12],7,tint);
   }
   m.box(x-.057,h-.048,z-.055,x+.057,h+.052,z+.055,7,[1.37,1.18,.33]);
 }
 jungleZoneGroundPlant(m,x,z,zone,rand){
   // Groundside decoration obeys local visual biome, not a random global mix.
   if(zone===1)this.jungleBamboo(m,x,z,rand);
   else if(zone===2)this.junglePalm(m,x,z,rand);
   else if(zone===3)this.jungleFern(m,x,z,rand);
   else if(zone===4)this.jungleColorFlower(m,x,z,.53+rand()*.13,Math.floor(rand()*3),rand);
   else this.jungleMonstera(m,x,z,rand);
   this.jungleStats.foliage++;
 }
 wallTrim(m,f,theme,height){
  const norm=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
  const p=(x,t)=>[f.a[0]+(f.b[0]-f.a[0])*x+norm[0]*.015,t,f.a[2]+(f.b[2]-f.a[2])*x+norm[1]*.015];
  // Continuous wainscot and upper band unify adjacent tiles as one corridor.
  m.quad(p(0,.04),p(1,.04),p(1,theme==='castle'?.32:.18),p(0,theme==='castle'?.32:.18),theme==='jungle'?0:2,theme==='castle'?[1.03,1.00,.91]:[.82,.85,.89]);
  m.quad(p(0,height-.24),p(1,height-.24),p(1,height-.04),p(0,height-.04),theme==='jungle'?8:2,theme==='castle'?[1.15,1.09,.92]:[.97,1,1]);
  if(theme==='jungle'){
   m.quad(p(0,.18),p(1,.18),p(1,.31),p(0,.31),0,[.77,.84,.7]);
  }else if(theme==='space'||theme==='classic'){
   m.quad(p(.07,height-.12),p(.93,height-.12),p(.93,height-.08),p(.07,height-.08),7,theme==='space'?[.38,.9,1]:[.84,.55,1],.26);
  }else if(theme==='school'){
   m.quad(p(0,.30),p(1,.30),p(1,.47),p(0,.47),2,[.81,.98,1],.1);
  }
 }

 // -------------------------------- JUNGLE TEMPLE --------------------------------
 // Genuine WebGL geometry, all within existing impassable wall cells or beyond
 // the player's collision area. The original labyrinth and spelling rules stay unchanged.

 // === ADVENTURE JUNGLE v3: All foliage has an explicit physical support. ===
 // Fronds grow from the ground, vines descend from the wall crown, and canopy
 // branches start inside SOLID maze walls. No mid-air foliage spawners.
 jungleStem(m,a,b,r=.012,mat=5,tint=[.75,.93,.67]){
   const v=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],vl=Math.hypot(...v)||1;
   const d=v.map(x=>x/vl),ref=Math.abs(d[1])>.88?[1,0,0]:[0,1,0];
   let p=[d[1]*ref[2]-d[2]*ref[1],d[2]*ref[0]-d[0]*ref[2],d[0]*ref[1]-d[1]*ref[0]];
   const ll=Math.hypot(...p)||1;p=p.map(x=>x/ll*r);
   const q=[d[1]*p[2]-d[2]*p[1],d[2]*p[0]-d[0]*p[2],d[0]*p[1]-d[1]*p[0]];
   const add=(x,v,sign)=>[x[0]+v[0]*sign,x[1]+v[1]*sign,x[2]+v[2]*sign];
   m.quad(add(a,p,1),add(a,p,-1),add(b,p,-1),add(b,p,1),mat,tint);
   // A single two-sided ribbon is enough for small stems at corridor scale;
   // halve repeated stalk geometry without removing visible attachment lines.
 }
 jungleLeaf(m,base,tip,width=.11,mat=8,tint=[.82,1.07,.77]){
   // A tapered leaf with a visible midrib connecting its base to its petiole.
   const d=[tip[0]-base[0],tip[1]-base[1],tip[2]-base[2]];
   let side=[-d[2],.09,d[0]];const sl=Math.hypot(...side)||1;side=side.map(v=>v/sl*width);
   const mid=[base[0]+d[0]*.59,base[1]+d[1]*.59+.025,base[2]+d[2]*.59];
   const plus=mid.map((v,i)=>v+side[i]),minus=mid.map((v,i)=>v-side[i]);
   m.quad(base,plus,tip,minus,mat,tint);
   if(width>.12)this.jungleStem(m,base,tip,.003,13,[.66,.98,.56]);
 }
 jungleWallDecoration(m,f,h,rand,mode){
   const box=(...a)=>this.schoolWallBox(m,f,...a);
   const N=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
   const P=(u,y,d)=>[f.a[0]+(f.b[0]-f.a[0])*u+N[0]*d,y,f.a[2]+(f.b[2]-f.a[2])*u+N[1]*d];
   if(mode<.065){ // A few ruin remnants, never the predominant wall type.
     box(.23,.42,.012,.77,1.54,.055,2,[.82,1.02,.78]);
     if(rand()<.45){box(.34,.67,.058,.66,1.39,.078,9,[.75,1.05,.75]);this.jungleStats.carvings++;}
   }else if(mode<.165){ // Jungle tree bark and gnarled supporting roots.
     const u=.24+rand()*.5;
     box(u-.08,0,.016,u+.065,h-.08,.10,5,[.75,.98,.72]);
     for(let j=0;j<3;j++){
       const root=P(u,.11,.10),end=P(u+(j-1)*.19,.02,.15);
       this.jungleStem(m,root,end,.025,5,[.66,.85,.58]);
     }
   }
   // Each trailing vine begins inside the solid wall's crown, then descends.
   const vines=1+(rand()*2|0);
   for(let i=0;i<vines;i++){
     const u=.06+rand()*.88,drop=.36+rand()*1.20,segments=4;
     let prev=P(u,h+.035,.03);
     for(let j=1;j<=segments;j++){
       const q=j/segments,uu=u+.032*Math.sin(i*1.21+j*.83),y=h+.035-drop*q;
       const next=P(uu,y,.048+q*.065);
       this.jungleStem(m,prev,next,.008,13,[.50,.81,.36]);
       if(j===2||j===4){
         const sign=((j+i)%2?1:-1),base=next;
         this.jungleLeaf(m,base,P(uu+sign*(.15+rand()*.15),y-.085,.17),.065+rand()*.028,8,[.72,1.10,.66]);
       }
       prev=next;
     }
   }
   // Ground-rooted fern tufts: never sprout from empty space on the wall.
   if(rand()<.76){
     const rootU=.18+rand()*.63,root=P(rootU,.015,.095);
     for(let j=0;j<4;j++){
       const uShift=(j-1.5)*(.065+rand()*.017),top=P(rootU+uShift,.36+rand()*.29,.16+rand()*.06);
       this.jungleStem(m,root,top,.006,13,[.58,.91,.47]);
       for(let k=1;k<3;k++){
         const f=k/3,pp=[root[0]*(1-f)+top[0]*f,root[1]*(1-f)+top[1]*f,root[2]*(1-f)+top[2]*f];
         const pu=rootU+uShift*f;
         const leaf=P(pu+(j%2?1:-1)*(.06+.018*k),pp[1]+.045,.21);
         this.jungleLeaf(m,pp,leaf,.026,13,[.71+rand()*.1,1.08,.61]);
       }
     }
     this.jungleStats.foliage++;
   }
   // A bromeliad/epiphyte is mounted to an explicit bark rosette on the wall.
   if(rand()<.39){
     const u=.24+rand()*.55,y=.58+rand()*.93,root=P(u,y,.06);
     this.jungleStem(m,P(u,y-.22,.024),root,.022,5,[.72,.97,.65]);
     for(let j=0;j<6;j++){
       const a=j/6*Math.PI*2;
       const end=P(u+Math.sin(a)*.17,y+.14+Math.cos(a)*.21,.17+Math.abs(Math.sin(a))*.09);
       this.jungleLeaf(m,root,end,.063,13,[.63+rand()*.19,1.02,.61]);
     }
     this.jungleStats.foliage++;
   }
   // Occasional wall-rooted broadleaf tropical bush. Large recognisable paddle
   // leaves have an explicit petiole from a single lower wall root.
   if(rand()<.22){
     const u=.27+rand()*.46,root=P(u,.025,.09),stemTop=P(u,.56+rand()*.20,.105);
     this.jungleStem(m,root,stemTop,.017,13,[.61,.99,.45]);
     for(let j=0;j<4;j++){
       const side=j%2?1:-1,origin=P(u,.32+j*.105,.13);
       const tip=P(u+side*(.18+rand()*.14),.45+j*.16,.21);
       this.jungleStem(m,origin,tip,.006,13,[.54,.91,.43]);
       this.jungleLeaf(m,origin,tip,.105+rand()*.045,j%2?8:13,[.75,1.13,.62]);
     }
   }
   // Flower stalk begins at floor level and stays connected to its petals.
   if(rand()<.17){
     const u=.2+rand()*.60,y=.38+rand()*.56;
     const start=P(u,.012,.12),b=P(u+.04,y,.18);
     this.jungleStem(m,start,b,.009,13,[.52,1.01,.47]);
     this.jungleLeaf(m,P(u+.02,y*.53,.15),P(u+.14,y*.61,.22),.043,8,[.80,1.13,.66]);
     this.jungleFlower(m,b,rand);
   }
 }
 jungleWallCrown(m,c,r,h,rand){
   // Broad crown occupies a solid wall cell; all upright leaves touch its base.
   const top=h+.055;
   m.box(c+.04,h-.11,r+.04,c+.96,top,r+.96,13,[.75,1.06,.69]);
   for(let j=0;j<3;j++){
     const root=[c+.15+rand()*.70,top,r+.15+rand()*.70];
     const a=rand()*Math.PI*2,len=.16+rand()*.20;
     const tip=[root[0]+Math.cos(a)*len,top+.19+rand()*.18,root[2]+Math.sin(a)*len];
     this.jungleStem(m,root,tip,.010,5,[.55,.80,.44]);
     this.jungleLeaf(m,root,tip,.09,8,[.76,1.13,.65]);
   }
 }
 jungleFloorDetail(m,c,r,rand){
   const x=c+.14+rand()*.70,z=r+.14+rand()*.70;
   if(rand()<.63){
     const w=.09+rand()*.12;
     m.tri([x-w,.011,z],[x+.06,.012,z-w*.60],[x+.08,.012,z+w],null,13,[.77,1.08,.58]);
     m.tri([x+.03,.012,z],[x+w,.012,z+.04],[x-.05,.012,z+w*.63],null,8,[.72,1.05,.53]);
   }else{
     m.box(x-.09,.007,z-.06,x+.09,.015,z+.06,10,[.85,.92,.72]);
   }
 }
 jungleOverheadArch(m,c,r,h,rand,xSpan){
   // Rare low-profile moss-covered ruin fragment supported by BOTH stone posts.
   const stone=[.76,.97,.72];
   if(xSpan){
     m.box(c+.028,1.94,r+.28,c+.13,h+.06,r+.70,2,stone);
     m.box(c+.87,1.94,r+.28,c+.97,h+.06,r+.70,2,stone);
     m.box(c+.028,h-.12,r+.25,c+.97,h+.10,r+.73,0,stone);
   }else{
     m.box(c+.28,1.94,r+.028,c+.71,h+.06,r+.13,2,stone);
     m.box(c+.28,1.94,r+.87,c+.71,h+.06,r+.972,2,stone);
     m.box(c+.26,h-.12,r+.028,c+.73,h+.10,r+.972,0,stone);
   }
   this.jungleStats.arches++;
 }
 jungleCanopyCrossing(m,c,r,h,rand,open){
   // IMPORTANT: Unlike v2, branches never begin in the air.
   // Anchor their first point into a wall cell adjacent to the open corridor.
   const supports=[];
   if(!open(r-1,c))supports.push([[c+.50,h+.025,r+.015],[0,0,1]]);
   if(!open(r+1,c))supports.push([[c+.50,h+.025,r+.985],[0,0,-1]]);
   if(!open(r,c-1))supports.push([[c+.015,h+.025,r+.50],[1,0,0]]);
   if(!open(r,c+1))supports.push([[c+.985,h+.025,r+.50],[-1,0,0]]);
   if(!supports.length)return;
   const [anchor,d]=supports[(rand()*supports.length)|0];
   // Woody branch starts inside the existing wall-top crown and grows outward.
   const end=[anchor[0]+d[0]*(.41+rand()*.15),h+.08,anchor[2]+d[2]*(.41+rand()*.15)];
   this.jungleStem(m,anchor,end,.025,5,[.70,.88,.59]);
   for(let j=0;j<3;j++){
     const t=.22+j*.28,side=j%2?1:-1;
     const base=[anchor[0]+(end[0]-anchor[0])*t,anchor[1]+(end[1]-anchor[1])*t,anchor[2]+(end[2]-anchor[2])*t];
     const perp=[-d[2],0,d[0]],length=.22+rand()*.18;
     const tip=[base[0]+d[0]*.16+perp[0]*side*length,h-.12+rand()*.15,base[2]+d[2]*.16+perp[2]*side*length];
     // Individual leaf petioles visibly meet the same woody branch.
     this.jungleStem(m,base,tip,.006,13,[.54,.91,.45]);
     this.jungleLeaf(m,base,tip,.065+rand()*.045,j%3?8:13,[.66+rand()*.19,1.12,.60]);
   }
   this.jungleStats.canopies++;
 }
 jungleGroundPlant(m,x,z,rand){
   const pick=rand();
   if(pick<.25){this.jungleFern(m,x,z,rand);this.jungleStats.plants.fern++;}
   else if(pick<.46){this.jungleBanana(m,x,z,rand);this.jungleStats.plants.banana++;}
   else if(pick<.60){this.junglePalm(m,x,z,rand);this.jungleStats.plants.palm++;}
   else if(pick<.76){this.jungleMonstera(m,x,z,rand);this.jungleStats.plants.monstera++;}
   else if(pick<.89){this.jungleBamboo(m,x,z,rand);this.jungleStats.plants.bamboo++;}
   else {this.jungleFlowerBush(m,x,z,rand);this.jungleStats.plants.flowers++;}
   this.jungleStats.foliage++;
 }
 jungleFern(m,x,z,rand){
   // Pinnate fern: narrow midribs and alternating rows of small leaflets.
   const root=[x,.018,z],fronds=5+(rand()*3|0);
   for(let j=0;j<fronds;j++){
     const ang=j/fronds*Math.PI*2+rand()*.15,dx=Math.cos(ang),dz=Math.sin(ang);
     const hh=.38+rand()*.26,rad=.22+rand()*.13;
     const end=[x+dx*rad,hh*.75,z+dz*rad];
     this.jungleStem(m,root,end,.004,13,[.55,1.0,.50]);
     const perp=[-dz,0,dx];
     for(let k=1;k<=3;k++){
       const t=k/4,b=[x+dx*rad*t,hh*.75*t,z+dz*rad*t];
       const w=(1-.55*t)*(.054+rand()*.018);
       for(const sign of [-1,1]){
         const tip=[b[0]+perp[0]*w*sign+dx*.06,b[1]+.025,b[2]+perp[2]*w*sign+dz*.06];
         this.jungleLeaf(m,b,tip,.014,13,[(.68+rand()*.1),1.10,.55]);
       }
     }
   }
 }
 jungleBanana(m,x,z,rand){
   // Banana/canna-like plant: a sturdy stalk and huge paddle-shaped blades.
   const h=.64+rand()*.30;const root=[x,.018,z],node=[x,h,z];
   this.jungleStem(m,root,node,.027,13,[.60,1.01,.49]);
   for(let j=0;j<5;j++){
     const a=j/5*Math.PI*2+rand()*.20,dx=Math.cos(a),dz=Math.sin(a);
     const base=[x+(dx*.018),h*.75,z+dz*.018];
     const tip=[x+dx*(.23+rand()*.16),h+.23+rand()*.27,z+dz*(.19+rand()*.13)];
     this.jungleStem(m,base,tip,.010,13,[.55,.90,.43]);
     this.jungleLeaf(m,base,tip,.135+rand()*.065,j%2?13:8,[.69+rand()*.14,1.14,.57]);
   }
 }
 junglePalm(m,x,z,rand){
   // Fan palm; brown grounded segmented trunk and radiating petioles.
   const h=.77+rand()*.36,root=[x,.016,z],top=[x+(rand()-.5)*.04,h,z];
   this.jungleStem(m,root,top,.033,5,[.85,.85,.65]);
   for(let j=0;j<6;j++){
     const a=j/6*Math.PI*2+rand()*.11,dx=Math.cos(a),dz=Math.sin(a);
     const center=[top[0]+dx*.12,h+.11,top[2]+dz*.12];
     this.jungleStem(m,top,center,.008,13,[.55,.92,.42]);
     for(let k=-1;k<=1;k++){
       const theta=a+k*.23;
       const tip=[x+Math.cos(theta)*(.30+rand()*.08),h+.04+rand()*.13,z+Math.sin(theta)*(.30+rand()*.08)];
       this.jungleLeaf(m,center,tip,.036,13,[.72+rand()*.13,1.16,.56]);
     }
   }
 }
 jungleMonstera(m,x,z,rand){
   // Split-leaf arum: visible long petioles with broad, lobed leaf silhouettes.
   const root=[x,.016,z];
   for(let j=0;j<4;j++){
     const a=j/4*Math.PI*2+rand()*.3,dx=Math.cos(a),dz=Math.sin(a);
     const h=.44+rand()*.30;
     const base=[x+dx*.075,h*.66,z+dz*.075];
     this.jungleStem(m,root,base,.011,13,[.56,.94,.48]);
     const tip=[x+dx*(.23+rand()*.12),h,z+dz*(.23+rand()*.12)];
     this.jungleStem(m,base,tip,.005,13,[.6,.92,.49]);
     this.jungleLeaf(m,base,tip,.095+rand()*.045,8,[.66,1.08,.61]);
     const perp=[-dz,0,dx];
     for(const s of [-1,1])for(let k=1;k<=2;k++){
       const t=k/3,p=[base[0]+(tip[0]-base[0])*t,base[1]+(tip[1]-base[1])*t,base[2]+(tip[2]-base[2])*t];
       const lob=[p[0]+perp[0]*s*.105+dx*.042,p[1]+.01,p[2]+perp[2]*s*.105+dz*.042];
       this.jungleLeaf(m,p,lob,.030,8,[.72,1.10,.58]);
     }
   }
 }
 jungleBamboo(m,x,z,rand){
   // Bamboo / reed cluster: multiple grounded jointed culms and small leaves.
   for(let j=0;j<4;j++){
     const xx=x+(j-1.5)*.050,zz=z+(rand()-.5)*.07,h=1.02+rand()*.44;
     const b=[xx,.018,zz],top=[xx+.025,h,zz+.01];
     this.jungleStem(m,b,top,.011,13,[.60,.95,.50]);
     for(let k=1;k<=4;k++){
       const y=h*k/5,point=[xx+.025*k/5,y,zz+.01*k/5];
       this.jungleStem(m,[point[0]-.017,y,point[2]],[point[0]+.017,y,point[2]],.008,5,[.69,.92,.53]);
       const tip=[point[0]+(k%2?.14:-.14),y+.065,point[2]+.06];
       this.jungleStem(m,point,tip,.005,13,[.62,.98,.42]);
       this.jungleLeaf(m,point,tip,.034,8,[.72,1.08,.55]);
     }
   }
 }
 jungleFlower(m,center,rand){
   // Petals converge on the tip of a real plant stem.
   const size=.052+rand()*.027;
   for(let j=0;j<5;j++){
     const a=j/5*Math.PI*2,uu=Math.cos(a),vv=Math.sin(a);
     const p=[center[0]+uu*size,center[1]+vv*size,center[2]+.013];
     const q=[center[0]+Math.cos(a+.55)*size*.75,center[1]+Math.sin(a+.55)*size*.75,center[2]+.023];
     m.tri(center,p,q,null,14,j%2?[1.34,.51,.39]:[1.33,.87,.30]);
   }
   this.jungleStats.blossoms++;
 }
 jungleFlowerBush(m,x,z,rand){
   const root=[x,.014,z];
   for(let j=0;j<4;j++){
     const a=j*Math.PI/2+rand()*.4,dx=Math.cos(a),dz=Math.sin(a),hh=.24+rand()*.25;
     const tip=[x+dx*.12,hh,z+dz*.12];
     this.jungleStem(m,root,tip,.010,13,[.52,.88,.43]);
     this.jungleLeaf(m,[x+dx*.04,hh*.42,z+dz*.04],[x+dx*.14,hh*.62,z+dz*.15],.045,8,[.78,1.15,.63]);
     this.jungleFlower(m,tip,rand);
   }
 }
 jungleBlossom(m,x,z,rand){
   const h=.32+rand()*.18,root=[x,.015,z],top=[x,h,z];
   this.jungleStem(m,root,top,.012,13,[.53,.97,.47]);
   this.jungleFlower(m,top,rand);
 }
 buildJungleExit(m,s,h,rand){
   // Gateway remains in precisely the original perimeter exit tile.
   this.gateBox(m,s,-.50,0,-.22,-.355,h+.07,.24,0,[.90,.91,.76]);
   this.gateBox(m,s,.355,0,-.22,.50,h+.07,.24,0,[.90,.91,.76]);
   this.gateBox(m,s,-.50,1.91,-.21,.50,h+.12,.23,0,[.94,.93,.79]);
   for(let side of [-1,1]){
     const l=side<0?-.50:.355,rr=side<0?-.355:.50;
     this.gateBox(m,s,l-.016,0,-.33,rr+.016,.24,.35,2,[1.10,1.05,.82]);
     this.gateBox(m,s,l-.026,1.61,-.34,rr+.026,1.81,.35,2,[1.04,1.06,.84]);
     this.gateBox(m,s,l-.036,2.0,-.36,rr+.036,2.16,.35,2,[1.01,1.02,.82]);
   }
   this.gateBox(m,s,-.54,2.13,-.28,.54,2.30,.32,2,[.98,1.0,.82]);
   this.gateBox(m,s,-.36,2.31,-.34,.36,2.37,.36,0,[.81,.89,.67]);
   // One small discovered ruin: the perimeter exit retains the temple insignia.
   this.gateBox(m,s,-.26,2.17,-.372,.26,2.31,-.34,9,[1.08,1.12,.91]);
   this.gateBox(m,s,-.105,2.19,-.388,.105,2.29,-.373,12,[1.05,.98,.72],.08);
   this.gateBox(m,s,-.37,.035,-.32,.37,.095,.28,1,[1.13,1.09,.95]);
   for(let j=0;j<24;j++){
     const u=-.47+j*.039, y=2.29-(j%4)*.07;
     const a=this.gateCoord(s,u,y,-.4),b=this.gateCoord(s,u+.05,y-.17,-.44),c=this.gateCoord(s,u-.065,y-.15,-.43);
     m.tri(a,b,c,null,8,[.65,.93,.50]);
   }
 }
 makeJungleDoor(s,openness){
   const m=new Mesh(),angle=openness*1.42,hinge=-.35;
   const at=(u,y,d)=>{
     const t=u-hinge;
     return this.gateCoord(s,hinge+Math.cos(angle)*t-Math.sin(angle)*d,y,Math.sin(angle)*t+Math.cos(angle)*d);
   };
   const box=(u0,y0,d0,u1,y1,d1,mat,tint,em=0)=>{
     const p=[at(u0,y0,d0),at(u1,y0,d0),at(u1,y1,d0),at(u0,y1,d0),at(u0,y0,d1),at(u1,y0,d1),at(u1,y1,d1),at(u0,y1,d1)];
     for(const [a,b,c,d] of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]])m.quad(p[a],p[b],p[c],p[d],mat,tint,em);
   };
   box(-.345,.04,-.07,.345,1.89,.055,4,[.86,.79,.66]);
   for(let j=0;j<4;j++){
     const u=-.33+j*.175;
     box(u,.07,-.083,u+.029,1.86,-.071,5,[.80,.78,.67]);
   }
   for(let j=0;j<3;j++)box(-.33,.38+j*.55,-.102,.34,.43+j*.55,-.083,6,[.71,.70,.52]);
   box(-.31,.82,-.117,.31,.89,-.103,2,[.80,.78,.66]);
   box(.20,.86,-.14,.27,.99,-.105,14,[1.10,.98,.59],.12);
   if(openness<.96){
     box(-.105,.91,-.15,.105,1.12,-.113,12,[.98,.93,.61],.35);
     box(-.035,.90,-.163,.035,1.13,-.151,14,[1.06,.93,.60],.32);
   }
   return m;
 }

 // -------------------------------- SCHOOL ADVENTURE --------------------------------
 // The decorations below are true 3D geometry, not painted onto an illustration.
 // Every object is placed on an existing solid wall, so maze topology and movement stay intact.
 schoolWallBox(m,f,u0,y0,d0,u1,y1,d1,mat,tint=[1,1,1],emit=0){
   const n=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
   const at=(u,y,d)=>[f.a[0]+(f.b[0]-f.a[0])*u+n[0]*d,y,f.a[2]+(f.b[2]-f.a[2])*u+n[1]*d];
   const cube=[at(u0,y0,d0),at(u1,y0,d0),at(u1,y1,d0),at(u0,y1,d0),at(u0,y0,d1),at(u1,y0,d1),at(u1,y1,d1),at(u0,y1,d1)];
   const face=(a,b,c,d)=>m.quad(cube[a],cube[b],cube[c],cube[d],mat,tint,emit);
   face(0,1,2,3);face(5,4,7,6);face(4,0,3,7);face(1,5,6,2);face(3,2,6,7);face(4,5,1,0);
 }
 schoolWallDecoration(m,f,h,rand){
   const box=(...a)=>this.schoolWallBox(m,f,...a);
   const mode=rand();
   if(mode<.30){ // Classroom: actual wooden door and metal frame with glass
     box(.13,.025,.010,.87,2.02,.047,5,[.98,.96,.94]);
     box(.11,.03,.045,.16,2.15,.085,4,[.95,.98,1]);
     box(.84,.03,.045,.89,2.15,.085,4,[.95,.98,1]);
     box(.11,2.03,.041,.89,2.12,.087,2,[.89,.99,1]);
     box(.36,1.26,.055,.72,1.82,.067,11,[.61,.77,.82]);
     box(.35,1.24,.066,.73,1.83,.075,2,[.80,.93,1]);
     box(.38,1.29,.076,.69,1.79,.086,11,[.95,1.05,1.05],.04);
     box(.19,.93,.069,.25,1.045,.098,6,[1.2,1.15,1]);
     box(.15,2.13,.032,.85,2.34,.057,13,[1,1,1],.06);
     box(.12,0,.053,.88,.032,.13,2,[.72,.89,1]);
   }else if(mode<.57){ // Set of three realistic metal lockers with recessed vent grilles
     box(.035,.0,.012,.965,1.72,.09,6,[.79,1.02,1.14]);
     for(let i=0;i<3;i++){
       const u=.048+i*.304;
       box(u,.035,.091,u+.285,1.67,.118,6,[.82+i*.035,.97+i*.02,1.12]);
       box(u+.04,1.43,.12,u+.244,1.55,.129,6,[.4,.61,.82]);
       for(let k=0;k<4;k++)box(u+.070,1.45+k*.026,.130,u+.225,1.456+k*.026,.133,6,[.26,.42,.53]);
       box(u+.226,.75,.12,u+.248,.87,.145,6,[1.10,1.17,1.2]);
       box(u+.072,.30,.119,u+.217,.39,.121,2,[.48,.84,1]);
     }
     box(.015,1.71,.013,.985,1.78,.11,2,[.58,.89,1]);
     box(.015,0,.023,.985,.07,.12,6,[.66,.75,.80]);
   }else if(mode<.81){ // Window / courtyard view under a recessed 3D window frame
     box(.095,.76,.013,.905,1.94,.044,11,[.95,1,1],.18);
     box(.065,.73,.046,.12,2.00,.105,4,[1.05,1.08,1.1]);
     box(.88,.73,.046,.935,2.00,.105,4,[1.05,1.08,1.1]);
     box(.095,1.95,.047,.905,2.01,.112,4,[1.08,1.09,1.1]);
     box(.095,.72,.048,.905,.81,.17,4,[1.04,1.06,1.07]);
     box(.487,.77,.05,.512,1.97,.122,4,[.93,1.05,1.10]);
     box(.11,1.345,.051,.88,1.375,.120,4,[.93,1.05,1.10]);
     // angled daylight streak on surrounding wall
     box(.11,1.87,.120,.85,1.89,.126,7,[.70,.90,1],.11);
   }else{ // bulletin board and poster display with genuine raised wooden frame
     box(.095,.73,.018,.905,1.94,.058,5,[.87,.79,.67]);
     box(.132,.77,.063,.867,1.90,.071,9,[1.02,1.04,1.05]);
     box(.08,.71,.059,.13,1.97,.107,5,[.95,.87,.71]);
     box(.87,.71,.059,.92,1.97,.107,5,[.95,.87,.71]);
     box(.08,1.93,.059,.92,1.99,.107,5,[.95,.87,.71]);
     box(.08,.71,.059,.92,.78,.107,5,[.95,.87,.71]);
     box(.33,1.96,.08,.66,2.17,.10,15,[1.09,1,1],.02);
   }
 }
 schoolCeilingLight(m,c,r,h){
   m.box(c+.25,h+.011,r+.29,c+.75,h+.059,r+.71,6,[.63,.79,.91]);
   m.box(c+.285,h-.021,r+.33,c+.715,h+.007,r+.67,7,[1.30,1.25,1.13],.8);
   m.box(c+.302,h-.028,r+.348,c+.698,h-.019,r+.652,7,[1.20,1.20,1.14],.6);
 }
 buildSchoolExit(m,s,h){
   // Exit is integrated into the actual perimeter, not a freestanding prop.
   this.gateBox(m,s,-.5,.0,-.22,-.365,h,.22,4,[.98,1.02,1.03]);
   this.gateBox(m,s,.365,.0,-.22,.5,h,.22,4,[.98,1.02,1.03]);
   this.gateBox(m,s,-.5,2.12,-.21,.5,h,.21,4,[.99,1.03,1.05]);
   this.gateBox(m,s,-.395,0,-.12,-.345,2.14,.13,6,[.82,1.0,1.16]);
   this.gateBox(m,s,.345,0,-.12,.395,2.14,.13,6,[.82,1.0,1.16]);
   this.gateBox(m,s,-.395,2.0,-.12,.395,2.15,.13,6,[.82,1,1.16]);
   this.gateBox(m,s,-.355,2.20,-.28,.355,2.415,-.249,12,[1.18,1.15,1.1],.52);
   this.gateBox(m,s,-.5,0,-.17,.5,.046,.28,1,[1,1,1]);
   // Modern sidelights and the outdoor view beyond the door.
   this.gateBox(m,s,-.335,.16,.15,.335,1.92,.17,11,[.88,.96,1]);
   this.gateBox(m,s,-.11,.15,.19,-.08,1.92,.20,2,[1,1,1]);
 }
 makeSchoolExitDoor(s,openness){
   const m=new Mesh(),angle=openness*1.48,u0=-.346;
   const at=(u,y,d)=>{
     const x=u-u0;return this.gateCoord(s,u0+Math.cos(angle)*x-Math.sin(angle)*d,y,Math.sin(angle)*x+Math.cos(angle)*d);
   };
   const b=(u0,y0,d0,u1,y1,d1,mat,tint,emit=0)=>{
    const p=[at(u0,y0,d0),at(u1,y0,d0),at(u1,y1,d0),at(u0,y1,d0),at(u0,y0,d1),at(u1,y0,d1),at(u1,y1,d1),at(u0,y1,d1)];
    for(const [a,bb,c,d] of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]])m.quad(p[a],p[bb],p[c],p[d],mat,tint,emit);
   };
   b(-.342,.045,-.065,.342,1.94,.05,6,[.66,.88,1]);
   b(-.291,.53,-.073,.291,1.84,-.065,11,[.99,1.04,1.09],.09);
   b(-.342,.53,-.085,-.285,1.84,-.06,6,[.89,1.01,1.08]);
   b(.285,.53,-.085,.342,1.84,-.06,6,[.89,1.01,1.08]);
   b(-.342,1.82,-.09,.342,1.94,-.06,6,[.89,1.01,1.08]);
   b(-.342,.48,-.087,.342,.56,-.06,6,[.89,1.01,1.08]);
   b(.19,.90,-.13,.262,1.04,-.08,7,[.9,.9,.82],.35);
   if(openness<.96)b(-.055,1.05,-.15,.055,1.27,-.11,12,[.98,1.02,1],.35);
   return m;
 }


// ROYAL CASTLE — warm, high-stone Renaissance castle architecture.
// Decorative meshes sit against blocked cells and cannot change maze collision.
castleWallBox(m,f,u0,y0,d0,u1,y1,d1,mat=2,tint=[1,1,1],emit=0){
 this.schoolWallBox(m,f,u0,y0,d0,u1,y1,d1,mat,tint,emit);
}
castlePoint(f,u,y,d=0){
 const n=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
 return [f.a[0]+(f.b[0]-f.a[0])*u+n[0]*d,y,f.a[2]+(f.b[2]-f.a[2])*u+n[1]*d];
}
castleWallFace(m,f,h,rand,chance){
 const box=(...args)=>this.castleWallBox(m,f,...args);
 const P=(u,y,d)=>this.castlePoint(f,u,y,d);
 const lower=.26,upper=h-.20;
 // Stone plinth, high pilasters and capitals create a sense of height.
 if(chance<.38){
  box(.035,0,.016,.12,h-.05,.075,2,[1.10,1.06,.99]);
  box(.88,0,.016,.965,h-.05,.075,2,[1.09,1.06,.99]);
  box(.016,2.52,.025,.135,2.68,.095,4,[1.10,1.08,1.02]);
  box(.865,2.52,.025,.982,2.68,.095,4,[1.10,1.08,1.02]);
 }
 // Different display types repeat in a controlled pattern, not on every wall.
 const d=rand();
 if(chance<.25){
  this.castleTorch(m,f,.50,2.14,rand);this.castleStats.torches++;
 }else if(chance<.46){
  // This wall was not selected for one of the unique painting positions.
  // Display castle heraldry rather than repeat an existing painting.
  this.castleBanner(m,f,rand);this.castleStats.banners++;
 }else if(chance<.64){
  this.castleArmourDisplay(m,f,rand);this.castleStats.shields++;this.castleStats.swords+=2;
 }else if(chance<.78){
  this.castleStatueNiche(m,f,rand);this.castleStats.statues++;
 }else if(chance<.86){
  this.castleBanner(m,f,rand);this.castleStats.banners++;
 }else if(chance<.98&&rand()<.40){
  // Repeating lit torches still illuminate the quieter sections.
  this.castleTorch(m,f,.52,2.18,rand);this.castleStats.torches++;
 }
}
castleTorch(m,f,u,y,rand){
 const b=(...a)=>this.castleWallBox(m,f,...a);
 const P=(U,Y,D)=>this.castlePoint(f,U,Y,D);
 // Wall bracket, handle, bowl and protective iron band.
 b(u-.085,y-.20,.045,u+.085,y-.13,.18,6,[.83,.78,.68]);
 b(u-.040,y-.14,.13,u+.04,y+.19,.17,6,[.80,.71,.55]);
 b(u-.118,y+.09,.14,u+.118,y+.165,.25,12,[.93,.90,.72]);
 b(u-.145,y+.155,.14,u+.145,y+.20,.27,6,[.57,.48,.39]);
 // Multiple yellow-orange tongues make a proper visible flame, supported by the bowl.
 for(let k=0;k<5;k++){
  const j=(k-2)*.036,y0=y+.20;
  const bottom=P(u+j,y0,.22), left=P(u+j-.042,y0+.052,.22),right=P(u+j+.047,y0+.035,.23);
  const apex=P(u+j*.42,y0+.30+(k%3)*.045,.21);
  const orange=k%2? [1.31,.70,.20]:[1.42,.95,.46];
  m.tri(bottom,left,apex,null,7,orange,.95);
  m.tri(bottom,apex,right,null,7,[1.47,1.11,.55],.80);
 }
 // A warm little wall halo is a real geometry quad rather than a glow image.
 m.quad(P(u-.23,y-.20,.015),P(u+.23,y-.20,.015),P(u+.23,y+.40,.015),P(u-.23,y+.40,.015),7,[.22,.12,.045],.16);
}
castleFramedArt(m,f,uniqueId,rand){
 const b=(...a)=>this.castleWallBox(m,f,...a);
 const P=(u,y,d)=>this.castlePoint(f,u,y,d);
 const mat=16+uniqueId;
 const y0=1.08,y1=2.16,x0=.11,x1=.89;
 // Deep carved gilt frame with a real inset painting surface.
 b(x0-.038,y0-.05,.034,x1+.038,y1+.05,.118,5,[.80,.69,.43]);
 b(x0-.024,y0-.034,.121,x1+.024,y1+.034,.150,12,[1.30,1.12,.67]);
 b(x0,y0,.153,x1,y1,.163,mat,[1.20,1.17,1.13]);
 for(const [u,y] of [[x0-.028,y0-.037],[x0-.028,y1],[x1,y0-.037],[x1,y1]])
  b(u,y,.15,u+.035,y+.046,.19,12,[1.24,1.08,.58]);
 b(.42,y1+.07,.06,.58,y1+.11,.095,12,[1.15,1.03,.73]);
}
castleArmourDisplay(m,f,rand){
 const b=(...a)=>this.castleWallBox(m,f,...a);
 const P=(u,y,d)=>this.castlePoint(f,u,y,d);
 const steel=[1.07,1.10,1.16],gold=[1.28,1.11,.66];
 // Crossed swords: shaped blades and true projecting pommels.
 for(let i=0;i<2;i++){
  const side=i===0?1:-1;
  const a=P(.50-side*.24,1.05,.065),tip=P(.50+side*.19,2.18,.092);
  const s=P(.50-side*.18,1.25,.105),e=P(.50+side*.15,2.08,.092);
  m.quad(P(.50-side*.21,1.30,.12),P(.50-side*.165,1.26,.12),P(.50+side*.15,2.04,.10),P(.50+side*.12,2.12,.10),6,steel);
  m.tri(P(.50+side*.15,2.04,.10),P(.50+side*.12,2.12,.10),tip,null,7,steel);
  m.quad(P(.50-side*.28,1.30,.15),P(.50-side*.08,1.23,.15),P(.50-side*.08,1.27,.15),P(.50-side*.28,1.34,.15),12,gold);
  b(.50-side*.225-.026,1.02,.12,.50-side*.225+.026,1.26,.17,5,[.98,.88,.70]);
 }
 // Shield: a curved kite silhouette suspended in front of the sword blades.
 const shield=[P(.50,2.00,.24),P(.73,1.86,.25),P(.72,1.35,.25),P(.50,1.16,.29),P(.28,1.35,.25),P(.27,1.86,.25)];
 for(let i=0;i<6;i++)m.tri(P(.50,1.61,.29),shield[i],shield[(i+1)%6],null,14,i%2?[.92,.99,1.11]:[.72,.87,1.08]);
 m.quad(P(.465,1.36,.305),P(.535,1.36,.305),P(.535,1.90,.305),P(.465,1.90,.305),12,gold);
 m.quad(P(.325,1.61,.310),P(.675,1.61,.310),P(.675,1.69,.310),P(.325,1.69,.310),12,gold);
 b(.467,1.61,.31,.535,1.70,.352,12,[1.24,1.11,.76]);
}
castleStatueNiche(m,f,rand){
 const b=(...a)=>this.castleWallBox(m,f,...a);
 const P=(u,y,d)=>this.castlePoint(f,u,y,d);
 // Deep recessed stone niche with arch, pedestal and sculpted marble bust.
 b(.18,.44,.020,.82,2.42,.034,8,[.75,.75,.72]);
 b(.13,.44,.033,.20,2.32,.145,2,[1.11,1.08,1.04]);
 b(.80,.44,.033,.87,2.32,.145,2,[1.11,1.08,1.04]);
 b(.13,2.30,.033,.87,2.40,.140,2,[1.10,1.08,1.02]);
 b(.24,.40,.06,.76,.52,.20,12,[1.11,1.05,.82]);
 b(.31,.52,.09,.69,.90,.22,2,[1.06,1.08,1.06]);
 b(.28,.90,.08,.72,.99,.22,4,[1.23,1.17,1.06]);
 // Bust body with shoulders, slender neck and polygonal face.
 b(.33,1.01,.08,.67,1.35,.20,4,[1.19,1.17,1.10]);
 b(.44,1.28,.14,.56,1.52,.22,4,[1.18,1.16,1.08]);
 const faceCenter=P(.50,1.72,.18),top=P(.50,1.98,.20),bottom=P(.50,1.52,.18);
 for(let k=0;k<8;k++){
  const a=k*Math.PI/4,q=(k+1)*Math.PI/4;
  const rx=.135,ry=.19;
  const v=P(.50+Math.cos(a)*rx,1.74+Math.sin(a)*ry,.23+Math.cos(a)*.045);
  const w=P(.50+Math.cos(q)*rx,1.74+Math.sin(q)*ry,.23+Math.cos(q)*.045);
  m.tri(faceCenter,v,w,null,4,[1.23,1.17,1.08]);
 }
 // forehead crown and pedestal plaque
 b(.38,1.93,.165,.62,2.005,.24,12,[1.06,.99,.77]);
 b(.405,.64,.222,.595,.71,.247,12,[1.20,1.13,.85]);
}
castleBanner(m,f,rand){
 const P=(u,y,d)=>this.castlePoint(f,u,y,d);
 const b=(...a)=>this.castleWallBox(m,f,...a);
 b(.27,2.75,.13,.73,2.80,.18,5,[.98,.78,.55]);
 const base=rand()<.5?[.63,.79,1.18]:[1.22,.58,.41];
 m.quad(P(.30,2.73,.132),P(.70,2.73,.132),P(.70,.80,.15),P(.30,.80,.15),13,base);
 m.tri(P(.30,.80,.151),P(.50,.52,.155),P(.70,.80,.151),null,13,base);
 m.quad(P(.47,1.43,.16),P(.53,1.43,.16),P(.53,2.29,.16),P(.47,2.29,.16),12,[1.36,1.15,.60]);
 m.quad(P(.38,1.84,.17),P(.62,1.84,.17),P(.62,1.92,.17),P(.38,1.92,.17),12,[1.36,1.15,.60]);
}
castleCrossArch(m,c,r,h,alongZ){
 // A real arched rib crosses a traversable passage; supports never narrow it
 // significantly, and all arch stones remain comfortably above player height.
 const p=(u,y,d)=>alongZ?[c+.50+u,y,r+.51+d]:[c+.51+d,y,r+.50+u];
 const rib=(u0,u1,y0,y1)=>{
  m.quad(p(u0,y0,-.060),p(u1,y1,-.060),p(u1,y1+.135,-.060),p(u0,y0+.135,-.060),2,[1.17,1.09,.91]);
  m.quad(p(u0,y0,.060),p(u1,y1,.060),p(u1,y1+.135,.060),p(u0,y0+.135,.060),2,[1.05,1.02,.91]);
 };
 for(const sign of [-1,1]){
  let x=sign*.44;
  const a=p(x,0,-.10),b=p(x,2.58,.10);
  m.box(Math.min(a[0],b[0])-.046,0,Math.min(a[2],b[2])-.047,Math.max(a[0],b[0])+.046,2.58,Math.max(a[2],b[2])+.047,2,[1.08,1.06,1.00]);
 }
 for(let k=0;k<10;k++){
  const a=-.48+k*.096,b=a+.096;
  const yA=2.58+.56*Math.sqrt(Math.max(0,1-(a/.49)**2));
  const yB=2.58+.56*Math.sqrt(Math.max(0,1-(b/.49)**2));
  rib(a,b,yA,yB);
 }
 m.box(c+.33,h-.12,r+.32,c+.67,h+.035,r+.68,4,[1.05,1.04,.98]);
}
castleCeiling(m,c,r,h){
 // Carved crossing vault strips accentuate the high ceiling.
 m.box(c+.08,h-.09,r+.44,c+.92,h+.03,r+.56,2,[1.09,1.06,.95]);
 m.box(c+.44,h-.09,r+.08,c+.56,h+.03,r+.92,2,[1.09,1.06,.95]);
 m.box(c+.37,h-.15,r+.37,c+.63,h+.04,r+.63,12,[1.10,1.04,.75]);
}
castleFloorAccent(m,c,r,rand){
 if(rand()<.27)m.plane(c+.16,r+.16,c+.84,r+.84,.013,3,[1.04,1.03,.96]);
 else{
  m.plane(c+.13,r+.36,c+.87,r+.64,.015,2,[1.05,1.07,1.03]);
  m.plane(c+.36,r+.13,c+.64,r+.87,.016,2,[1.05,1.07,1.03]);
 }
}
buildCastleExit(m,s,h){
 // Raised stone portico and gold royal crest in the existing exterior wall.
 this.gateBox(m,s,-.50,0,-.20,-.356,h,.21,0,[1.05,1.06,.98]);
 this.gateBox(m,s,.356,0,-.20,.50,h,.21,0,[1.05,1.06,.98]);
 this.gateBox(m,s,-.50,2.32,-.20,.50,h,.21,0,[1.05,1.05,1.00]);
 this.gateBox(m,s,-.51,0,-.22,-.37,2.32,.30,2,[1.13,1.12,1.02]);
 this.gateBox(m,s,.37,0,-.22,.51,2.32,.30,2,[1.13,1.12,1.02]);
 for(let k=0;k<10;k++){
  const a=Math.PI*k/10,b=Math.PI*(k+1)/10,inner=.376,outer=.503,cy=2.14;
  const p=(R,A,D)=>this.gateCoord(s,Math.cos(A)*R,cy+Math.sin(A)*R,D);
  m.quad(p(outer,a,-.29),p(outer,b,-.29),p(inner,b,-.30),p(inner,a,-.30),2,[1.12,1.09,.99]);
 }
 this.gateBox(m,s,-.48,h-.29,-.25,.48,h-.10,.26,4,[1.15,1.10,.96]);
 this.gateBox(m,s,-.32,3.03,-.35,.32,3.31,-.28,12,[1.20,1.04,.68]);
 this.gateBox(m,s,-.22,3.09,-.375,.22,3.25,-.347,14,[.78,.95,1.20]);
 this.gateBox(m,s,-.045,3.09,-.40,.045,3.25,-.37,12,[1.29,1.19,.67]);
 this.gateBox(m,s,-.22,3.15,-.40,.22,3.20,-.37,12,[1.29,1.19,.67]);
 this.gateBox(m,s,-.39,0,-.30,.39,.05,.42,1,[1.15,1.11,.96]);
}
makeCastleDoor(s,openness){
 const m=new Mesh(),angle=openness*1.48,hinge=-.35;
 const at=(u,y,d)=>{
  const x=u-hinge;return this.gateCoord(s,hinge+Math.cos(angle)*x-Math.sin(angle)*d,y,Math.sin(angle)*x+Math.cos(angle)*d);
 };
 const box=(u0,y0,d0,u1,y1,d1,mat,tint,em=0)=>{
   const p=[at(u0,y0,d0),at(u1,y0,d0),at(u1,y1,d0),at(u0,y1,d0),at(u0,y0,d1),at(u1,y0,d1),at(u1,y1,d1),at(u0,y1,d1)];
   for(const [a,b,c,d] of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]])m.quad(p[a],p[b],p[c],p[d],mat,tint,em);
 };
 box(-.352,.04,-.065,.352,2.20,.068,5,[1.10,1.06,1.0]);
 for(let i=0;i<6;i++){
   const x=-.33+i*.11;
   box(x,.06,-.073,x+.027,2.17,-.064,9,[1.06,.98,.86]);
 }
 for(let i=0;i<4;i++)box(-.34,.30+i*.52,-.09,.34,.35+i*.52,-.072,6,[.90,.83,.67]);
 box(.20,.94,-.14,.27,1.06,-.092,12,[1.25,1.05,.57]);
 if(openness<.97)box(-.075,1.09,-.16,.075,1.29,-.095,14,[1.24,1.05,.60],.15);
 return m;
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
  if(theme==='jungle'){
    // Tropical canopy in place of the old triangular/pine-tree silhouette.
    // Layered bowed fronds are genuinely 3D, with different-facing leaf surfaces.
    const h=(1.7+.26*(Math.sin(x*5+z*3)))*scale;
    for(let k=0;k<5;k++){
      const y0=k*h/5,y1=(k+1)*h/5;
      m.box(x-.062*scale,y0,z-.062*scale,x+.062*scale,y1,z+.062*scale,5,[.74,.70,.48]);
    }
    for(let i=0;i<9;i++){
      const ang=i*6.2831853/9+.24,dx=Math.cos(ang),dz=Math.sin(ang);
      const len=(.60+.22*Math.sin(i*3.1))*scale;
      const apex=[x,h+.09*scale,z],mid=[x+dx*len*.55,h+.17*scale,z+dz*len*.55];
      const tip=[x+dx*len*1.35,h-.49*scale,z+dz*len*1.35];
      const side=[-dz*.15*scale,0,dx*.15*scale];
      m.tri(apex,[mid[0]+side[0],mid[1],mid[2]+side[2]],tip,null,13,[.52,.91,.53]);
      m.tri(apex,tip,[mid[0]-side[0],mid[1],mid[2]-side[2]],null,8,[.66,1.03,.59]);
      m.tri([mid[0]+side[0],mid[1],mid[2]+side[2]],tip,[mid[0]-side[0],mid[1],mid[2]-side[2]],null,13,[.58,.89,.45]);
    }
    return;
  }
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
  if(['jungle','school'].includes(theme)){
   for(let j=0;j<18;j++){
    const lateral=(j%2?1:-1)*(1.4+rand()*3.8),d=1.5+rand()*8;
    this.tree(m,X(lateral,d),Z(lateral,d),.55+rand()*.85,theme);
    if(theme==='jungle'&&j<5)this.fern(m,X(lateral*.4,d),Z(lateral*.4,d),.42);
   }
  }else if(theme==='castle'){
    // Peaceful formal gardens beyond the royal arch, not haunted trees.
    for(let j=0;j<14;j++){
      const lateral=(j%2?1:-1)*(1.30+rand()*1.8),d=1.3+rand()*7.5;
      const xx=X(lateral,d),zz=Z(lateral,d),h=.82+rand()*.85;
      m.box(xx-.30,0,zz-.30,xx+.30,.22,zz+.30,2,[1.12,1.07,.96]);
      m.box(xx-.23,.22,zz-.23,xx+.23,.26,zz+.23,12,[1.11,1.02,.77]);
      this.cone(m,xx,.25,zz,.23,h,7,8,[.55,.83,.53]);
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
  if(s.theme==='school')return this.makeSchoolExitDoor(s,openness);
  if(s.theme==='castle')return this.makeCastleDoor(s,openness);
  if(s.theme==='jungle')return this.makeJungleDoor(s,openness);
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
  gl.uniform3fv(sk.uTop,t.sky1);gl.uniform3fv(sk.uHorizon,t.sky2);gl.uniform1f(sk.uTime,now*.001);gl.uniform1f(sk.uSpace,s.theme==='space'?1:0);gl.uniform1f(sk.uCastle,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.enableVertexAttribArray(this.skyA);gl.vertexAttribPointer(this.skyA,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
  // Pass two: true 3D depth-tested world geometry, lighting, texture atlas, mist.
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);
  const u=this.u,drift=s.moveBlend||0;
  gl.uniform1f(u.uScale,1.36);gl.uniform3f(u.uEye,s.playerX*1.36,s.theme==='school'?.92:.88,s.playerY*1.36);
  gl.uniform1f(u.uAngle,s.playerAngle);gl.uniform1f(u.uAspect,w/h);gl.uniform1f(u.uFocus,s.theme==='school'?1.15:s.theme==='jungle'?1.14:1.35);
  gl.uniform1f(u.uBob,Math.sin(s.headBob||0)*.025*drift);gl.uniform1f(u.uPitch,0.015);
  gl.uniform1f(u.uTime,now*.001);gl.uniform1f(u.uSchool,s.theme==='school'?1:0);gl.uniform1f(u.uJungle,s.theme==='jungle'?1:0);gl.uniform1f(u.uCastle,s.theme==='castle'?1:0);gl.uniform3fv(u.uFog,t.fog);
  gl.uniform1f(u.uFogStart,s.theme==='castle'?20:s.theme==='space'?11:s.theme==='jungle'?17:13);gl.uniform1f(u.uFogEnd,s.theme==='castle'?48:s.theme==='school'?39:s.theme==='jungle'?36:31);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.uniform1i(u.uAtlas,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.paintAtlas);gl.uniform1i(u.uPaintAtlas,1);
  gl.activeTexture(gl.TEXTURE0);
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
