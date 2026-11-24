/* Bright Arcade / Maze Escape — ARCADE FINAL ARCADE V9
 * A complete, offline, hand-built rebuild of the Arcade WORLD (not a picture).
 * Busy winding aisles, fully modeled attractions, flashing LEDs and local artwork.
 * Only activates for the Arcade ('classic') theme. No external 3D services.
 * Uses the existing shared Maze3DRenderer to retain Maze Escape's game mechanics.
 */
(function(){'use strict';
const TAU=Math.PI*2;
const PALETTE={
 navy:[.12,.13,.23],ink:[.21,.19,.35],black:[.055,.07,.15],steel:[.72,.82,1.04],
 white:[1.28,1.30,1.27],blue:[.30,.67,1.5],cyan:[.19,1.25,1.45],pink:[1.5,.28,.96],
 orange:[1.48,.67,.20],yellow:[1.55,1.23,.32],mint:[.30,1.42,.90],lime:[.76,1.40,.32],
 purple:[.85,.39,1.55],red:[1.45,.21,.37],peach:[1.25,.80,.64],silver:[.97,1.06,1.15]
};
const C=PALETTE;
const ZONES=[
 {name:'RETRO ROW',color:C.pink,other:C.cyan,kinds:['upright','pinball','shooter','moto','whack','photo','spinner']},
 {name:'SPEED STREET',color:C.cyan,other:C.orange,kinds:['racer','moto','racer','upright','basketball','bumper','airhockey']},
 {name:'PRIZE PALACE',color:C.yellow,other:C.pink,kinds:['claw','prizes','coin','capsule','skee','wheel','claw']},
 {name:'RHYTHM CITY',color:C.purple,other:C.mint,kinds:['dance','drums','upright','shooter','dance','pinball','spinner']},
 {name:'PLAY ZONE',color:C.lime,other:C.blue,kinds:['basketball','skee','airhockey','bumper','wheel','bowling','whack']}
];
const SCREENS={upright:0,pinball:6,shooter:8,moto:9,whack:11,photo:10,spinner:12,
 racer:1,basketball:3,bumper:14,airhockey:5,claw:2,prizes:10,coin:10,capsule:10,skee:7,
 wheel:12,dance:4,drums:13,bowling:15};
const key=(r,c)=>r+','+c;
const hs=(r,c,H)=>((Math.imul(r+11,16908799)^Math.imul(c+19,2246822519)^Math.imul(H+4,3266489917))>>>0)/4294967296;
function zoneAt(c,r,H){
 const pts=[[.17,.17],[.82,.17],[.15,.82],[.83,.83],[.50,.51]];
 let z=0,best=Infinity;
 for(let i=0;i<pts.length;i++){
  const d=((c+.5)/H-pts[i][0])**2+((r+.5)/H-pts[i][1])**2;
  if(d<best){best=d;z=i;}
 }
 return z;
}
function makeLayout(maze){
 const H=maze.length,old=window.__arcadeOverdrive;
 if(old&&old.maze===maze)return old;
 const safe=(r,c)=>r>1&&c>1&&r<H-2&&c<H-2;
 const open=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&maze[r][c]===0;
 // Keep the maze tight. We widen a small number of pre-existing pinch points,
 // but never create the giant empty rectangular plazas of previous versions.
 let widened=0;
 for(let r=1;r<H-1;r++)for(let c=1;c<H-1;c++){
  if(maze[r][c]!==1)continue;
  const opposite=(open(r-1,c)&&open(r+1,c))||(open(r,c-1)&&open(r,c+1));
  if(opposite&&hs(r,c,H)<.115){maze[r][c]=0;widened++;}
 }
 // Dense banks of physical games are recessed into pre-existing SOLID wall
 // cells. The player never walks through them; all original paths stay open.
 const selected=new Map(),fronts=new Map(),counts=Array(5).fill(0),faces=[];
 for(let r=1;r<H-1;r++)for(let c=1;c<H-1;c++){
  if(maze[r][c]!==1)continue;
  const around=[[r-1,c,'n'],[r,c+1,'e'],[r+1,c,'s'],[r,c-1,'w']].filter(([rr,cc])=>open(rr,cc));
  if(!around.length)continue;
  const z=zoneAt(c,r,H),pool=ZONES[z].kinds;
  const idx=Math.floor(hs(r+13,c+29,H)*pool.length);
  const model={r,c,z,kind:pool[idx],facing:around[Math.floor(hs(r+31,c+41,H)*around.length)][2]};
  const density=H<=17?.21:H<=25?.18:.15;
  if(hs(r+47,c+73,H)<density){
   selected.set(key(r,c),model);counts[z]++;
  }
  for(const [rr,cc,side] of around){faces.push({r,c,z,side,kind:pool[Math.floor(hs(r+91,c+113,H+(side.charCodeAt(0)))*pool.length)]});}
 }
 // Guarantee plenty of special attractions in every size, and at least one
 // from every district where wall cells exist. Favor distributed locations.
 const min=H<=17?17:H<=25?32:54;
 for(const f of faces){
  if(selected.size>=min&&counts.every(n=>n>0))break;
  if(selected.has(key(f.r,f.c)))continue;
  const type=ZONES[f.z].kinds[(counts[f.z]+selected.size)%ZONES[f.z].kinds.length];
  selected.set(key(f.r,f.c),{r:f.r,c:f.c,z:f.z,kind:type,facing:f.side});counts[f.z]++;
 }
 // Four unmissable signature games, each with a purpose-built full 3D machine.
 // Put these beside early connected corridors so they are encountered in ordinary play.
 const dist=Array.from({length:H},()=>Array(H).fill(-1));
 const queue=[[1,1]];dist[1][1]=0;
 for(let qi=0;qi<queue.length;qi++){
  const [r,c]=queue[qi];for(const [dr,dc] of [[0,1],[1,0],[0,-1],[-1,0]]){
   const nr=r+dr,nc=c+dc;
   if(nr>0&&nc>0&&nr<H-1&&nc<H-1&&maze[nr][nc]===0&&dist[nr][nc]<0){dist[nr][nc]=dist[r][c]+1;queue.push([nr,nc]);}
  }
 }
 const used=new Set();
 for(const [i,kind] of ['racer','claw','basketball','dance','bumper'].entries()){
  const choices=faces.filter(f=>!used.has(key(f.r,f.c)))
   .map(f=>{const next={n:[f.r-1,f.c],e:[f.r,f.c+1],s:[f.r+1,f.c],w:[f.r,f.c-1]}[f.side];
     return {...f,steps:dist[next[0]]?.[next[1]]??-1};})
   .filter(f=>f.steps>=0&&f.steps<=Math.max(14,Math.floor(H*1.5)))
   .sort((a,b)=>Math.abs(a.steps-(2+i*4))-Math.abs(b.steps-(2+i*4))||hs(a.r,a.c,H)-hs(b.r,b.c,H));
  const f=choices[0]; if(!f)continue;
  const k=key(f.r,f.c),found=selected.get(k);
  if(found){counts[found.z]--;found.kind=kind;found.facing=f.side;counts[found.z]++;}
  else {const z=f.z;selected.set(k,{r:f.r,c:f.c,z,kind,facing:f.side});counts[z]++;}
  used.add(k);
 }

 // Real multi-bay installations occupy TWO adjacent non-walkable tiles.
 // Both fronts must face a walkable aisle; never put a car, hoop or dance pad
 // in a corridor or on top of a word/exit. Two adjacent pieces form one game.
 const grouped=[];
 const groupBooked=new Set();
 const isFeatured=k=>['racer','claw','basketball','dance','bumper','racer_pair','basketball_pair','dance_pair','bumper_pair','reserved'].includes(k);
 function groupTwo(kind,goal){
  const options=[];
  const dr={n:-1,s:1,e:0,w:0},dc={n:0,s:0,e:1,w:-1};
  for(const f of faces){
   const r=f.r,c=f.c,first=key(r,c);
   if(groupBooked.has(first))continue;
   const behind=[r+dr[f.side],c+dc[f.side]];
   const d0=dist[behind[0]]?.[behind[1]]??-1;
   if(d0<0)continue;
   for(const dir of [-1,1]){
    const rr=r+(f.side==='e'||f.side==='w'?dir:0);
    const cc=c+(f.side==='n'||f.side==='s'?dir:0);
    if(!safe(rr,cc)||maze[rr][cc]!==1)continue;
    if(groupBooked.has(key(rr,cc)))continue;
    if(!open(rr+dr[f.side],cc+dc[f.side]))continue;
    const d1=dist[rr+dr[f.side]][cc+dc[f.side]];
    if(d1<0)continue;
    const one=selected.get(first),two=selected.get(key(rr,cc));
    if((one&&isFeatured(one.kind)&&one.kind!==kind)||(two&&isFeatured(two.kind)&&two.kind!==kind))continue;
    const cost=Math.abs(Math.min(d0,d1)-goal)+Math.abs(d0-d1)*.22+hs(r+31,c+41,H)*.7;
    options.push({r,c,rr,cc,side:f.side,cost,z:f.z});
   }
  }
  options.sort((a,b)=>a.cost-b.cost);
  const best=options[0];
  if(!best)return false;
  const a=key(best.r,best.c),b=key(best.rr,best.cc);
  // Demote the one-cell version if it was elsewhere, so each signature is
  // represented by an unmistakable two-cell physical attraction.
  for(const [k,v] of selected)if(v.kind===kind&&k!==a&&k!==b)v.kind='upright';
  selected.set(a,{r:(best.r+best.rr)/2,c:(best.c+best.cc)/2,z:best.z,kind:kind+'_pair',facing:best.side,footprint:2,cells:[[best.r,best.c],[best.rr,best.cc]]});
  selected.set(b,{r:best.rr,c:best.cc,kind:'reserved',facing:best.side});
  groupBooked.add(a);groupBooked.add(b);
  grouped.push({kind:kind+'_pair',cells:[[best.r,best.c],[best.rr,best.cc]],facing:best.side});
  return true;
 }
 groupTwo('racer',5);
 groupTwo('basketball',12);
 groupTwo('dance',18);
 groupTwo('bumper',24);
 const data={maze,H,props:[...selected.values()].filter(p=>p.kind!=='reserved'),solidProps:selected,fronts,widened,counts,groups:grouped,

  artFaces:0,visibleGames:0,ledStrips:0,ceilingFixtures:0,
  zones:ZONES.map(z=>z.name)};
 window.__arcadeOverdrive=data;
 return data;
}
window.__mazeArcadeLayout=maze=>makeLayout(maze);
// All model pieces are actual triangles in the existing depth-tested WebGL
// renderer. Only display faces use the local pixel-art image atlas.
class G{
 constructor(m,x,z,angle=0){this.m=m;this.x=x;this.z=z;this.co=Math.cos(angle);this.sn=Math.sin(angle);}
 p(x,y,z){return[this.x+x*this.co-z*this.sn,y,this.z+x*this.sn+z*this.co];}
 q(a,b,c,d,mat=5,col=C.white,em=0){this.m.quad(this.p(...a),this.p(...b),this.p(...c),this.p(...d),mat,col,em);}
 tri(a,b,c,col=C.white,mat=5,em=0){this.m.tri(this.p(...a),this.p(...b),this.p(...c),null,mat,col,em);}
 box(x,y,z,X,Y,Z,col=C.ink,mat=5,em=0){
  const p=this.p.bind(this),q=(a,b,c,d)=>this.m.quad(a,b,c,d,mat,col,em);
  const a=p(x,y,z),b=p(X,y,z),c=p(X,Y,z),d=p(x,Y,z),e=p(x,y,Z),f=p(X,y,Z),g=p(X,Y,Z),h=p(x,Y,Z);
  q(e,f,g,h);q(b,a,d,c);q(a,e,h,d);q(f,b,c,g);q(d,h,g,c);q(a,b,f,e);
 }
 light(x,y,z,X,Y,Z,col=C.cyan,em=1.75){this.box(x,y,z,X,Y,Z,col,7,em);}
 tube(a,b,r,col=C.silver,em=0,n=6){
  const [x,y,z]=a,[X,Y,Z]=b,d=[X-x,Y-y,Z-z],L=Math.hypot(...d)||1,v=d.map(x=>x/L),t=Math.abs(v[1])>.87?[1,0,0]:[0,1,0];
  let u=[v[1]*t[2]-v[2]*t[1],v[2]*t[0]-v[0]*t[2],v[0]*t[1]-v[1]*t[0]];const ul=Math.hypot(...u)||1;u=u.map(x=>x/ul);
  const w=[v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0]];
  const circ=(p,t)=>p.map((v,i)=>v+r*(u[i]*Math.cos(t)+w[i]*Math.sin(t)));
  for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
   this.m.quad(circ(this.p(x,y,z),a),circ(this.p(x,y,z),b),circ(this.p(X,Y,Z),b),circ(this.p(X,Y,Z),a),em?7:5,col,em);
  }
 }
 ring(x,y,z,rad=.22,col=C.yellow,plane='xy',em=.5){
  const N=16;
  for(let k=0;k<N;k++){
   const a=k*TAU/N,b=(k+1)*TAU/N;
   const P=t=>plane==='xy'?[x+rad*Math.cos(t),y+rad*Math.sin(t),z]:[x+rad*Math.cos(t),y,z+rad*Math.sin(t)];
   this.tube(P(a),P(b),.015,col,em,4);
  }
 }
 orb(x,y,z,r=.09,col=C.yellow,em=0){
  const lat=4,lon=7;
  for(let j=0;j<lat;j++)for(let k=0;k<lon;k++){
   const P=(a,b)=>[x+r*Math.sin(a)*Math.cos(b),y+r*Math.cos(a),z+r*Math.sin(a)*Math.sin(b)];
   this.q(P(j*Math.PI/lat,k*TAU/lon),P(j*Math.PI/lat,(k+1)*TAU/lon),P((j+1)*Math.PI/lat,(k+1)*TAU/lon),P((j+1)*Math.PI/lat,k*TAU/lon),em?7:5,col,em);
  }
 }
 panel(x0,y0,z,x1,y1,id=0){
  this.box(x0-.04,y0-.05,z-.055,x1+.04,y1+.05,z+.045,C.black);
  this.q([x0,y0,z-.058],[x1,y0,z-.058],[x1,y1,z-.058],[x0,y1,z-.058],60+(id%16),C.white,.55);
 }
}
// Every model is built to fit a 1x1 SOLID tile. Floor y=0, ceiling y=3.43.
function shell(A,hue,id,low=false){
 A.box(-.435,.03,-.40,.435,1.91,.43,C.ink);
 A.box(-.425,.09,-.425,-.35,2.08,.38,hue);
 A.box(.35,.09,-.425,.425,2.08,.38,hue);
 A.box(-.44,1.85,-.47,.44,2.22,.40,hue);
 A.panel(-.35,1.94,-.485,.35,2.13,id);
 A.box(-.35,.91,-.49,.35,1.83,-.445,C.black);
 A.panel(-.31,.98,-.502,.31,1.73,id);
 A.box(-.38,.71,-.48,.38,.90,-.13,C.steel);
 for(const x of [-.24,-.03,.19])A.orb(x,.83,-.40,.040,x<0?C.pink:C.mint,.85);
 A.tube([-.32,1.87,-.49],[.32,1.87,-.49],.022,C.cyan,1.4);
 A.light(-.44,.06,-.46,.44,.115,-.42,hue,1.5);
 A.light(-.48,1.85,-.45,-.44,2.2,.27,C.mint,1.25);
 A.light(.44,1.85,-.45,.48,2.2,.27,C.pink,1.25);
 if(!low){A.box(-.30,.30,-.44,.30,.64,-.31,C.navy);A.box(-.26,.42,-.46,.26,.49,-.43,C.yellow,7,.9);}
}
function racer(A,id){
 A.box(-.45,.05,-.43,.45,.18,.44,C.navy);A.box(-.35,.18,-.42,.35,.55,-.12,C.red);
 A.box(-.38,1.21,-.43,.38,2.29,-.20,C.blue);A.panel(-.30,1.39,-.46,.30,2.10,id);
 A.box(-.43,2.25,-.43,.43,2.63,-.20,C.red);A.panel(-.34,2.32,-.465,.34,2.53,7);
 A.box(-.33,.17,.10,.33,.40,.40,C.red);A.box(-.30,.41,.21,.30,.62,.42,C.black);
 A.box(-.32,.59,.34,.32,1.19,.46,C.red);A.tube([0,.69,-.12],[0,1.13,-.25],.035,C.steel);
 A.ring(0,1.13,-.28,.145,C.steel,'xy',.7);
 A.light(-.44,.11,.35,.44,.16,.40,C.cyan,1.5);
}
function claw(A,id){
 A.box(-.44,.02,-.43,.44,.62,.42,C.pink);A.box(-.48,2.22,-.46,.48,2.61,.43,C.purple);
 A.panel(-.38,2.30,-.49,.38,2.52,id);
 for(const x of [-.4,.4])for(const z of [-.38,.37]){
  A.tube([x,.62,z],[x,2.21,z],.022,C.silver);A.light(x-.015,.67,z-.02,x+.015,2.20,z+.02,C.cyan,1.15);
 }
 for(let j=0;j<7;j++){
  const x=-.23+(j%3)*.23,z=-.2+Math.floor(j/3)*.21;
  const color=[C.mint,C.pink,C.yellow,C.orange,C.blue,C.peach,C.purple][j];
  A.orb(x,.82+(j%2)*.16,z,.115,color);A.orb(x,.97+(j%2)*.16,z,.084,color);
 }
 A.tube([.08,2.19,-.02],[.08,1.47,-.02],.015,C.steel);
 A.tube([.08,1.49,-.02],[-.03,1.29,-.04],.017,C.silver);
 A.tube([.08,1.49,-.02],[.19,1.29,-.04],.017,C.silver);
 A.box(-.32,.54,-.51,.32,.74,-.25,C.red);A.light(-.32,.68,-.52,.32,.72,-.50,C.yellow,1.8);
 A.orb(-.16,.76,-.42,.047,C.yellow,.7);A.orb(.14,.74,-.42,.04,C.mint,.9);
}
function basketball(A,id){
 A.box(-.45,.05,-.43,.45,.26,.45,C.orange);A.box(-.30,1.35,-.42,.30,2.36,-.34,C.blue);
 A.panel(-.26,1.64,-.45,.26,2.24,id);
 for(const x of [-.41,.41]){A.tube([x,.25,.37],[x,2.48,-.40],.022,C.silver);
  for(let k=0;k<5;k++)A.tube([x,.50+k*.32,.33-k*.08],[x,.50+k*.32,-.34],.008,C.steel);}
 A.box(-.32,2.38,-.44,.32,2.70,-.28,C.orange);A.panel(-.27,2.45,-.47,.27,2.64,8);
 A.ring(0,1.69,-.28,.18,C.orange,'xz',.6);
 for(const x of [-.21,.11,.28])A.orb(x,.35,.24,.10,C.orange);
 A.light(-.41,.08,.40,.41,.14,.44,C.yellow,1.4);
}
function hockey(A,id){
 A.box(-.45,.06,-.45,.45,.78,.45,C.blue);A.box(-.46,.75,-.46,.46,.87,.46,C.steel);
 A.q([-.41,.88,-.40],[.41,.88,-.40],[.41,.88,.40],[-.41,.88,.40],6,C.cyan);
 A.ring(0,.90,0,.22,C.red,'xz',.35);A.tube([0,.9,-.38],[0,.9,.38],.018,C.red);
 for(const [x,z,color] of [[-.18,-.12,C.red],[.16,.19,C.blue]]){
  A.tube([x,.92,z],[x,1.10,z],.055,color);A.orb(x,1.10,z,.06,color);
 }
 A.orb(.03,.92,0,.045,C.navy);A.tube([0,.88,-.44],[0,1.78,-.45],.03,C.steel);
 A.box(-.28,1.73,-.48,.28,2.15,-.40,C.purple);A.panel(-.22,1.82,-.51,.22,2.05,id);
 A.light(-.47,.79,-.47,.47,.86,-.45,C.cyan,1.8);
 A.light(-.47,.79,.45,.47,.86,.47,C.pink,1.8);
}
function dance(A,id){
 A.box(-.45,.02,-.45,.45,.14,.44,C.purple);A.box(-.37,.14,-.43,.37,2.36,-.28,C.navy);
 A.box(-.43,1.34,-.48,.43,2.60,-.18,C.blue);A.panel(-.35,1.46,-.51,.35,2.41,id);
 for(const x of [-.20,.20]){
  A.box(x-.19,.15,.09,x+.17,.20,.42,C.steel);
  for(const [i,[dx,dz]] of [[-.095,0],[.095,0],[0,-.10],[0,.10]].entries())
   A.light(x+dx-.048,.204,.27+dz-.045,x+dx+.048,.222,.27+dz+.045,[C.pink,C.cyan,C.yellow,C.mint][i],1.6);
 }
 for(const x of [-.29,.29])A.tube([x,.19,.08],[x,1.25,-.12],.025,C.steel);
 A.box(-.41,2.59,-.45,.41,2.90,-.21,C.pink);A.panel(-.32,2.67,-.48,.32,2.83,3);
 A.light(-.45,.04,.39,.45,.09,.43,C.pink,1.5);
}
function prizeWheel(A,id){
 A.box(-.45,.03,-.40,.45,.91,.39,C.pink);A.box(-.43,.86,-.47,.43,1.12,.37,C.purple);
 A.tube([-.37,1.05,.14],[-.37,2.44,.14],.033,C.steel);
 A.tube([.37,1.05,.14],[.37,2.44,.14],.033,C.steel);
 for(let k=0;k<12;k++){
  let a=k*TAU/12,b=(k+1)*TAU/12;
  A.tri([0,1.76,-.025],[Math.cos(a)*.42,1.76+Math.sin(a)*.42,-.025],[Math.cos(b)*.42,1.76+Math.sin(b)*.42,-.025],[C.yellow,C.pink,C.cyan,C.purple][k%4]);
 }
 A.ring(0,1.76,-.07,.44,C.yellow,'xy',1.5);
 for(let i=0;i<12;i++){let a=i*TAU/12;A.orb(Math.cos(a)*.44,1.76+Math.sin(a)*.44,-.08,.035,i%2?C.yellow:C.pink,1.5);}
 A.box(-.45,2.41,-.25,.45,2.72,.30,C.orange);A.panel(-.34,2.50,-.29,.34,2.64,id);
 A.light(-.43,.83,-.47,.43,.90,-.43,C.cyan,1.4);
}
function bumper(A,id){
 A.box(-.45,.07,-.43,.45,.22,.43,C.navy);A.box(-.41,.22,-.39,.41,.58,.39,C.cyan);
 A.box(-.28,.54,-.03,.28,.77,.32,C.blue);A.box(-.26,.75,.12,.26,1.16,.33,C.black);
 A.tube([0,.62,-.09],[0,.87,-.20],.027,C.steel);A.ring(0,.87,-.20,.14,C.silver,'xy',.5);
 for(const x of [-.31,.31]){
  A.orb(x,.45,-.34,.065,C.yellow,1.1);A.orb(x,.44,.34,.06,C.red,.8);
 }
 for(const x of [-.34,.34])for(const z of [-.32,.32])A.orb(x,.12,z,.070,C.black);
 A.tube([0,1.14,.2],[0,2.27,.20],.02,C.steel);A.orb(0,2.30,.20,.055,C.yellow,1.35);
 A.light(-.45,.23,-.43,.45,.28,-.39,C.mint,1.9);
}
function skee(A,id){
 A.box(-.43,.05,-.45,.43,.30,.45,C.orange);
 A.q([-.36,.43,.37],[.36,.43,.37],[.28,1.52,-.34],[-.28,1.52,-.34],5,C.peach);
 A.box(-.36,1.48,-.46,.36,2.39,-.29,C.blue);A.panel(-.31,1.56,-.50,.31,2.27,id);
 for(const rad of [.22,.15,.075])A.ring(0,1.84,-.51,rad,C.yellow,'xy',.65);
 for(let k=0;k<4;k++)A.orb(-.24+k*.16,.36,.24,.06,C.orange);
 A.light(-.40,.10,.40,.40,.16,.43,C.yellow,1.4);
}
function pinball(A,id){
 A.box(-.38,.05,-.44,.38,.38,.45,C.purple);
 A.q([-.32,.61,.37],[.32,.61,.37],[.27,.94,-.34],[-.27,.94,-.34],6,C.cyan);
 for(let j=0;j<6;j++)A.orb(-.23+(j%3)*.22,.73,-.18+Math.floor(j/3)*.31,.044,[C.yellow,C.cyan,C.pink][j%3],1.0);
 for(const x of [-.30,.30])for(const z of [-.33,.33])A.tube([x,.10,z],[x,.67,z],.035,C.silver);
 A.box(-.39,.89,-.46,.39,2.02,-.28,C.blue);A.panel(-.34,1.00,-.50,.34,1.92,id);
 A.light(-.39,.86,-.46,.39,.94,-.42,C.pink,1.8);
}
function prizes(A,id){
 A.box(-.43,.03,-.43,.43,.80,.43,C.pink);A.box(-.46,.80,-.47,.46,1.03,.43,C.orange);
 for(let j=0;j<3;j++){
  const y=1.14+j*.40;
  A.box(-.36,y,-.34,.36,y+.06,.34,C.steel);
  for(let k=0;k<3;k++){
   const x=-.27+k*.26;
   A.box(x-.07,y+.06,-.20,x+.07,y+.27,-.04,[C.pink,C.cyan,C.yellow][(j+k)%3]);
   A.orb(x,y+.31,-.12,.05,C.peach);
  }
 }
 A.box(-.46,2.36,-.46,.46,2.70,-.26,C.purple);A.panel(-.37,2.45,-.49,.37,2.60,id);
 A.light(-.46,.79,-.46,.46,.84,-.43,C.cyan,1.2);
}
function coin(A,id){
 A.box(-.44,.05,-.43,.44,1.06,.43,C.purple);A.box(-.44,1.05,-.43,.44,2.35,.25,C.navy);
 A.panel(-.35,1.50,-.47,.35,2.22,id);
 A.box(-.34,1.10,-.46,.34,1.42,-.25,C.blue);
 for(let j=0;j<5;j++)for(let k=0;k<3;k++){
  A.orb(-.25+j*.125,1.24,-.28+k*.12,.023,k%2?C.yellow:C.silver,.75);
 }
 A.light(-.42,.12,-.45,.42,.20,-.42,C.yellow,1.8);
 A.light(-.41,1.02,-.47,.41,1.10,-.44,C.pink,1.2);
}
function whack(A,id){
 A.box(-.43,.05,-.44,.43,.84,.44,C.orange);
 A.box(-.43,.78,-.44,.43,.88,.44,C.yellow);
 for(let j=0;j<6;j++){
  const x=-.25+(j%3)*.25,z=-.21+Math.floor(j/3)*.34;
  A.orb(x,.92,z,.10,C.navy);A.orb(x,.98,z,.077,j%2?C.pink:C.mint);
 }
 A.box(-.34,.90,-.45,.34,1.83,-.35,C.blue);A.panel(-.31,1.12,-.49,.31,1.70,id);
 A.light(-.43,.80,.40,.43,.85,.44,C.cyan,1.4);
}
function capsule(A,id){
 A.box(-.43,.03,-.43,.43,.95,.43,C.blue);
 for(let r=0;r<3;r++)for(let c=0;c<3;c++){
  const x=-.27+c*.27,y=1.14+r*.38;
  A.orb(x,y,-.18,.116,[C.pink,C.mint,C.orange,C.purple,C.yellow][(r*3+c)%5]);
  A.ring(x,y,-.32,.117,C.silver,'xy',.50);
 }
 A.box(-.44,2.32,-.43,.44,2.67,-.24,C.pink);A.panel(-.36,2.42,-.47,.36,2.57,id);
 A.light(-.43,.92,-.44,.43,1.00,-.41,C.cyan,1.4);
}
function drums(A,id){
 A.box(-.40,.05,-.43,.40,2.39,-.30,C.navy);A.panel(-.32,1.39,-.47,.32,2.26,id);
 for(const [x,z,col] of [[-.21,.2,C.red],[.21,.2,C.cyan],[-.20,-.12,C.yellow],[.20,-.12,C.pink]]){
  A.orb(x,.76,z,.15,col);A.ring(x,.78,z,.16,C.silver,'xz',.50);
  A.tube([x,.16,z],[x,.71,z],.026,C.steel);
 }
 A.light(-.40,2.38,-.43,.40,2.46,-.34,C.pink,1.6);
}
function photo(A,id){
 A.box(-.42,.03,-.43,.42,2.55,.43,C.purple);
 A.box(-.36,.20,-.46,.36,2.24,-.40,C.navy);
 A.panel(-.33,1.39,-.50,.33,2.13,id);
 A.orb(0,1.06,-.48,.18,C.steel);A.orb(0,1.06,-.51,.10,C.black);
 A.box(-.43,2.52,-.45,.43,2.83,-.30,C.pink);A.panel(-.35,2.60,-.49,.35,2.77,id);
 for(const x of [-.39,.39])A.light(x-.026,.18,-.46,x+.026,2.44,-.43,C.cyan,1.4);
}
function bowling(A,id){
 A.box(-.43,.06,-.43,.43,.34,.44,C.blue);
 for(let k=0;k<3;k++)for(let j=0;j<=k;j++){
  const x=(j-k/2)*.20,z=-.20+k*.23;
  A.tube([x,.35,z],[x,.68,z],.033,C.white);A.orb(x,.70,z,.047,C.white);
 }
 A.box(-.38,1.18,-.44,.38,2.46,-.28,C.purple);A.panel(-.33,1.37,-.48,.33,2.34,id);
 for(const x of [-.23,.05,.25])A.orb(x,.38,.35,.105,C.orange);
 A.light(-.42,.10,.40,.42,.16,.43,C.pink,1.4);
}
function shooter(A,id){
 shell(A,C.blue,id);
 A.tube([-.21,.83,-.50],[-.21,1.04,-.72],.043,C.steel);
 A.tube([.21,.83,-.50],[.21,1.04,-.72],.043,C.steel);
 for(const x of [-.21,.21])A.orb(x,1.04,-.72,.045,C.orange,.8);
}
function moto(A,id){
 A.box(-.41,.07,-.42,.41,.15,.44,C.navy);
 A.box(-.42,1.16,-.44,.42,2.35,-.25,C.red);A.panel(-.35,1.35,-.48,.35,2.18,id);
 A.box(-.23,.38,.06,.23,.65,.36,C.red);
 A.orb(0,.20,-.25,.18,C.black);A.orb(0,.20,.31,.18,C.black);
 A.tube([-.28,1.06,-.12],[.28,1.06,-.12],.028,C.steel);
 for(const x of [-.27,.27])A.tube([x,.84,-.08],[x,1.06,-.12],.025,C.steel);
 A.light(-.41,.07,.37,.41,.13,.41,C.cyan,1.3);
}
function spinner(A,id){shell(A,C.pink,id);A.ring(0,1.34,-.55,.16,C.yellow,'xy',1.15);}
const BUILDERS={upright:(a,id)=>shell(a,C.purple,id),pinball,racer,claw,basketball,airhockey:hockey,
 dance,bumper,skee,prizes,coin,whack,capsule,drums,photo,bowling,shooter,moto,spinner,wheel:prizeWheel};
function angleFor(side){return {n:0,s:Math.PI,w:Math.PI/2,e:-Math.PI/2}[side]||0;}
// Create the wall-facing artwork with true cabinet depth; no wall-mounted decals.
function wallCabinet(renderer,m,f,z,kind,id){
 const b=(...a)=>renderer.arcadeBox(m,f,...a),color=ZONES[z].color,other=ZONES[z].other;
 // Special wall-side machines have real silhouettes, not swapped signs.
 const P=(u,y,d)=>renderer.arcadeP(f,u,y,d);
 const orb=(u,y,d,r,col)=>{
  // low-poly rounded prize / basketball / vehicle wheel, facing the aisle
  const n=8;
  for(let t=0;t<n;t++){
   const a=t*TAU/n,bb=(t+1)*TAU/n;
   m.tri(P(u,y,d+r*.7),P(u+r*Math.cos(a),y+r*Math.sin(a),d),P(u+r*Math.cos(bb),y+r*Math.sin(bb),d),null,5,col,.16);
  }
 };
 const ring=(u,y,d,rad,col)=>{
  for(let j=0;j<12;j++){
   const a=j*TAU/12,bb=(j+1)*TAU/12,w=.018;
   m.quad(P(u+(rad+w)*Math.cos(a),y+(rad+w)*Math.sin(a),d),P(u+(rad+w)*Math.cos(bb),y+(rad+w)*Math.sin(bb),d),P(u+(rad-w)*Math.cos(bb),y+(rad-w)*Math.sin(bb),d),P(u+(rad-w)*Math.cos(a),y+(rad-w)*Math.sin(a),d),7,col,1.05);
  }
 };
 if(kind==='claw'||kind==='prizes'||kind==='capsule'){
  b(.08,.03,-.30,.92,.56,.32,5,C.pink);
  b(.06,2.15,-.30,.94,2.49,.34,5,C.purple);
  b(.14,2.23,.345,.86,2.41,.350,60+2,C.white,1);
  for(const x of [.11,.89])b(x-.012,.57,.25,x+.012,2.17,.30,5,C.silver);
  for(let j=0;j<6;j++)orb(.22+(j%3)*.27,.75+Math.floor(j/3)*.26,.25,.095,[C.mint,C.yellow,C.pink,C.cyan,C.orange,C.purple][j]);
  b(.48,1.20,.24,.51,1.95,.28,5,C.silver);
  b(.40,1.18,.265,.49,1.32,.28,5,C.steel);b(.51,1.18,.265,.60,1.32,.28,5,C.steel);
  b(.20,.51,.34,.80,.62,.42,5,C.red);
  b(.18,.08,.32,.82,.13,.37,7,C.cyan,1.7);return;
 }
 if(kind==='basketball'||kind==='skee'||kind==='bowling'){
  b(.06,.07,-.27,.94,.24,.41,5,C.orange);
  m.quad(P(.13,.33,.43),P(.87,.33,.43),P(.84,1.19,.05),P(.16,1.19,.05),5,C.orange,.1);
  b(.15,1.28,-.03,.85,2.13,.11,5,C.blue);
  b(.25,1.50,.13,.75,1.90,.17,5,C.white);
  if(kind==='basketball')ring(.50,1.55,.27,.19,C.orange);
  else ring(.50,1.55,.27,.26,C.yellow);
  for(let j=0;j<3;j++)orb(.25+j*.25,.35,.45,.085,C.orange);
  b(.07,2.18,-.06,.93,2.47,.12,5,C.orange);
  b(.14,2.28,.125,.86,2.40,.132,60+3,C.white,1.1);
  b(.07,.08,.40,.93,.13,.43,7,C.yellow,1.5);return;
 }
 if(kind==='dance'||kind==='drums'){
  b(.07,.06,-.23,.93,.15,.43,5,C.purple);
  for(let j=0;j<4;j++){
   const xx=.25+(j%2)*.46,dd=.17+Math.floor(j/2)*.20;
   b(xx-.17,.16,dd-.08,xx+.17,.185,dd+.075,7,[C.cyan,C.yellow,C.pink,C.mint][j],1.8);
  }
  b(.12,.38,-.22,.88,2.40,.06,5,C.ink);
  b(.17,1.25,.09,.83,2.21,.13,60+4,C.white,1.1);
  b(.10,2.28,.09,.90,2.46,.18,7,C.pink,1.6);
  b(.07,.08,.41,.93,.13,.44,7,C.cyan,1.7);return;
 }
 if(kind==='racer'||kind==='moto'||kind==='bumper'){
  b(.06,.05,-.30,.94,.29,.36,5,C.red);
  b(.20,.28,.09,.80,.50,.37,5,C.red);
  b(.30,.47,.11,.70,.90,.25,5,C.black);
  b(.16,1.22,-.20,.84,2.31,.04,5,C.blue);
  b(.21,1.35,.08,.79,2.20,.09,60+1,C.white,1.15);
  ring(.50,1.09,.32,.17,C.silver);
  orb(.12,.25,.37,.085,C.black);orb(.88,.25,.37,.085,C.black);
  b(.14,2.34,.07,.86,2.52,.14,7,C.orange,1.4);return;
 }
 b(.08,.04,-.32,.92,2.15,.08,5,C.navy);
 b(.10,.05,.08,.17,2.16,.215,5,color);
 b(.83,.05,.08,.90,2.16,.215,5,color);
 b(.13,1.80,.09,.87,2.24,.245,5,color);
 b(.18,1.88,.255,.82,2.15,.27,60+id,C.white,.65);
 b(.18,.94,.075,.82,1.78,.16,5,C.ink);
 b(.22,.99,.175,.78,1.72,.185,60+id,C.white,.6);
 b(.14,.70,.13,.86,.91,.27,5,C.steel);
 b(.16,.90,.24,.84,.945,.285,7,other,1.1);
 for(let i=0;i<3;i++)b(.23+i*.19,.83,.28,.28+i*.19,.89,.335,7,[C.yellow,C.cyan,C.pink][i],1.15);
 b(.08,.06,.22,.92,.115,.26,7,color,1.7);
 b(.08,2.20,.16,.92,2.25,.27,7,other,1.8);
 b(.06,.14,.14,.085,1.89,.205,7,color,1.3);
 b(.915,.14,.14,.94,1.89,.205,7,color,1.3);
}
function arcadeWall(renderer,m,f,z,h,rand,H){
 const layout=window.__arcadeOverdrive;
 const wc=Math.floor(Math.min(f.a[0],f.b[0])-(f.side==='e'?.5:0)+.001);
 const wr=Math.floor(Math.min(f.a[2],f.b[2])-(f.side==='s'?.5:0)+.001);
 if(layout.solidProps.has(key(wr,wc)))return; // whole cell is a real model
 const b=(...a)=>renderer.arcadeBox(m,f,...a),color=ZONES[z].color,other=ZONES[z].other;
 // Most wall faces contain a cabinet: there are NO long empty walls.
 const val=hs(wr+11,wc+21,H+f.side.charCodeAt(0));
 if(val<.84){
  const pool=ZONES[z].kinds,id=SCREENS[pool[Math.floor(val*101)%pool.length]];
  wallCabinet(renderer,m,f,z,pool[Math.floor(val*101)%pool.length],id);
  layout.visibleGames++;renderer.arcadeStats.cabinets++;renderer.arcadeStats.gameScreens++;
 }else{
  m.quad(f.a,f.b,f.c,f.d,6,[.24,.21,.36]);
  b(.06,.13,.04,.94,2.71,.10,5,C.ink);
  b(.12,1.10,.14,.88,2.10,.16,60+((wr*7+wc)%16),C.white,.62);
  b(.07,2.18,.13,.93,2.24,.21,7,color,1.7);
  b(.10,.40,.16,.90,.46,.22,7,other,1.2);
  renderer.arcadeStats.neonSigns++;
 }
 b(0,h-.42,.03,1,h-.19,.23,5,C.navy);
 b(.02,h-.23,.22,.98,h-.17,.27,7,color,1.65);
 b(.03,h-.14,.16,.97,h-.085,.22,7,other,1.6);
 b(.0,.01,.02,1,.095,.10,7,color,1.0);
 layout.ledStrips+=3;
}
function ceilingAndFloor(renderer,m,layout,h){
 const {maze,H}=layout;
 for(let r=1;r<H-1;r++)for(let c=1;c<H-1;c++){
  if(maze[r][c]!==0)continue;
  const z=zoneAt(c,r,H),color=ZONES[z].color,other=ZONES[z].other;
  const t=hs(r+3,c+2,H);
  // Continuous strips near the ceiling; alternating colours chase in real time.
  if(t<.86){
   const A=new G(m,c+.5,r+.5);
   if(t<.40){
    A.box(-.48,h-.16,-.10,.48,h+.015,.10,C.navy);
    A.light(-.47,h-.22,-.095,.47,h-.16,-.045,color,1.85);
    A.light(-.47,h-.22,.045,.47,h-.16,.095,other,1.65);
   }else if(t<.72){
    A.box(-.10,h-.16,-.48,.10,h+.015,.48,C.navy);
    A.light(-.095,h-.22,-.47,-.045,h-.16,.47,color,1.85);
    A.light(.045,h-.22,-.47,.095,h-.16,.47,other,1.65);
   }else{
    A.box(-.32,h-.17,-.33,.32,h+.015,.33,C.navy);
    for(let j=0;j<4;j++){
      const x=j%2?-.25:.25,v=j<2?-.25:.25;
      A.light(x-.045,h-.21,v-.045,x+.045,h-.165,v+.045,j%2?other:color,1.95);
    }
   }
   layout.ceilingFixtures++;
  }
  // Carpet-edge RGB outlines on select floor tiles. Recessed and safe to walk over.
  if(t<.43){
   const A=new G(m,c+.5,r+.5);
   A.light(-.43,.014,-.43,.43,.031,-.407,color,1.0);
   A.light(-.43,.014,.407,.43,.031,.43,other,1.0);
   layout.ledStrips+=2;
  }
 }
 // Hanging color zones / landmark light arches above real corridor junctions.
 for(let r=1;r<H-1;r++)for(let c=1;c<H-1;c++){
  if(maze[r][c]!==0||hs(r+17,c+67,H)>.09)continue;
  if(maze[r-1][c]===1||maze[r+1][c]===1||maze[r][c-1]===1||maze[r][c+1]===1)continue;
  const A=new G(m,c+.5,r+.5),z=zoneAt(c,r,H);
  A.tube([-.40,h-.13,-.42],[-.40,2.70,-.42],.025,C.steel);
  A.tube([.40,h-.13,-.42],[.40,2.70,-.42],.025,C.steel);
  A.box(-.43,2.64,-.46,.43,2.83,-.31,C.navy);
  A.light(-.39,2.68,-.48,.39,2.77,-.455,ZONES[z].color,1.8);
 }
}
function arcadeProps(renderer,m,layout,h){
 const stats=renderer.arcadeStats;
 for(const prop of layout.props){
  const A=new G(m,prop.c+.5,prop.r+.5,angleFor(prop.facing));
  const builder=BUILDERS[prop.kind]||BUILDERS.upright;
  const artKind=prop.kind.replace('_pair','');
  builder(A,SCREENS[artKind]??0);
  if(["racer","claw","basketball","dance","skee","pinball","airhockey"].includes(prop.kind))animatedSides(A,SCREENS[prop.kind]??0,ZONES[prop.z].color);
  const color=ZONES[prop.z].color,other=ZONES[prop.z].other;
  A.light(-.48,.007,-.45,.48,.031,-.41,color,1.2);
  A.light(-.48,.007,.41,.48,.031,.45,other,1.15);
  A.light(-.48,.007,-.44,-.44,.031,.44,other,1.1);
  A.light(.44,.007,-.44,.48,.031,.44,color,1.1);
  stats.gameScreens++;stats.cabinets++;
 }
 ceilingAndFloor(renderer,m,layout,h);
 stats.arcadeOverdriveModels=layout.props.length;
 stats.arcadeOverdriveWallGames=layout.visibleGames;
 stats.arcadeOverdriveCeilings=layout.ceilingFixtures;
 stats.arcadeOverdriveLEDs=layout.ledStrips;
}
// V6: attractions must read as their actual game, from the first-person aisle.
function showTitle(A,id,hue,top=2.45){
 A.box(-.45,top-.06,-.455,.45,top+.31,-.205,hue);
 A.panel(-.38,top+.015,-.494,.38,top+.23,id);
 A.light(-.44,top-.05,-.485,.44,top-.005,-.45,C.white,1.5);
 for(const x of [-.435,.435])A.light(x-.018,top-.02,-.43,x+.018,top+.25,-.37,C.cyan,1.4);
}
function score(A,id,x0=-.32,x1=.32,y=1.75,z=.345){
 A.box(x0-.045,y-.045,z-.04,x1+.045,y+.40,z+.055,C.black);
 A.panel(x0,y,z-.06,x1,y+.34,id);
}
function racingCockpit(A,id){
 // Seat and a three-dimensional steering wheel are in FRONT of the glowing screen.
 A.box(-.45,.04,-.43,.45,.18,.46,C.navy);
 for(const x of [-.39,.39])for(const z of [-.30,.28])A.orb(x,.16,z,.11,C.black);
 A.box(-.39,.16,-.42,.39,.34,.37,C.red);
 A.box(-.32,.34,-.41,.32,.53,-.05,C.red);
 A.box(-.28,.52,-.18,.28,1.27,.02,C.red);
 A.box(-.23,.85,-.19,.23,1.17,-.175,C.black);
 for(const x of [-.23,.23])A.tube([x,.45,-.24],[x,.86,-.07],.024,C.silver);
 // Monitor at the far end, angled toward racer.
 A.box(-.44,.96,.19,.44,2.30,.44,C.blue);
 score(A,id,-.35,.35,1.19,.195);
 A.box(-.39,2.30,.18,.39,2.45,.43,C.red);
 A.tube([0,.60,.28],[0,1.06,.09],.033,C.silver);
 A.tube([-.22,1.06,.065],[.22,1.06,.065],.022,C.silver);
 A.ring(0,1.02,.038,.19,C.silver,'xy',.78);
 for(let j=0;j<4;j++){const a=j*TAU/4;A.tube([0,1.02,.038],[.19*Math.cos(a),1.02+.19*Math.sin(a),.038],.021,C.silver);}
 A.box(-.33,.63,.13,.33,.73,.27,C.steel);
 for(let j=0;j<4;j++)A.light(-.27+j*.17,.733,.13,-.18+j*.17,.748,.22,[C.red,C.yellow,C.mint,C.cyan][j],1.7);
 showTitle(A,id,C.red,2.46);
 A.light(-.44,.08,-.43,.44,.12,-.38,C.cyan,1.5);
}
function glassClaw(A,id){
 // More realistic open crane machine: glass box, prize bed, claw rail and marquee.
 A.box(-.46,.03,-.45,.46,.18,.45,C.pink);
 A.box(-.40,.18,-.39,.40,.26,.39,C.white);
 for(const x of [-.43,.43])for(const z of [-.42,.42]){
  A.tube([x,.18,z],[x,2.18,z],.016,C.silver);
  A.light(x-.016,.24,z-.018,x+.016,2.12,z+.018,C.cyan,1.15);
 }
 // Roof frame and glass enclosure lips
 A.box(-.48,2.16,-.47,.48,2.34,.47,C.purple);
 A.box(-.43,2.04,-.42,.43,2.13,.42,C.black);
 for(const side of [-1,1]){
  A.box(side*.44,.26,-.40,side*.47,2.08,.40,C.white);
  A.box(-.40,.26,side*.40,.40,2.08,side*.43,C.white);
 }
 // Prize pile feels softer and less blocky.
 const toys=[[-.20,.74,-.14,C.mint],[.03,.72,-.05,C.pink],[.22,.76,.10,C.yellow],[-.05,.89,.16,C.peach],[.15,.90,-.18,C.orange],[-.26,.88,.08,C.cyan]];
 for(const [x,y,z,h] of toys){
  A.orb(x,y,z,.10,h);A.orb(x,y+.12,z-.01,.08,h);A.orb(x-.05,y+.20,z,.04,h);A.orb(x+.05,y+.20,z,.04,h);
  A.orb(x-.025,y+.14,z-.07,.01,C.black);A.orb(x+.025,y+.14,z-.07,.01,C.black);
 }
 // Sliding claw trolley and hanging claw.
 A.tube([-.22,2.08,-.02],[.22,2.08,-.02],.016,C.silver);
 A.box(-.05,1.98,-.08,.05,2.09,.04,C.steel);
 A.tube([0,1.98,-.02],[0,1.38,-.02],.014,C.silver);
 for(const x of [-.09,0,.09])A.tube([0,1.40,-.02],[x,1.20,-.06],.015,C.silver);
 // Front controls
 A.box(-.28,.18,-.52,.28,.42,-.28,C.red);
 A.box(-.21,.23,-.55,.20,.37,-.52,C.black);
 A.orb(-.11,.29,-.54,.035,C.yellow,.7);A.orb(.00,.29,-.54,.035,C.cyan,.7);A.orb(.11,.29,-.54,.035,C.pink,.7);
 showTitle(A,id,C.pink,2.42);
 A.light(-.44,.08,-.45,.44,.12,-.41,C.cyan,1.3);
}
function hoopLane(A,id){
 // Single realistic hoop lane for wall placements.
 A.box(-.45,.06,-.45,.45,.18,.46,C.orange);
 A.q([-.34,.24,-.42],[.34,.24,-.42],[.29,1.16,.26],[-.29,1.16,.26],7,[1.45,.78,.28],.16);
 A.q([-.29,.26,-.37],[.29,.26,-.37],[.24,1.03,.20],[-.24,1.03,.20],7,[1.18,.74,.42],.10);
 for(const x of [-.43,.43]){A.tube([x,.19,-.40],[x,2.18,.37],.022,C.silver); for(let y=.48;y<1.82;y+=.30)A.tube([x,y,-.34+(y-.48)*.25],[x,y,.31],.01,C.white);}
 A.box(-.34,1.32,.28,.34,2.20,.43,C.blue); A.box(-.26,1.48,.26,.26,1.96,.31,C.white); A.box(-.08,1.64,.25,.08,1.74,.30,C.red);
 A.ring(0,1.56,.12,.17,C.orange,'xz',.78);
 for(let j=0;j<8;j++){const a=j*TAU/8;A.tube([.17*Math.cos(a),1.53,.12+.17*Math.sin(a)],[.11*Math.cos(a),1.20,.12+.11*Math.sin(a)],.009,C.white);} 
 for(const [x,z] of [[-.18,-.27],[0,-.17],[.18,-.07]])A.orb(x,.23,z,.092,C.orange,.18);
 showTitle(A,id,C.orange,2.44);
}
function danceDance(A,id){
 // Single DDR-style machine with a more realistic angled monitor tower.
 A.box(-.45,.03,-.48,.45,.14,.49,C.navy);
 A.box(-.40,.14,-.40,.40,.20,.18,C.steel);
 for(const [x,z,color,dir] of [[0,-.28,C.pink,'up'],[-.24,-.02,C.cyan,'left'],[.24,-.02,C.yellow,'right'],[0,.18,C.mint,'down']]){
  A.light(x-.09,.205,z-.09,x+.09,.225,z+.09,color,1.8);
  const s=dir==='up'?-1:dir==='down'?1:0;
  if(s)A.tri([x,.232,z+s*.060],[x-.056,.232,z-s*.038],[x+.056,.232,z-s*.038],C.white,7,1.1);
  else A.tri([x+(dir==='left'?-.06:.06),.232,z],[x-(dir==='left'?-.05:.05),.232,z-.055],[x-(dir==='left'?-.05:.05),.232,z+.055],C.white,7,1.1);
 }
 for(const x of [-.28,.28]){A.tube([x,.18,.20],[x,.94,.28],.026,C.silver); A.tube([x,.94,.28],[x*.68,1.06,.44],.020,C.silver);} 
 A.tube([-.19,1.06,.44],[.19,1.06,.44],.024,C.silver);
 A.box(-.38,.28,.22,.38,2.10,.43,C.purple);
 A.box(-.33,1.18,.18,.33,2.00,.30,C.blue); A.panel(-.30,1.23,.16,.30,1.92,id);
 A.box(-.35,2.08,.14,.35,2.26,.39,C.black); A.panel(-.28,2.12,.12,.28,2.22,id);
 // speaker pods
 A.orb(-.26,1.00,.24,.08,C.black); A.orb(.26,1.00,.24,.08,C.black);
 showTitle(A,id,C.purple,2.34);
 A.light(-.44,.05,-.49,.44,.08,-.46,C.pink,1.6);
}
function brightSkee(A,id){
 A.box(-.45,.04,-.44,.45,.27,.45,C.orange);
 A.q([-.34,.38,-.46],[.34,.38,-.46],[.27,1.45,.22],[-.27,1.45,.22],5,C.steel);
 A.box(-.31,1.24,.26,.31,2.18,.41,C.blue);
 for(const [rad,hue] of [[.255,C.cyan],[.18,C.yellow],[.10,C.pink]])A.ring(0,1.67,.23,rad,hue,'xy',.8);
 for(const x of [-.42,.42])A.tube([x,.28,-.44],[x,1.45,.25],.032,C.orange);
 for(const x of [-.23,.06,.24])A.orb(x,.34,-.29,.07,C.orange);
 showTitle(A,id,C.orange,2.47);
}
function brightHockey(A,id){
 // Smoother air hockey with rounded corners, slimmer rails, legs and proper goals.
 A.box(-.43,.16,-.39,.43,.76,.39,[.18,.45,.68]);
 A.q([-.37,.79,-.33],[.37,.79,-.33],[.37,.79,.33],[-.37,.79,.33],7,[.22,.65,.86],.10);
 // rounded table corners
 for(const sx of [-1,1])for(const sz of [-1,1])A.orb(sx*.36,.78,sz*.32,.06,C.white,.12);
 // rails and goals
 A.box(-.46,.74,-.44,.46,.88,-.36,C.white); A.box(-.46,.74,.36,.46,.88,.44,C.white);
 A.box(-.46,.74,-.36,-.38,.88,.36,C.white); A.box(.38,.74,-.36,.46,.88,.36,C.white);
 A.box(-.12,.74,-.44,.12,.83,-.39,C.red); A.box(-.12,.74,.39,.12,.83,.44,C.red);
 A.ring(0,.80,0,.16,C.white,'xz',.7); A.tube([0,.80,-.33],[0,.80,.33],.012,C.red);
 // legs
 for(const x of [-.33,.33])for(const z of [-.26,.26])A.tube([x,.16,z],[x,.72,z],.028,C.silver);
 // paddles and puck
 for(const [x,z,h] of [[-.16,-.10,C.red],[.18,.11,C.blue]]){A.tube([x,.81,z],[x,.94,z],.05,h);A.orb(x,.94,z,.055,h,.5);}
 A.orb(.03,.81,.02,.032,C.black,.2);
 // scorebox
 A.box(-.28,1.70,-.45,.28,2.06,-.34,C.purple); A.panel(-.22,1.80,-.49,.22,1.98,id);
 showTitle(A,id,C.cyan,2.16);
 A.light(-.43,.86,-.39,.43,.89,-.35,C.cyan,1.2); A.light(-.43,.86,.35,.43,.89,.39,C.pink,1.2);
}
function overdrivePinball(A,id){
 A.box(-.38,.03,-.42,.38,.40,.39,C.purple);
 A.q([-.32,.52,-.43],[.32,.52,-.43],[.27,.96,.22],[-.27,.96,.22],6,C.blue);
 for(let j=0;j<9;j++){
  const x=-.23+(j%3)*.22,z=-.27+Math.floor(j/3)*.21;
  A.orb(x,.63+j*.025,z,.06,[C.yellow,C.pink,C.cyan][j%3],.5);
 }
 for(const x of [-.34,.34])for(const z of [-.32,.31])A.tube([x,.10,z],[x,.54,z],.033,C.silver);
 A.box(-.38,.98,.23,.38,2.26,.41,C.blue);
 score(A,id,-.33,.33,1.23,.185);
 showTitle(A,id,C.purple,2.46);
}
function animatedSides(A,id,hue){
 // Signage on the two flank faces and back: visible from any corridor approach.
 A.box(-.47,1.62,-.20,-.445,2.18,.25,C.navy);
 A.q([-.486,1.70,-.16],[-.486,1.70,.20],[-.486,2.10,.20],[-.486,2.10,-.16],60+id,C.white,1.1);
 A.box(.445,1.62,-.20,.47,2.18,.25,C.navy);
 A.q([.486,1.70,.20],[.486,1.70,-.16],[.486,2.10,-.16],[.486,2.10,.20],60+id,C.white,1.1);
 A.q([-.30,1.70,.488],[.30,1.70,.488],[.30,2.11,.488],[-.30,2.11,.488],60+id,C.white,1.0);
 A.light(-.47,.13,-.46,-.445,1.60,-.435,hue,1.25);
 A.light(.445,.13,-.46,.47,1.60,-.435,hue,1.25);
}

// V7 signature attractions are deliberately NOT generic arcade cabinets.
// All three are 2-tile-wide assembled objects (two independent real players).
// Their car noses, steering wheels, backboards, hoops, safety rails and illuminated
// directional pads remain visible even with every sign texture disabled.
function daytonaTwin(A,id){
 A.box(-.98,.03,-.48,.98,.10,.49,C.black);
 A.light(-.96,.10,-.47,.96,.14,-.44,C.cyan,1.2);
 A.light(-.96,.10,.44,.96,.14,.48,C.pink,1.2);
 // central roof canopy
 A.box(-.96,2.24,.22,.96,2.56,.48,C.red);
 A.box(-.88,2.11,.10,.88,2.24,.22,C.black);
 A.panel(-.34,2.29,.18,.34,2.47,id);
 for(let lane=0; lane<2; lane++){
  const x=lane===0?-.49:.49, hue=lane===0?C.red:C.blue, trim=lane===0?C.yellow:C.cyan;
  // base platform
  A.box(x-.40,.10,-.46,x+.40,.18,.36,C.black);
  // car body built from layered volumes and rounded nose details
  A.box(x-.26,.18,-.40,x+.26,.34,.18,hue);
  A.box(x-.22,.34,-.34,x+.22,.47,.02,hue);
  A.box(x-.18,.46,-.20,x+.18,.58,.02,hue);
  A.box(x-.17,.25,.02,x+.17,.40,.28,hue);
  A.box(x-.13,.36,.18,x+.13,.50,.30,trim);
  // rounded bumper / nose lights
  A.orb(x-.12,.31,-.38,.07,hue,.04); A.orb(x+.12,.31,-.38,.07,hue,.04);
  A.light(x-.16,.35,-.43,x-.08,.41,-.40,C.yellow,1.5);
  A.light(x+.08,.35,-.43,x+.16,.41,-.40,C.yellow,1.5);
  // wheels with hubs
  for(const side of [-1,1]) for(const z of [-.24,.20]) {A.orb(x+side*.24,.22,z,.085,C.black); A.orb(x+side*.24,.22,z,.037,C.silver);} 
  // seat shell
  A.box(x-.17,.42,-.08,x+.17,.54,.12,C.black);
  A.box(x-.13,.54,-.01,x+.13,.98,.10,C.black);
  A.box(x-.17,.60,.02,x-.11,.94,.12,hue); A.box(x+.11,.60,.02,x+.17,.94,.12,hue);
  A.box(x-.10,.96,.00,x+.10,1.08,.10,C.black);
  // dashboard and wheel
  A.box(x-.26,.63,.12,x+.26,.76,.28,C.ink);
  A.tube([x,.71,.14],[x,.96,.06],.03,C.silver);
  A.ring(x,1.00,.045,.15,C.steel,'xy',.8);
  for(let j=0;j<3;j++){const a=j*TAU/3;A.tube([x,1.00,.045],[x+.15*Math.cos(a),1.00+.15*Math.sin(a),.045],.015,C.steel);}
  // side pods / fairings
  A.box(x-.34,.28,-.06,x-.23,.46,.22,hue); A.box(x+.23,.28,-.06,x+.34,.46,.22,hue);
  // screen tower with slightly angled screen housing
  A.box(x-.34,1.18,.24,x+.34,2.24,.46,C.blue);
  A.box(x-.30,1.32,.19,x+.30,2.10,.25,C.black);
  A.panel(x-.28,1.36,.175,x+.28,2.06,id);
  A.light(x-.32,2.18,.20,x+.32,2.23,.24,trim,1.5);
  // marquee topper
  A.box(x-.25,2.42,.12,x+.25,2.52,.26,C.black); A.panel(x-.21,2.44,.08,x+.21,2.50,id);
 }
 // divider and checkered floor strip
 A.box(-.03,.10,-.44,.03,.70,.40,C.steel);
 for(let j=0;j<12;j++)A.box(-.90+j*.15,.102,-.47,-.83+j*.15,.115,-.41,j%2?C.white:C.black);
}
function twinBasketball(A,id){
 A.box(-.98,.02,-.49,.98,.10,.49,C.black);
 for(const lane of [0,1]){
  const x=lane===0?-.49:.49, trim=lane===0?C.orange:C.yellow, marquee=lane===0?C.orange:C.blue;
  // smoother return lane
  A.box(x-.43,.10,-.44,x+.43,.18,.47,C.black);
  A.q([x-.35,.22,-.40],[x+.35,.22,-.40],[x+.31,1.06,.28],[x-.31,1.06,.28],7,[1.43,.79,.31],.18);
  A.q([x-.29,.25,-.35],[x+.29,.25,-.35],[x+.24,.98,.20],[x-.24,.98,.20],7,[1.18,.74,.43],.10);
  for(const side of [-1,1]){const xx=x+side*.40;A.tube([xx,.20,-.40],[xx,2.00,.38],.020,C.silver);for(let y=.48;y<1.78;y+=.28)A.tube([xx,y,-.34+(y-.48)*.22],[xx,y,.33],.009,C.white);}
  // backboard and hoop assembly
  A.box(x-.36,1.26,.30,x+.36,2.18,.43,C.blue);
  A.box(x-.26,1.44,.27,x+.26,1.98,.31,C.white); A.box(x-.08,1.60,.255,x+.08,1.71,.30,C.red);
  A.ring(x,1.52,.12,.17,C.orange,'xz',.80);
  for(let j=0;j<10;j++){const t=j*TAU/10;A.tube([x+.17*Math.cos(t),1.50,.12+.17*Math.sin(t)],[x+.11*Math.cos(t),1.20,.12+.11*Math.sin(t)],.008,C.white);} 
  // clearer basketballs at ramp base
    A.orb(x-.18,.23,-.30,.095,C.orange,.18); A.orb(x,.23,-.20,.095,C.orange,.18); A.orb(x+.18,.23,-.10,.095,C.orange,.18);
  A.box(x-.30,2.20,.20,x+.30,2.52,.43,marquee); A.panel(x-.24,2.30,.16,x+.24,2.46,id);
  A.light(x-.40,.10,-.48,x+.40,.14,-.45,trim,1.35);
 }
 A.tube([0,.18,-.44],[0,2.28,.42],.030,C.steel);
}
function twinDance(A,id){
 A.box(-.98,.02,-.49,.98,.12,.49,C.navy);
 A.box(-.98,.12,-.48,.98,.20,.49,C.silver);
 A.light(-.98,.12,-.48,.98,.16,-.45,C.pink,1.6);
 for(let lane=0; lane<2; lane++){
  const x=lane===0?-.49:.49, neon=lane===0?C.pink:C.cyan;
  // separate pad decks
  A.box(x-.43,.18,-.42,x+.43,.24,.44,C.black);
  for(const [dx,z,color,arrow] of [[0,-.23,C.pink,'up'],[-.22,0,C.cyan,'left'],[.22,0,C.yellow,'right'],[0,.23,C.mint,'down']]){
    A.light(x+dx-.10,.245,z-.10,x+dx+.10,.27,z+.10,color,2.0);
    const dir=arrow==='up'?-1:arrow==='down'?1:0;
    if(dir)A.tri([x+dx,.278,z+dir*.070],[x+dx-.060,.278,z-dir*.040],[x+dx+.060,.278,z-dir*.040],C.white,7,1.0);
    else{const d=arrow==='left'?-1:1;A.tri([x+dx+d*.070,.278,z],[x+dx-d*.050,.278,z-.060],[x+dx-d*.050,.278,z+.060],C.white,7,1.0);} 
  }
  // rail and cabinet
  for(const side of [-1,1]){const xx=x+side*.31; A.tube([xx,.21,.30],[xx,1.04,.36],.026,C.steel);} 
  A.tube([x-.31,1.04,.36],[x+.31,1.04,.36],.026,C.steel);
  A.box(x-.36,.30,.25,x+.36,2.18,.47,C.purple);
  A.box(x-.31,1.18,.20,x+.31,2.00,.31,C.blue); A.panel(x-.28,1.24,.18,x+.28,1.92,id);
  A.orb(x-.23,1.02,.25,.075,C.black); A.orb(x+.23,1.02,.25,.075,C.black);
  A.box(x-.33,2.18,.16,x+.33,2.36,.43,C.black); A.panel(x-.26,2.22,.13,x+.26,2.32,id);
  A.light(x-.34,2.30,.27,x+.34,2.34,.36,neon,1.6);
 }
 A.light(-.96,.16,.45,.96,.20,.48,C.yellow,1.2);
}

function bumperArena(A,id){
 // Larger-feeling dodgem arena with multiple rounder cars and a proper floor enclosure.
 A.box(-.98,.03,-.49,.98,.10,.49,C.navy);
 A.q([-.90,.11,-.40],[.90,.11,-.40],[.90,.11,.40],[-.90,.11,.40],7,[.33,.27,.58],.08);
 // checker / glow floor
 for(let i=0;i<6;i++) for(let j=0;j<3;j++) if((i+j)%2===0) A.box(-.84+i*.28,.108,-.34+j*.28,-.62+i*.28,.112,-.14+j*.28,C.pink,7,.10);
 // barrier walls
 A.box(-.94,.10,-.46,.94,.30,-.38,C.pink); A.box(-.94,.10,.38,.94,.30,.46,C.cyan);
 A.box(-.94,.10,-.38,-.86,.30,.38,C.yellow); A.box(.86,.10,-.38,.94,.30,.38,C.yellow);
 for(const z of [-.42,.42])A.light(-.94,.30,z-.04,.94,.34,z+.04,C.white,1.4);
 for(const x of [-.90,.90])A.light(x-.04,.30,-.38,x+.04,.34,.38,C.mint,1.1);
 // overhead grid
 for(const x of [-.55,0,.55]){A.tube([x,.30,-.38],[x,2.02,-.38],.018,C.steel);A.tube([x,.30,.38],[x,2.02,.38],.018,C.steel);} 
 for(const z of [-.38,0,.38])A.tube([-.55,2.02,z],[.55,2.02,z],.018,C.steel);
 A.box(-.62,2.02,-.44,.62,2.18,.44,C.black); A.panel(-.40,2.06,-.48,.40,2.15,id);
 // more rounded bumper cars
 const cars=[[-.38,-.02,C.red,C.yellow],[.34,-.08,C.cyan,C.pink],[.02,.18,C.orange,C.cyan],[-.10,.02,C.lime,C.yellow]];
 for(const [cx,cz,hue,trim] of cars){
  A.box(cx-.18,.15,cz-.10,cx+.18,.23,cz+.10,trim); // rubber ring
  A.orb(cx-.11,.25,cz-.04,.10,hue,.05); A.orb(cx+.11,.25,cz-.04,.10,hue,.05);
  A.box(cx-.13,.22,cz-.08,cx+.13,.34,cz+.08,hue);
  A.box(cx-.08,.34,cz-.01,cx+.08,.47,cz+.07,C.black);
  for(const [wx,wz] of [[-.12,-.08],[.12,-.08],[-.12,.08],[.12,.08]])A.orb(cx+wx,.16,cz+wz,.045,C.black);
  A.tube([cx,.36,cz+.01],[cx,1.85,cz+.01],.015,C.steel); A.orb(cx,1.88,cz+.01,.032,trim,.8);
  A.ring(cx,.40,cz-.02,.08,C.steel,'xy',.35);
 }
}

BUILDERS.racer=racingCockpit;
BUILDERS.racer_pair=daytonaTwin;
BUILDERS.basketball_pair=twinBasketball;
BUILDERS.dance_pair=twinDance;
BUILDERS.bumper_pair=bumperArena;
BUILDERS.claw=glassClaw;
BUILDERS.basketball=hoopLane;
BUILDERS.dance=danceDance;
BUILDERS.skee=brightSkee;
BUILDERS.airhockey=brightHockey;
BUILDERS.pinball=overdrivePinball;
// All 20 attractions keep their geometry; essential attractions now use unique, legible models.

window.__arcadeOverdriveV9={makeLayout,BUILDERS,ZONES,SCREENS};
const Renderer=window.Maze3DRenderer;
if(!Renderer){console.error('Arcade Overdrive requires existing Maze3DRenderer.');return;}
const p=Renderer.prototype;
// Layout is prepared in the game's buildMaze before exit selection and word
// placement. Subsequent renderer rebuilds leave the layout unchanged.
p.arcadeCarvePlazas=function(maze,s){
 const layout=makeLayout(maze);
 layout.visibleGames=0;layout.ledStrips=0;layout.ceilingFixtures=0;
 this.arcadePlazas=[{name:'ARCADE OVERDRIVE',r:Math.floor(layout.H/2),c:Math.floor(layout.H/2),minR:0,minC:0,maxR:layout.H-1,maxC:layout.H-1}];
 this.arcadePlazaStats={rooms:1,newFloors:layout.widened};
};
p.arcadeInsidePlaza=function(){return false;};
p.arcadeWall=function(m,f,z,h,rand,H){arcadeWall(this,m,f,z,h,rand,H);};
p.arcadePlazaArchitecture=function(m,p,h,rand,H){
 const L=window.__arcadeOverdrive;if(L)arcadeProps(this,m,L,h);
};
// Make the existing wall/floor zone shader align with the five real districts.
p.arcadeZone=function(c,r,H){return zoneAt(c,r,H);};
// All game-screen textures are bundled locally; no GLB/CDN downloads.
p.loadArcadeSigns=function(){
 const image=new Image(),renderer=this;
 image.onload=()=>{
  if(!renderer.ready)return;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const ctx=canvas.getContext('2d',{alpha:false});
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
  const render=(time)=>{
   ctx.drawImage(image,0,0,1024,1024);
   const tick=Math.floor(time/(reduced?750:280));
   for(let id=0;id<16;id++){
    const ox=id%4*256,oy=Math.floor(id/4)*256;
    // Live status + colourful, continuously changing on-screen game activity.
    const pulse=(tick+id)%5;
    ctx.fillStyle=['#7bfbd1','#d1ff78','#ffe477','#6ff2ff','#ff89de'][pulse];
    ctx.beginPath();ctx.arc(ox+229,oy+93,3.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(8,19,48,0.86)';ctx.fillRect(ox+20,oy+217,ox>=0?214:214,17);
    ctx.font='bold 10px Arial, sans-serif';ctx.textBaseline='middle';
    ctx.fillStyle='#f9fdff';ctx.fillText('LIVE',ox+27,oy+225);
    ctx.fillStyle='#88ffe2';ctx.fillText('PLAYING  •  '+String((tick*17+id*57)%9999).padStart(4,'0'),ox+64,oy+225);
    // Small active sprite moves through the individual game scene.
    const x=ox+49+((tick*19+id*31)%149),y=oy+97+((tick*11+id*17)%93);
    ctx.globalAlpha=.82;
    ctx.fillStyle=['#fff27b','#7bffff','#fd89fb'][id%3];
    if(id===1||id===9||id===14){ctx.fillRect(x,y,10,5);ctx.fillRect(x-6,y+6,3,4);ctx.fillRect(x+13,y+6,3,4);}
    else if(id===4){ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
    else {ctx.fillRect(x,y,5,5);ctx.fillRect(x+6,y+5,3,3);}
    ctx.globalAlpha=1;
   }
   const gl=renderer.gl;
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,renderer.arcadeSigns);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.activeTexture(gl.TEXTURE0);
   renderer.arcadeSignsLoaded=true;
  };
  renderer.__arcadeV9Update=render;
  try{render(performance.now());}catch(e){console.error('Arcade V9 active screen loading failed',e);}
 };
 image.onerror=()=>console.error('Arcade V9 missing arcade_live_atlas_v9.png');
 image.src='assets/3d/arcade_live_atlas_v9.png';
};
const oldDraw=p.draw;
p.draw=function(now){
 if(this.__arcadeV7Update && (!this.__arcadeV7Last || now-this.__arcadeV7Last>280) && this.getState?.()?.theme==='classic'){
  try{this.__arcadeV7Update(now);this.__arcadeV7Last=now;}catch(e){if(!this.__arcadeV7Err){console.error('Arcade V8 screen animation',e);this.__arcadeV7Err=1;}}
 }
 return oldDraw.call(this,now);
};
})();
