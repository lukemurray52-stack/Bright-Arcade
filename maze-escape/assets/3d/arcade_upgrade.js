/*
 * Bright Arcade — Maze Escape: Arcade Festival expansion
 * Version: 1.0 (2026-11)
 * Extends the existing maze3d.js WebGL renderer without touching other themes.
 * All sizeable exhibits live inside SOLID maze tiles. Walkable concourses stay clear.
 * Uses the existing per-vertex emissive material and GPU light-cycle shader.
 */
(function(){'use strict';
const TAU = Math.PI*2;
const COLORS = {
  cyan:[.20,1.20,1.37],pink:[1.35,.27,.87],gold:[1.42,.99,.26],lime:[.52,1.28,.46],
  purple:[.80,.43,1.32],ice:[.79,1.15,1.38],white:[1.15,1.16,1.20],blue:[.28,.61,1.30],
  red:[1.35,.32,.38],orange:[1.38,.68,.25],navy:[.18,.22,.41],steel:[.63,.78,.91],
  smoke:[.30,.32,.48],soft:[.73,.66,.95],teal:[.17,.92,.87]
};
const ACCENTS = [COLORS.cyan,COLORS.pink,COLORS.gold,COLORS.lime,COLORS.purple];
const ZONES = [
 {name:'RACING ARENA',short:'RACE',kind:'racer',color:COLORS.cyan},
 {name:'PRIZE PALACE',short:'PRIZES',kind:'claw',color:COLORS.pink},
 {name:'SPORTS STADIUM',short:'HOOPS',kind:'hoops',color:COLORS.orange},
 {name:'RHYTHM STAGE',short:'DANCE',kind:'dance',color:COLORS.purple},
 {name:'DODGEM & AIR HOCKEY',short:'DODGEMS',kind:'bumper',color:COLORS.lime}
];
function planRooms(H){
 const mid=Math.floor(H/2),r=H<=17?1:H<=25?2:3;
 const corner=H<=17?4:H<=25?6:8;
 const end=H-1-corner;
 return [
  {r:corner,c:corner,rad:r,name:ZONES[0].name,zone:0},
  {r:corner,c:end,rad:r,name:ZONES[1].name,zone:1},
  {r:end,c:corner,rad:r,name:ZONES[2].name,zone:2},
  {r:end,c:end,rad:r,name:ZONES[3].name,zone:3},
  {r:mid,c:mid,rad:Math.max(2,r),name:ZONES[4].name,zone:4}
 ];
}
function shapeArcade(maze){
 if(!maze||maze.length<15)return [];
 const H=maze.length,mid=Math.floor(H/2),rooms=planRooms(H);
 const clear=(r,c)=>{if(r>0&&c>0&&r<H-1&&c<H-1)maze[r][c]=0};
 const rect=(r0,c0,r1,c1)=>{for(let rr=Math.max(1,r0);rr<=Math.min(H-2,r1);rr++)for(let cc=Math.max(1,c0);cc<=Math.min(H-2,c1);cc++)clear(rr,cc)};
 const wide=(r0,c0,r1,c1,w)=>{
   const half=Math.floor(w/2);
   if(r0===r1){rect(r0-half,Math.min(c0,c1),r0+half,Math.max(c0,c1));return}
   if(c0===c1){rect(Math.min(r0,r1),c0-half,Math.max(r0,r1),c0+half);return}
   wide(r0,c0,r0,c1,w);wide(r0,c1,r1,c1,w);
 };
 for(const room of rooms){const {r,c,rad}=room;
   room.minR=Math.max(1,r-rad);room.maxR=Math.min(H-2,r+rad);
   room.minC=Math.max(1,c-rad);room.maxC=Math.min(H-2,c+rad);
   rect(room.minR,room.minC,room.maxR,room.maxC);
 }
 // A 3-tile-wide crossing is the primary wayfinding structure.
 wide(mid,2,mid,H-3,3);wide(2,mid,H-3,mid,3);
 // Every zone has a spacious connection to the central crossing, but we keep
 // side paths and alternative routes as actual maze exploration.
 for(const room of rooms.slice(0,4)){
    if(room.r<mid)wide(room.r,room.c,mid,room.c,2);
    else wide(mid,room.c,room.r,room.c,2);
 }
 // An intermittent secondary promenade connects opposite zones on larger maps.
 if(H>=25){
  const loop=Math.max(4,Math.floor(H*.22));
  wide(mid-loop,mid-loop,mid-loop,mid+loop,1);
  wide(mid+loop,mid-loop,mid+loop,mid+loop,1);
 }
 // Start in a recognisable entrance foyer, not a one-cell corridor.
 // This is particularly important for the first seconds of the experience.
 rect(1,1,4,4);wide(3,3,rooms[0].r,rooms[0].c,2);
 // Place entrances on the main route without ever opening the exterior wall.
 clear(1,1);clear(H-2,H-2);
 return rooms;
}
// Both initial maze generation and renderer rebuild call this same idempotent carve.
window.__mazeArcadeLayout = shapeArcade;
window.__mazeArcadeZones = ZONES.map(z=>z.name);

const Renderer=window.Maze3DRenderer;
if(!Renderer){console.warn('Arcade Festival: 3D renderer unavailable; wide-floor fallback remains active.');return;}
const proto=Renderer.prototype;
const originalCarve=proto.arcadeCarvePlazas;
const originalWall=proto.arcadeWall;
const originalCabinet=proto.arcadeCabinet;
const originalArchitecture=proto.arcadePlazaArchitecture;
const originalDynamic=proto.dynamicMesh;
const originalLoadArcadeSigns=proto.loadArcadeSigns;
// Use a distinct artwork atlas so the existing Arcade map and its graphics are
// not changed by installing this beta alongside the current game.
proto.loadArcadeSigns=function(){
 const image=new Image();const self=this;
 image.onload=()=>{
   if(!self.ready)return;
   try{
     const gl=self.gl;
     gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,self.arcadeSigns);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
     gl.generateMipmap(gl.TEXTURE_2D);gl.activeTexture(gl.TEXTURE0);
     self.arcadeSignsLoaded=true;
   }catch(error){console.warn('Arcade Festival: new sign atlas could not upload.',error)}
 };
 image.onerror=()=>{
   console.warn('Arcade Festival art missing; preserving original signs.');
   if(typeof originalLoadArcadeSigns==='function')originalLoadArcadeSigns.call(self);
 };
 image.src='assets/3d/classic_signs_festival.png';
};

const faceKey=f=>{
 const xs=[f.a[0],f.b[0]],zs=[f.a[2],f.b[2]];
 let c=Math.round(Math.min(...xs)),r=Math.round(Math.min(...zs));
 if(f.side==='e')c--;if(f.side==='s')r--;
 return `${r},${c},${f.side}`;
};
function span(m,x0,y0,z0,x1,y1,z1,mat=5,col=COLORS.smoke,em=0){
 m.box(Math.min(x0,x1),Math.min(y0,y1),Math.min(z0,z1),Math.max(x0,x1),Math.max(y0,y1),Math.max(z0,z1),mat,col,em);
}
function frameBox(b,u0,y0,d0,u1,y1,d1,col=COLORS.cyan,em=.85){
 b(u0,y0,d0,u1,y0+.038,d1,7,col,em);
 b(u0,y1-.038,d0,u1,y1,d1,7,col,em);
 b(u0,y0,d0,u0+.035,y1,d1,7,col,em);
 b(u1-.035,y0,d0,u1,y1,d1,7,col,em);
}
function sphere(m,x,y,z,r,col,em=0){
 // 12-faced faceted ball: unmistakably volumetric, not screen artwork.
 const rings=4,sides=8,pts=[];
 for(let i=0;i<=rings;i++){
  const phi=Math.PI*i/rings,rr=Math.sin(phi)*r,yy=y+Math.cos(phi)*r;
  const row=[];for(let j=0;j<sides;j++){
   const a=j/sides*TAU;row.push([x+rr*Math.cos(a),yy,z+rr*Math.sin(a)]);
  }pts.push(row);
 }
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
   const jj=(j+1)%sides;
   m.quad(pts[i][j],pts[i][jj],pts[i+1][jj],pts[i+1][j],7,col,em);
 }
}
function ring3D(m,cx,cy,cz,r,thickness,col,em=1,plane='xy'){
 const sides=14;
 for(let i=0;i<sides;i++){
  const a=i/sides*TAU,b=(i+1)/sides*TAU;
  const x0=cx+Math.cos(a)*r,z0=cz+Math.sin(a)*r,
        x1=cx+Math.cos(b)*r,z1=cz+Math.sin(b)*r;
  if(plane==='xy'){
   span(m,x0,cy+Math.sin(a)*r,cz,x1,cy+Math.sin(b)*r,cz+thickness,7,col,em);
  }else{
   span(m,x0,cy-.012,z0,x1,cy+.012,z1,7,col,em);
  }
 }
}
function wordSign(m,f,col=COLORS.cyan,mat=60){
 const b=(...a)=>this.arcadeBox(m,f,...a);
 b(.09,2.25,-.10,.91,2.76,.12,6,COLORS.navy);
 b(.135,2.30,.125,.865,2.69,.143,mat,COLORS.white,.42);
 frameBox(b,.10,2.27,.13,.90,2.74,.16,col,1.18);
}
function addShowcase(m,f,kind,rand,large=false){
 const b=(...a)=>this.arcadeBox(m,f,...a);
 const P=(u,y,d)=>this.arcadeP(f,u,y,d);
 const col={racer:COLORS.cyan,hoops:COLORS.orange,claw:COLORS.pink,dance:COLORS.purple,bumper:COLORS.lime,hockey:COLORS.ice,wheel:COLORS.gold,skee:COLORS.teal}[kind]||COLORS.cyan;
 const marker={racer:60,hoops:62,claw:65,dance:63,bumper:66,hockey:64,wheel:67,skee:68}[kind]||60;
 const baseD=large?-.59:-.12; // large attractions sit inside an existing SOLID wall tile
 const frontD=large?-.03:.27;
 // Every attraction has a distinct silhouette, not a row of similar slot cabinets.
 if(kind==='racer'){
    b(.12,.04,baseD,.88,.18,frontD,6,COLORS.navy);
    b(.13,.16,baseD,.86,.76,baseD+.38,5,COLORS.red);
    b(.19,.45,baseD+.21,.80,.58,frontD,5,COLORS.red);
    // Protruding racing seat and wheel pedestal.
    b(.31,.19,frontD-.14,.69,.57,frontD+.09,5,COLORS.smoke);
    b(.34,.46,frontD-.17,.66,1.13,frontD-.11,5,COLORS.blue);
    b(.47,.64,frontD+.02,.53,.95,frontD+.04,6,COLORS.steel);
    for(let k=0;k<12;k++){
      const a=k/12*TAU,x=.5+Math.cos(a)*.18,y=.87+Math.sin(a)*.18;
      b(x-.023,y-.021,frontD+.025,x+.023,y+.021,frontD+.055,7,COLORS.gold,.65);
    }
    // Wide racing screen with visible game artwork.
    b(.12,1.19,baseD-.04,.88,2.23,baseD+.10,6,COLORS.smoke);
    b(.16,1.26,baseD+.11,.84,2.16,baseD+.126,60,COLORS.white,.72);
    frameBox(b,.125,1.24,baseD+.14,.875,2.19,baseD+.17,col,1.25);
    b(.14,2.23,baseD-.08,.86,2.68,baseD+.19,5,COLORS.blue);
    b(.17,2.28,baseD+.20,.83,2.60,baseD+.219,60,COLORS.white,.46);
    for(const u of [.28,.73])b(u-.055,.14,frontD-.03,u+.055,.24,frontD+.07,7,COLORS.orange,1.1);
 }else if(kind==='hoops'){
    b(.10,.08,baseD,.90,.20,frontD,6,COLORS.smoke);
    for(const u of [.11,.86]){
      b(u,.17,baseD,u+.034,2.72,baseD+.04,5,COLORS.steel);
      for(let k=0;k<8;k++)b(u,1.08+k*.18,baseD+.04,u+.034,1.10+k*.18,frontD,6,COLORS.ice);
    }
    // Angled ball-return ramp.
    m.quad(P(.19,.85,baseD+.05),P(.81,.85,baseD+.05),P(.81,.22,frontD),P(.19,.22,frontD),6,COLORS.blue);
    b(.17,1.83,baseD-.02,.83,2.53,baseD+.05,5,COLORS.white);
    b(.26,2.03,baseD+.06,.74,2.42,baseD+.083,6,COLORS.navy);
    b(.36,1.98,baseD+.09,.64,2.02,baseD+.20,7,COLORS.orange,1.1);
    for(const u of [.32,.50,.68])sphere(m,...P(u,.34,frontD-.20),.087,COLORS.orange,.12);
    b(.19,2.57,baseD-.05,.81,2.85,baseD+.12,5,COLORS.orange);
    b(.22,2.61,baseD+.13,.78,2.80,baseD+.147,62,COLORS.white,.55);
    frameBox(b,.17,2.55,baseD+.15,.83,2.87,baseD+.17,COLORS.orange,1);
 }else if(kind==='claw'){
    b(.08,.06,baseD,.92,.64,frontD,5,COLORS.pink);
    // Transparent impression via edge glass frames and clear centre.
    for(const u of [.10,.87])b(u,.64,baseD,u+.03,2.36,frontD,7,COLORS.ice,.65);
    for(const d of [baseD+.01,frontD-.03]){
      b(.10,.64,d,.91,.68,d+.025,7,COLORS.ice,.78);
      b(.10,2.30,d,.91,2.35,d+.025,7,COLORS.ice,.78);
    }
    for(let i=0;i<7;i++){
      const u=.23+(i%4)*.17,dd=baseD+.14+Math.floor(i/4)*.20;
      sphere(m,...P(u,.85+(i%2)*.11,dd),.108,
        [COLORS.gold,COLORS.pink,COLORS.cyan,COLORS.lime][i%4]);
    }
    b(.47,1.75,baseD+.12,.53,2.28,baseD+.16,6,COLORS.steel);
    b(.38,1.71,baseD+.10,.47,1.77,baseD+.16,7,COLORS.steel);
    b(.53,1.71,baseD+.10,.62,1.77,baseD+.16,7,COLORS.steel);
    b(.15,2.34,baseD-.07,.85,2.72,frontD,5,COLORS.pink);
    b(.19,2.42,frontD+.01,.81,2.64,frontD+.025,65,COLORS.white,.55);
    frameBox(b,.12,2.33,frontD+.01,.88,2.74,frontD+.05,COLORS.cyan,1.3);
    b(.22,.49,frontD+.01,.78,.56,frontD+.08,6,COLORS.navy);
    b(.34,.56,frontD+.04,.43,.64,frontD+.12,7,COLORS.gold,.65);
 }else if(kind==='dance'){
    b(.09,.05,baseD,.91,.22,frontD,6,COLORS.smoke);
    // Four luminous raised dance pads, each with a distinct directional light.
    for(let k=0;k<4;k++){
      const u=.24+(k%2)*.27,d=baseD+.26+Math.floor(k/2)*.24;
      b(u-.105,.215,d-.10,u+.105,.238,d+.10,7,
       [COLORS.lime,COLORS.cyan,COLORS.gold,COLORS.pink][k],1.25);
      b(u-.04,.24,d-.035,u+.04,.27,d+.035,7,COLORS.white,.7);
    }
    for(const u of [.11,.86])b(u,.29,baseD,u+.026,2.59,baseD+.12,5,COLORS.purple);
    b(.17,1.12,baseD+.12,.83,2.21,baseD+.16,6,COLORS.navy);
    b(.20,1.16,baseD+.18,.80,2.17,baseD+.198,63,COLORS.white,.68);
    b(.13,2.24,baseD+.08,.87,2.62,baseD+.21,5,COLORS.purple);
    b(.18,2.31,baseD+.22,.82,2.55,baseD+.23,63,COLORS.white,.60);
    frameBox(b,.165,1.1,baseD+.21,.835,2.22,baseD+.24,COLORS.pink,1.4);
    for(let k=0;k<4;k++)b(.17+k*.17,2.67,baseD+.11,.22+k*.17,2.77,baseD+.18,7,ACCENTS[k],1.0);
 }else if(kind==='bumper'){
    // Real 3D bumper car display. Low oval bumper and tub-shaped cockpit.
    b(.09,.07,baseD,.91,.18,frontD,6,COLORS.navy);
    b(.14,.18,baseD+.05,.86,.30,frontD-.02,5,COLORS.orange);
    b(.10,.29,baseD,.90,.40,frontD+.05,7,COLORS.lime,.30);
    b(.19,.40,baseD+.04,.81,.86,frontD-.01,5,COLORS.blue);
    b(.29,.55,baseD+.12,.71,.94,baseD+.20,6,COLORS.smoke);
    b(.42,.73,frontD-.19,.58,.79,frontD-.14,6,COLORS.steel);
    b(.48,.78,frontD-.15,.52,.97,frontD-.10,6,COLORS.steel);
    sphere(m,...P(.5,1.00,frontD-.11),.095,COLORS.smoke);
    for(const u of [.21,.79]){
       b(u-.055,.13,baseD-.01,u+.055,.27,baseD+.13,6,COLORS.smoke);
       b(u-.055,.13,frontD-.04,u+.055,.27,frontD+.03,6,COLORS.smoke);
    }
    b(.17,2.24,baseD-.08,.83,2.67,baseD+.13,5,COLORS.lime);
    b(.21,2.30,baseD+.14,.79,2.60,baseD+.15,66,COLORS.white,.62);
    frameBox(b,.16,2.21,baseD+.15,.84,2.71,baseD+.18,COLORS.lime,1.2);
 }else if(kind==='hockey'){
    b(.11,.10,baseD,.89,.22,frontD,5,COLORS.steel);
    for(const u of [.22,.72]){
      b(u,.21,baseD+.08,u+.06,.79,baseD+.15,6,COLORS.smoke);
      b(u,.21,frontD-.1,u+.06,.79,frontD,6,COLORS.smoke);
    }
    b(.14,.78,baseD+.01,.86,.86,frontD,5,COLORS.cyan);
    b(.18,.87,baseD+.06,.82,.91,frontD-.04,7,COLORS.ice,.7);
    const hz=(baseD+frontD)/2;
    b(.47,.91,baseD+.10,.53,.925,frontD-.05,7,COLORS.pink,1.2);
    b(.18,.91,hz-.025,.82,.925,hz+.025,7,COLORS.white,.55);
    for(const u of [.30,.70])sphere(m,...P(u,1.0,hz+(u<.5?.13:-.15)),.07,u<.5?COLORS.orange:COLORS.pink);
    b(.17,2.15,baseD-.08,.83,2.61,baseD+.08,5,COLORS.blue);
    b(.20,2.24,baseD+.10,.80,2.53,baseD+.12,64,COLORS.white,.52);
    frameBox(b,.165,2.13,baseD+.12,.835,2.64,baseD+.14,COLORS.cyan,1.1);
 }else if(kind==='wheel'){
    // Chocolate wheel with rotating wedges added to the true 3D dynamic mesh.
    b(.16,.09,baseD,.84,.18,frontD,6,COLORS.navy);
    b(.47,.17,baseD+.05,.53,1.61,baseD+.09,5,COLORS.steel);
    b(.21,2.29,baseD-.05,.79,2.72,baseD+.12,5,COLORS.gold);
    b(.24,2.34,baseD+.13,.76,2.66,baseD+.15,67,COLORS.white,.55);
    const center=P(.5,1.55,baseD+.22);
    ring3D(m,center[0],center[1],center[2],.36,.025,COLORS.gold,1.2,'xy');
    if(!this.arcadeSpinners)this.arcadeSpinners=[];
    this.arcadeSpinners.push({a:f.a,b:f.b,side:f.side,depth:baseD+.215});
 }else if(kind==='skee'){
    b(.15,.06,baseD,.85,.21,frontD,5,COLORS.red);
    m.quad(P(.21,.24,frontD),P(.79,.24,frontD),P(.72,1.21,baseD),P(.28,1.21,baseD),5,COLORS.steel);
    for(let k=0;k<3;k++){
      const u=.33+k*.17;
      b(u-.055,1.18,baseD-.03,u+.055,1.22,baseD+.02,7,
        [COLORS.gold,COLORS.pink,COLORS.cyan][k],1.0);
    }
    b(.14,1.48,baseD-.05,.86,2.46,baseD+.055,6,COLORS.blue);
    for(let k=0;k<3;k++){
      const x=.30+k*.20;
      b(x-.12,1.70,baseD+.06,x+.12,2.17,baseD+.09,5,COLORS.gold);
      b(x-.05,1.80,baseD+.10,x+.05,2.03,baseD+.11,7,COLORS.pink,.9);
    }
    b(.16,2.49,baseD-.04,.84,2.76,baseD+.10,5,COLORS.teal);
    b(.19,2.53,baseD+.12,.81,2.69,baseD+.14,68,COLORS.white,.50);
 }
 // All exhibit bays are flanked by physically attached chasing LED strips.
 b(.05,.12,baseD-.08,.095,2.89,baseD+.08,7,col,1.18);
 b(.905,.12,baseD-.08,.95,2.89,baseD+.08,7,col,1.18);
 b(.10,2.80,baseD-.08,.90,2.86,baseD+.10,7,col,1.2);
 if(large){
   // Visible low rail denotes the collidable wall tile, preventing invisible-wall surprise.
   b(.045,.04,.035,.955,.19,.07,5,COLORS.steel);
   b(.065,.19,.07,.935,.23,.089,7,col,.65);
 }
 this.arcadeAttractionCounts=this.arcadeAttractionCounts||{};
 this.arcadeAttractionCounts[kind]=(this.arcadeAttractionCounts[kind]||0)+1;
}

proto.arcadeCarvePlazas=function(maze,s){
 const before=maze.map(r=>r.slice());
 const rooms=shapeArcade(maze);
 this.arcadePlazas=rooms;
 let removed=0;for(let r=0;r<maze.length;r++)for(let c=0;c<maze.length;c++)if(before[r][c]===1&&maze[r][c]===0)removed++;
 this.arcadePlazaStats={rooms:rooms.length,newFloors:removed};
 this.arcadeAttractionCounts={};this.arcadeSpinners=[];
 this.arcadeBooths=new Map();
 // Choose inset showcases ONLY in solid cells adjacent to spacious new rooms.
 const H=maze.length;
 const allBooths=[];
 const sideList=[[-1,0,'s'],[1,0,'n'],[0,-1,'e'],[0,1,'w']];
 const kindsPerZone=[['racer','racer','skee'],['claw','wheel','claw'],['hoops','skee','hockey'],['dance','dance','hockey'],['bumper','hockey','wheel']];
 for(const p of rooms){
   const candidates=[];
   for(let c=p.minC;c<=p.maxC;c++)for(const [rr,cc,side] of [[p.minR-1,c,'s'],[p.maxR+1,c,'n']]){
      if(rr>0&&rr<H-1&&maze[rr][cc]===1)candidates.push({r:rr,c:cc,side});
   }
   for(let r=p.minR;r<=p.maxR;r++)for(const [rr,cc,side] of [[r,p.minC-1,'e'],[r,p.maxC+1,'w']]){
      if(cc>0&&cc<H-1&&maze[rr][cc]===1)candidates.push({r:rr,c:cc,side});
   }
   const used=new Set(),wanted=H<=17?2:H<=25?3:4;
   // Spread exhibits over different walls rather than one row of identical cabinets.
   for(let q=0;q<wanted;q++){
      let best=null,bScore=-Infinity;
      for(const x of candidates){
        const id=`${x.r},${x.c}`;if(used.has(id)||this.arcadeBooths.has(`${id},${x.side}`))continue;
        const spacing=allBooths.length?Math.min(...allBooths.map(v=>(v.r-x.r)**2+(v.c-x.c)**2)):1000;
        const sideVar=(x.side.charCodeAt(0)*17+x.r*7+x.c*11)%29;
        const score=spacing+sideVar*.21+(x.side===['n','e','s','w'][q%4]?3:0);
        if(score>bScore){bScore=score;best=x;}
      }
      if(!best)break;
      used.add(`${best.r},${best.c}`);
      const kind=kindsPerZone[p.zone][q%kindsPerZone[p.zone].length];
      this.arcadeBooths.set(`${best.r},${best.c},${best.side}`,{...best,kind,zone:p.zone});
      allBooths.push(best);
   }
 }
 this.arcadeBoothSummary=allBooths.length;
};
proto.arcadeWall=function(m,f,zone,h,rand,H){
 const booth=this.arcadeBooths&&this.arcadeBooths.get(faceKey(f));
 if(!booth)return originalWall.call(this,m,f,zone,h,rand,H);
 const b=(...a)=>this.arcadeBox(m,f,...a);
 // Inset theatre; the opening is backed by a real back wall inside a solid maze cell.
 b(.03,.03,-.80,.97,3.05,-.77,6,COLORS.navy);
 b(.03,.02,-.77,.085,3.06,.02,5,COLORS.soft);
 b(.915,.02,-.77,.97,3.06,.02,5,COLORS.soft);
 b(.04,3.0,-.79,.96,3.1,.025,5,COLORS.smoke);
 b(.04,.03,-.77,.96,.11,.03,5,COLORS.smoke);
 frameBox(b,.025,.04,-.01,.975,3.08,.015,ACCENTS[booth.zone],1.0);
 addShowcase.call(this,m,f,booth.kind,rand,true);
 this.arcadeStats.walls++;
};
proto.arcadeCabinet=function(m,f,rand){
 // Cabinet shape and content vary deterministically by location and zone.
 const key=Math.round(f.a[0]*17+f.a[2]*29);
 const zone=this.arcadeZone(Math.floor((f.a[0]+f.b[0])*.5),Math.floor((f.a[2]+f.b[2])*.5),this.size);
 const kinds=[['racer','skee','hoops'],['claw','wheel','dance'],['hoops','hockey','skee'],['dance','bumper','hockey'],['bumper','racer','claw']][zone];
 const kind=kinds[Math.abs(key)%kinds.length];
 if(this.arcadeCabinetCoords)this.arcadeCabinetCoords.push({x:(f.a[0]+f.b[0])*.5,z:(f.a[2]+f.b[2])*.5,side:f.side,zone,kind});
 addShowcase.call(this,m,f,kind,rand,false);
 this.arcadeStats.cabinets++;
};
proto.arcadePlazaArchitecture=function(m,p,h,rand,H){
 originalArchitecture.call(this,m,p,h,rand,H);
 const color=ACCENTS[p.zone]||COLORS.cyan;
 const c=p.c+.5,z=p.r+.5;
 // Walkable ground murals, clearly themed and not collision objects.
 const accent=[COLORS.cyan,COLORS.pink,COLORS.orange,COLORS.purple,COLORS.lime][p.zone];
 const n=9;
 for(let i=0;i<n;i++){
   const a=i/n*TAU,b=(i+1)/n*TAU,rad=.64;
   m.tri([c,.016,z],[c+Math.cos(a)*rad,.016,z+Math.sin(a)*rad],[c+Math.cos(b)*rad,.016,z+Math.sin(b)*rad],null,7,
     i%2?COLORS.smoke:accent,.13);
 }
 ring3D(m,c,.033,z,.65,.05,color,.63,'xz');
 // Large overhead colour-changing display rails, hanging well above eye level.
 const L=p.minC+.18,R=p.maxC+.82,F=p.minR+.18,B=p.maxR+.82;
 for(const zz of [F+.08,B-.08]){
   span(m,L,h-.22,zz,R,h-.18,zz+.055,7,color,1.2);
   for(let j=0;j<8;j++){
     const x=L+(R-L)*(j+.5)/8;
     span(m,x-.05,h-.30,zz-.08,x+.05,h-.22,zz+.09,7,ACCENTS[j%ACCENTS.length],1.2);
   }
 }
 // Hanging two-sided zone marquee, anchored by steel rods to the real ceiling.
 const bannerZ=p.minR+.54,bannerL=c-.69,bannerR=c+.69;
 for(const x of [bannerL+.035,bannerR-.035]){
   span(m,x-.017,2.72,bannerZ,x+.017,h-.09,bannerZ+.046,5,COLORS.steel);
 }
 span(m,bannerL-.045,2.31,bannerZ-.09,bannerR+.045,2.83,bannerZ+.10,6,COLORS.navy);
 m.quad([bannerL,2.36,bannerZ+.105],[bannerR,2.36,bannerZ+.105],
        [bannerR,2.78,bannerZ+.105],[bannerL,2.78,bannerZ+.105],60+p.zone,COLORS.white,.55);
 m.quad([bannerR,2.36,bannerZ-.105],[bannerL,2.36,bannerZ-.105],
        [bannerL,2.78,bannerZ-.105],[bannerR,2.78,bannerZ-.105],60+p.zone,COLORS.white,.55);
 frameBox((u0,y0,d0,u1,y1,d1,mat,tint,emit)=>{
   span(m,u0,y0,d0,u1,y1,d1,mat,tint,emit);
 },bannerL-.035,2.31,bannerZ+.13,bannerR+.035,2.83,bannerZ+.155,color,1.2);
 // Glowing coloured guide arrows in four directions, built into the floor.
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const ax=c+dx*.97,az=z+dz*.97;
    span(m,ax-.09,.028,az-.09,ax+.09,.041,az+.09,7,color,.8);
 }
 this.arcadeStats.rgbFixtures+=18;
};

function appendTri(arr,a,b,c,col,emit=.9){
 let ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
 let vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
 let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
 const len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;
 const uv=[[0,0],[1,0],[.5,1]];
 for(const [i,p] of [a,b,c].entries())arr.push(p[0],p[1],p[2],nx,ny,nz,uv[i][0],uv[i][1],7,...col,emit);
}
proto.dynamicMesh=function(s,now){
 const base=originalDynamic.call(this,s,now);
 if(s.theme!=='classic'||!this.arcadeSpinners||!this.arcadeSpinners.length)return base;
 const d=[],colors=[COLORS.pink,COLORS.gold,COLORS.cyan,COLORS.lime,COLORS.purple,COLORS.orange];
 const reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 for(const item of this.arcadeSpinners.slice(0,4)){
   const ux=item.b[0]-item.a[0],uz=item.b[2]-item.a[2];
   const nx={n:0,s:0,w:-1,e:1}[item.side],nz={n:-1,s:1,w:0,e:0}[item.side];
   const depth=item.depth+.011;
   const pos=(u,y)=>[item.a[0]+ux*u+nx*depth,y,item.a[2]+uz*u+nz*depth];
   const rotation=reduce?0:now*.0014;
   const center=pos(.5,1.55),N=12;
   for(let i=0;i<N;i++){
      const aa=i/N*TAU+rotation,ab=(i+1)/N*TAU+rotation;
      const r=.34;
      appendTri(d,center,pos(.5+Math.cos(aa)*r,1.55+Math.sin(aa)*r),pos(.5+Math.cos(ab)*r,1.55+Math.sin(ab)*r),colors[i%colors.length],.6);
   }
 }
 const joined=new Float32Array(base.length+d.length);
 joined.set(base,0);joined.set(d,base.length);
 return joined;
};
window.__arcadeFestivalReady=true;
console.info('Maze Escape Arcade Festival: spacious districts, unique game attractions, emissive neon, and rotating prize wheels ready.');
})();
