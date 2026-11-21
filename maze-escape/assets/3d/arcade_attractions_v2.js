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
 const mid=Math.floor(H/2),r=H<=17?2:H<=25?3:4;
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

/*
 * MAZE ESCAPE — ARCADE ATTRACTIONS (2.0)
 * Walk-around physical 3D machines, not decals. Runs after arcade_upgrade.js.
 * Renderer and movement collision share the EXACT same island tile grid.
 */
(function(){'use strict';
const RR=window.Maze3DRenderer;
if(!RR||!window.__mazeArcadeLayout)return;
const p=RR.prototype, oldLayout=window.__mazeArcadeLayout,
      oldCarve=p.arcadeCarvePlazas, oldWall=p.arcadeWall,
      oldArchitecture=p.arcadePlazaArchitecture, oldDynamic=p.dynamicMesh;
const PAL={
 ink:[.12,.19,.35],shade:[.25,.29,.48],steel:[.68,.82,1.00],chrome:[1.02,1.11,1.16],
 cyan:[.20,1.25,1.48],yellow:[1.55,1.11,.23],purple:[.85,.48,1.47],
 pink:[1.46,.32,.96],lime:[.52,1.46,.44],orange:[1.55,.75,.25],red:[1.51,.28,.38],
 blue:[.25,.66,1.48],white:[1.30,1.3,1.30],mint:[.39,1.22,1.0]
};
const ZONE_GAMES=[
 ['racer','skee','racer','wheel'],
 ['claw','wheel','claw','skee'],
 ['hoops','skee','hockey','hoops'],
 ['dance','hockey','dance','claw'],
 ['bumper','hockey','wheel','bumper']
];
const roomDefs=H=>{
 const old=H<=17?{corner:4,rad:2}:H<=25?{corner:6,rad:3}:{corner:8,rad:4},
       mid=Math.floor(H/2),end=H-1-old.corner;
 return [
  {zone:0,r:old.corner,c:old.corner,rad:old.rad},
  {zone:1,r:old.corner,c:end,rad:old.rad},
  {zone:2,r:end,c:old.corner,rad:old.rad},
  {zone:3,r:end,c:end,rad:old.rad},
  {zone:4,r:mid,c:mid,rad:Math.max(2,old.rad)}
 ];
};
function getIslands(H){
 const defs=roomDefs(H),count=H<=17?2:H<=25?3:4;
 const result=[];
 for(const q of defs){
  const candidates=[[0,0],[q.r<H/2?2:-2,q.c<H/2?1:-1],[q.r<H/2?-2:2,q.c<H/2?-1:1],[0,q.c<H/2?2:-2]];
  // Central floor: use a symmetrical diagonal so the broad concourse can split around it.
  if(q.zone===4)candidates.splice(1,3,[-2,-2],[2,2],[-2,2]);
  for(let i=0;i<count;i++){
    const [dr,dc]=candidates[i],r=q.r+dr,c=q.c+dc;
    if(r<2||c<2||r>H-3||c>H-3||result.some(x=>x.r===r&&x.c===c))continue;
    result.push({r,c,zone:q.zone,kind:ZONE_GAMES[q.zone][i],anchor:i===0});
  }
 }
 return result;
}
function installIslands(maze){
 const H=maze.length,nodes=getIslands(H);
 // The islands have solid collision. They are allocated before word placement.
 for(const node of nodes)maze[node.r][node.c]=1;
 return nodes;
}
window.__mazeArcadeLayout=function(maze){
 const rooms=oldLayout(maze);installIslands(maze);return rooms;
};
p.arcadeCarvePlazas=function(maze,state){
 oldCarve.call(this,maze,state); // Deliberately retains existing connected plazas.
 const nodes=installIslands(maze);
 this.arcadeDisplayNodes=nodes;
 this.arcadeDisplaySolid=new Set(nodes.map(q=>`${q.r},${q.c}`));
 this.arcadeDisplayCount=nodes.length;
};
function faceTile(f){
 let r=Math.round(Math.min(f.a[2],f.b[2])),c=Math.round(Math.min(f.a[0],f.b[0]));
 if(f.side==='s')r--;if(f.side==='e')c--;
 return `${r},${c}`;
}
p.arcadeWall=function(m,f,zone,h,rand,H){
 // A furniture island is SOLID to the movement code, but it must NOT render
 // its opaque maze wall; four independent faces of the prop take its place.
 if(this.arcadeDisplaySolid&&this.arcadeDisplaySolid.has(faceTile(f)))return;
 // Less signage, more recognizable machines: remove the wall-wide casino collage.
 // Use a calm solid wall with an occasional windowed cabinet.
 const c=Math.floor(Math.min(f.a[0],f.b[0])),r=Math.floor(Math.min(f.a[2],f.b[2]));
 const n=(c*17+r*11+zone*5)%13;
 // Wall surfaces are deliberately understated; no old casino-style wall cabinets.
 const tone=[PAL.blue,PAL.purple,PAL.orange,PAL.cyan,PAL.pink][zone]||PAL.purple;
 m.quad(f.a,f.b,f.c,f.d,[0,6,10,0,14][zone],[.86,.83,.95]);
 const box=(...a)=>this.arcadeBox(m,f,...a);
 box(0,.02,.02,1,.14,.09,5,PAL.ink);
 box(0,h-.17,.02,1,h-.06,.10,5,PAL.shade);
 if(n%3===0)box(.04,h-.24,.095,.96,h-.205,.135,7,tone,.48);
 this.arcadeStats.walls++;
};
const TAU=Math.PI*2;
function makeModel(m,node){
 const {r,c,kind,zone}=node;
 const cx=c+.5,cz=r+.5;
 // Face the larger open concourse instead of always facing a wall.
 const ang=zone===2||zone===3?Math.PI:zone===4?Math.PI/2:0;
 const co=Math.cos(ang),si=Math.sin(ang);
 const at=(x,y,z)=>[cx+x*co-z*si,y,cz+x*si+z*co];
 const quad=(a,b,c,d,mat=5,col=PAL.steel,em=0)=>m.quad(at(...a),at(...b),at(...c),at(...d),mat,col,em);
 const cube=(x0,y0,z0,x1,y1,z1,mat=5,col=PAL.shade,em=0)=>{
  const a=[x0,y0,z0],b=[x1,y0,z0],cc=[x1,y1,z0],d=[x0,y1,z0],e=[x0,y0,z1],f=[x1,y0,z1],g=[x1,y1,z1],h=[x0,y1,z1];
  quad(e,f,g,h,mat,col,em);quad(b,a,d,cc,mat,col,em);
  quad(a,e,h,d,mat,col,em);quad(f,b,cc,g,mat,col,em);
  quad(d,h,g,cc,mat,col,em);quad(a,b,f,e,mat,col,em);
 };
 const triangle=(a,b,c,col,em=0,mat=7)=>m.tri(at(...a),at(...b),at(...c),null,mat,col,em);
 const globe=(x,y,z,rad,col,em=0)=>{
  const rings=5,steps=10,pts=[];
  for(let i=0;i<=rings;i++){
    let ph=i/rings*Math.PI,ro=Math.sin(ph)*rad,yy=y+Math.cos(ph)*rad;
    pts.push(Array.from({length:steps},(_,j)=>[x+ro*Math.cos(j*TAU/steps),yy,z+ro*Math.sin(j*TAU/steps)]));
  }
  for(let i=0;i<rings;i++)for(let j=0;j<steps;j++){
    let k=(j+1)%steps;quad(pts[i][j],pts[i][k],pts[i+1][k],pts[i+1][j],7,col,em);
  }
 };
 const loop=(x,y,z,rx,ry,col,em=.7,plane='xy')=>{
  let P=t=>plane==='xz'?[x+Math.cos(t)*rx,y,z+Math.sin(t)*ry]:[x+Math.cos(t)*rx,y+Math.sin(t)*ry,z];
  for(let i=0;i<18;i++){
   const a=i*TAU/18,b=(i+1)*TAU/18;
   const p0=P(a),p1=P(b),p2=P(a+.025);
   triangle(p0,p1,p2,col,em);
   // Three-dimensional rim made of short luminous rectangular sections.
   if(plane==='xz')cube(Math.min(p0[0],p1[0])-.023,y-.024,Math.min(p0[2],p1[2])-.023,Math.max(p0[0],p1[0])+.023,y+.024,Math.max(p0[2],p1[2])+.023,7,col,em);
   else cube(Math.min(p0[0],p1[0])-.021,Math.min(p0[1],p1[1])-.021,z-.022,Math.max(p0[0],p1[0])+.021,Math.max(p0[1],p1[1])+.021,z+.022,7,col,em);
  }
 };
 const ledbox=(x0,y0,z0,x1,y1,z1,col,em=1)=>cube(x0,y0,z0,x1,y1,z1,7,col,em);
 const screen=(x0,y0,z,x1,y1,mat)=>{
  cube(x0-.04,y0-.04,z-.045,x1+.04,y1+.04,z+.015,5,PAL.ink);
  // Front surface of a properly enclosed, physical monitor.
  quad([x0,y0,z+.019],[x1,y0,z+.019],[x1,y1,z+.019],[x0,y1,z+.019],mat,PAL.white,.36);
  ledbox(x0-.055,y0-.05,z+.025,x1+.055,y0-.024,z+.055,PAL.cyan,.85);
 };
 const chassis=(col)=>{
  cube(-.43,0,-.43,.43,.10,.43,5,PAL.shade);
  cube(-.405,.09,-.405,.405,.13,.405,7,col,.24);
 };
 const matID={racer:60,claw:61,hoops:62,dance:63,hockey:64,bumper:66,wheel:67,skee:68}[kind]||60;
 const accent={racer:PAL.cyan,claw:PAL.pink,hoops:PAL.orange,dance:PAL.purple,hockey:PAL.cyan,bumper:PAL.lime,wheel:PAL.yellow,skee:PAL.mint}[kind]||PAL.cyan;
 // Each machine is visually on top of its footprint and viewable on all four sides.
 chassis(accent);
 if(kind==='racer'){
  // A SIT-DOWN racing simulator: bucket seat, monitor, steering wheel and wheels.
  cube(-.40,.12,-.35,.40,.29,.27,5,PAL.red);
  cube(-.34,.23,.14,.34,.47,.34,5,PAL.blue);
  cube(-.31,.44,.23,.31,1.02,.32,5,PAL.blue);
  cube(-.37,.30,-.14,.37,.48,.06,5,PAL.red);
  cube(-.10,.37,-.26,.10,1.00,-.20,5,PAL.steel);
  loop(0,1.02,-.16,.19,.19,PAL.chrome,1,'xy');
  for(const x of [-.38,.38])for(const z of [-.21,.17])globe(x,.18,z,.135,PAL.ink);
  cube(-.41,1.33,-.40,.41,2.52,-.25,5,PAL.blue);
  screen(-.35,1.41,-.232,.35,2.37,60);
  cube(-.41,2.49,-.40,.41,2.82,-.24,5,PAL.blue);
  screen(-.32,2.54,-.228,.32,2.74,60);
  for(const x of [-.43,.41])ledbox(x,.42,-.41,x+.035,2.82,-.35,PAL.cyan,1.2);
 }else if(kind==='hoops'){
  // Tall enclosed arcade basketball shooting lane, backboard, REAL hoop and balls.
  for(const x of [-.4,.36])cube(x,.17,-.41,x+.04,2.74,-.38,5,PAL.steel);
  for(const x of [-.40,.36])cube(x,.17,.38,x+.04,1.15,.42,5,PAL.orange);
  quad([-.34,.32,.33],[.34,.32,.33],[.34,1.12,-.32],[-.34,1.12,-.32],6,PAL.blue);
  cube(-.33,1.75,-.425,.33,2.39,-.37,5,PAL.white);
  cube(-.21,1.89,-.36,.21,2.26,-.34,6,PAL.ink);
  loop(0,1.82,-.20,.20,.13,PAL.orange,1.1,'xz');
  for(let k=0;k<10;k++){
   const a=k*TAU/10,x=Math.cos(a)*.18,z=-.20+Math.sin(a)*.12;
   cube(x-.008,1.57,z-.008,x+.008,1.80,z+.008,7,PAL.white,.12);
  }
  for(const [x,z] of [[-.22,.22],[.12,.14],[.23,.32]])globe(x,.30,z,.095,PAL.orange);
  cube(-.43,2.52,-.45,.43,2.83,-.36,5,PAL.orange);
  screen(-.33,2.58,-.345,.33,2.76,62);
 }else if(kind==='claw'){
  // Glass-fronted crane with plushies and a visible suspended three-prong claw.
  cube(-.43,.12,-.42,.43,.74,.41,5,PAL.pink);
  for(const x of [-.41,.37])for(const z of [-.40,.35])cube(x,.74,z,x+.04,2.50,z+.05,7,PAL.cyan,.42);
  cube(-.43,2.44,-.43,.43,2.59,.42,5,PAL.pink);
  for(const col of [PAL.pink,PAL.lime,PAL.cyan,PAL.yellow,PAL.purple]){
   let i=[PAL.pink,PAL.lime,PAL.cyan,PAL.yellow,PAL.purple].indexOf(col);
   const x=-.25+(i%3)*.25,z=-.21+Math.floor(i/3)*.31;
   globe(x,1.0+(i%2)*.1,z,.15,col);
   for(const ear of [-1,1])globe(x+ear*.10,1.12+(i%2)*.1,z,.064,col);
  }
  cube(-.035,1.48,-.05,.035,2.45,.025,6,PAL.steel);
  for(const a of [-.24,.24]){
   cube(a-.028,1.32,-.08,a+.028,1.51,.03,6,PAL.chrome);
  }
  cube(-.4,.60,.40,.4,.70,.47,5,PAL.steel);
  globe(-.23,.79,.42,.058,PAL.orange,.3);
  cube(-.43,2.60,-.43,.43,2.89,.43,5,PAL.pink);
  screen(-.34,2.66,.438,.34,2.83,61);
  // Actual transparent enclosure without opaque front panes that hide prizes.
 }else if(kind==='dance'){
  // Two dance platforms with illuminated foot arrows, not a slot-style cabinet.
  cube(-.43,.10,-.32,.43,.23,.42,5,PAL.steel);
  const arrows=[[-.20,-.12,0,PAL.cyan],[.20,-.12,1,PAL.pink],[-.20,.20,2,PAL.lime],[.20,.20,3,PAL.yellow]];
  for(const [x,z,dir,col] of arrows){
   ledbox(x-.15,.235,z-.12,x+.15,.256,z+.12,col,.90);
   const ax=x,az=z;
   triangle([ax,.269,az-.075],[ax-.07,.269,az+.067],[ax+.07,.269,az+.067],PAL.white,.8);
  }
  for(const x of [-.33,.33])cube(x,.24,-.36,x+.04,1.65,-.32,5,PAL.chrome);
  cube(-.40,1.33,-.42,.40,2.48,-.26,5,PAL.purple);
  screen(-.32,1.45,-.245,.32,2.37,63);
  cube(-.39,2.50,-.43,.39,2.82,-.28,5,PAL.purple);
  screen(-.31,2.55,-.266,.31,2.74,63);
 }else if(kind==='bumper'){
  // A chunky dodgem with an unmistakable passenger seat, steering wheel, bumpers and wheels.
  cube(-.43,.14,-.35,.43,.32,.36,5,PAL.blue);
  cube(-.44,.23,-.38,.44,.40,-.22,5,PAL.lime);
  cube(-.37,.31,-.34,.37,.58,.25,5,PAL.orange);
  cube(-.34,.55,.12,.34,1.09,.29,5,PAL.blue);
  cube(-.25,.35,-.11,.25,.54,.11,5,PAL.ink);
  cube(-.04,.50,-.18,.04,.84,-.12,6,PAL.steel);
  loop(0,.87,-.06,.18,.17,PAL.chrome,1,'xy');
  for(const x of [-.42,.42])for(const z of [-.20,.20])globe(x,.22,z,.116,PAL.ink);
  for(const z of [-.38,.34]){ledbox(-.44,.22,z-.018,.44,.31,z+.018,PAL.yellow,.85);}
  cube(-.035,.28,-.34,.035,2.57,-.28,5,PAL.chrome);
  globe(0,2.56,-.31,.085,PAL.lime,1);
 }else if(kind==='hockey'){
  // Genuine WAIST-HEIGHT AIR HOCKEY TABLE, with goals, faceoff lines and paddles.
  for(const x of [-.32,.29])for(const z of [-.29,.25])cube(x,.10,z,x+.04,.83,z+.04,5,PAL.chrome);
  cube(-.43,.79,-.39,.43,.98,.39,5,PAL.blue);
  cube(-.35,.98,-.34,.35,1.015,.34,7,PAL.cyan,.22);
  loop(0,1.019,0,.19,.19,PAL.white,.9,'xz');
  ledbox(-.026,1.02,-.33,.026,1.036,.33,PAL.pink,.8);
  ledbox(-.36,1.02,-.33,.36,1.04,-.30,PAL.white,.8);
  ledbox(-.36,1.02,.30,.36,1.04,.33,PAL.white,.8);
  for(const [x,z,col] of [[-.12,-.20,PAL.red],[.14,.18,PAL.yellow]]){
   cube(x-.095,1.02,z-.09,x+.095,1.105,z+.09,5,col);
   cube(x-.035,1.105,z-.035,x+.035,1.16,z+.035,5,PAL.ink);
  }
  globe(.06,1.029,-.08,.045,PAL.orange,.7);
  for(const z of [-.41,.39])ledbox(-.36,.90,z,.36,.93,z+.025,PAL.lime,.8);
 }else if(kind==='wheel'){
  // A full-sized upright chocolate wheel with real segmented disc and indicator.
  cube(-.38,.12,-.24,.38,.35,.29,5,PAL.purple);
  cube(-.045,.33,-.16,.045,1.16,-.09,5,PAL.chrome);
  // The colour wedges are a separately rotating 3D mesh, added each frame.
  const rad=.385,z=.09;
  cube(-.405,1.17,-.01,.405,2.0,.04,5,PAL.purple);
  loop(0,1.58,z,rad,rad,PAL.yellow,.95,'xy');
  globe(0,1.58,z+.025,.06,PAL.chrome,.45);
  triangle([-.055,2.10,z+.08],[.055,2.10,z+.08],[0,1.97,z+.08],PAL.white,1.1);
  cube(-.43,2.28,-.29,.43,2.74,-.12,5,PAL.orange);
  screen(-.35,2.33,-.106,.35,2.68,67);
 }else if(kind==='skee'){
  // An inclined skee-ball lane, target rings and actual balls.
  cube(-.38,.10,-.41,.38,.22,.41,5,PAL.red);
  quad([-.30,.25,.34],[.30,.25,.34],[.27,1.10,-.33],[-.27,1.10,-.33],6,PAL.steel);
  for(const x of [-.35,.32])cube(x,.22,-.39,x+.032,1.14,.41,5,PAL.red);
  cube(-.35,1.22,-.40,.35,2.30,-.33,5,PAL.blue);
  for(const [x,y,sz] of [[0,1.86,.15],[-.18,1.61,.10],[.18,1.61,.10]]){
    loop(x,y,-.315,sz,sz,PAL.yellow,.9,'xy');
  }
  for(const x of [-.16,.13])globe(x,.31,.23,.09,PAL.orange);
  cube(-.38,2.36,-.42,.38,2.71,-.30,5,PAL.cyan);
  screen(-.31,2.40,-.276,.31,2.65,68);
 }
 // Distinct attractive physical marquee bars, not large ceiling-sign billboards.
 if(kind!=='hockey'&&kind!=='bumper'){
  for(const x of [-.435,.405])ledbox(x,.14,-.43,x+.03,2.80,-.39,accent,.60);
 }
 return {kind,zone,r,c};
}
p.arcadePlazaArchitecture=function(m,plaza,wallH,rand,H){
 // Keep hall architecture intentionally restrained: the games are the feature.
 const col=[PAL.cyan,PAL.pink,PAL.orange,PAL.purple,PAL.lime][plaza.zone]||PAL.cyan;
 const x0=plaza.minC+.10,x1=plaza.maxC+.90,z0=plaza.minR+.10,z1=plaza.maxR+.90;
 // Thin ceiling strips give direction without flooding the room in signage.
 for(const z of [z0+.10,z1-.12]){
  m.box(x0,wallH-.16,z,x1,wallH-.12,z+.052,5,PAL.shade);
  m.box(x0,wallH-.18,z+.007,x1,wallH-.155,z+.035,7,col,.80);
 }
 // Real open-floor machines are generated at their collidable tile centers.
 for(const node of this.arcadeDisplayNodes||[]){
   if(node.zone!==plaza.zone)continue;
   makeModel(m,node);
 }
 this.arcadeStats.plazas++;
};

// The wheel sectors are actual rotating triangles; the ring and pointer stay still.
// Rotation remains gentle to avoid flashing/flickering that could be uncomfortable.
p.dynamicMesh=function(s,now){
 const base=oldDynamic.call(this,s,now);
 if(s.theme!=='classic'||!this.arcadeDisplayNodes||!this.arcadeDisplayNodes.length)return base;
 const colors=[PAL.red,PAL.yellow,PAL.mint,PAL.pink,PAL.orange,PAL.cyan,PAL.purple,PAL.lime];
 const tris=[],reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const pushTri=(a,b,c,color)=>{
   const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
   const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
   let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
   const mag=Math.hypot(nx,ny,nz)||1;nx/=mag;ny/=mag;nz/=mag;
   for(const [i,p0] of [a,b,c].entries())tris.push(p0[0],p0[1],p0[2],nx,ny,nz,i===1?1:0,i===2?1:0,7,...color,.56);
 };
 for(const node of this.arcadeDisplayNodes){
   if(node.kind!=='wheel')continue;
   const cx=node.c+.5,cz=node.r+.5,ang=node.zone===2||node.zone===3?Math.PI:node.zone===4?Math.PI/2:0;
   const co=Math.cos(ang),si=Math.sin(ang),centerZ=.115;
   const at=(x,y,z)=>[cx+x*co-z*si,y,cz+x*si+z*co];
   const rotation=reduce?0:now*.00043;
   for(let i=0;i<16;i++){
     const a=i*TAU/16+rotation,b=(i+1)*TAU/16+rotation;
     pushTri(at(0,1.58,centerZ),at(Math.cos(a)*.372,1.58+Math.sin(a)*.372,centerZ),at(Math.cos(b)*.372,1.58+Math.sin(b)*.372,centerZ),colors[i%8]);
   }
 }
 const out=new Float32Array(base.length+tris.length);out.set(base);out.set(tris,base.length);return out;
};
window.__arcadeAttractionV2=true;
console.info('Maze Escape Arcade: freestanding 3D machines and true collidable showcase islands enabled.');
})();
