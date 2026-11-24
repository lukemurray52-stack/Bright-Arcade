/* Bright Arcade – School Campus V4 (real traversable school spaces)
 * Extends Maze Escape's existing WebGL maze. No third-party libraries.
 * Only runs for the School world. Arcade V9 and other worlds are untouched.
 */
(function(){'use strict';
const names=['LIBRARY','OFFICE','SCHOOL HALL','PLAYGROUND'];
const RGB={white:[1.4,1.42,1.34],blue:[.47,.78,1.16],navy:[.17,.30,.52],sky:[.56,.94,1.31],green:[.46,.93,.43],grass:[.55,.88,.50],sand:[1.16,.94,.59],wood:[1.10,.77,.48],orange:[1.42,.72,.29],red:[1.30,.39,.33],yellow:[1.44,1.21,.48],pink:[1.34,.67,.87],purple:[.72,.59,1.20],grey:[.75,.82,.91],steel:[1.01,1.11,1.17],black:[.19,.23,.30],teal:[.40,1.12,1.06]};
const hash=(r,c,k=0)=>((Math.imul(r+129,73856093)^Math.imul(c+43,19349663)^Math.imul(k+11,83492791))>>>0)/4294967296;
function campus(maze){
 const H=maze.length;
 if(window.__schoolWorldLayout?.maze===maze)return window.__schoolWorldLayout;
 // A genuine central indoor corridor, with short branches to four dedicated
 // areas. Each area is enclosed by one-cell-thick MAZE WALLS, except for its
 // single real walkable entrance. Thus doors and collision agree exactly.
 const original=maze.map(row=>row.slice());
 const mid=(H/2)|0,quarter=Math.round((H-1)/4),last=H-1-quarter;
 const rad=H<=17?1:H<=25?2:3;
 const specs=[['library',quarter,quarter,'e'],['office',quarter,last,'w'],
              ['hall',last,quarter,'e'],['yard',last,last,'w']];
 const rooms=[],tile=new Map(),roomRings=new Set(),mainHall=new Set();
 const at=(r,c)=>r+','+c;
 // Reserve a room footprint and create physical perimeter wall cells.
 for(const [name,r,c,side] of specs){
  const rr0=r-rad,rr1=r+rad,cc0=c-rad,cc1=c+rad;
  const outer={rr0:rr0-1,rr1:rr1+1,cc0:cc0-1,cc1:cc1+1};
  const room={name,r,c,rr0,rr1,cc0,cc1,outer,tiles:[],entry:side};
  for(let row=outer.rr0;row<=outer.rr1;row++)for(let col=outer.cc0;col<=outer.cc1;col++){
   const edge=row===outer.rr0||row===outer.rr1||col===outer.cc0||col===outer.cc1;
   if(edge){maze[row][col]=1;roomRings.add(at(row,col));}
   else {maze[row][col]=0;tile.set(at(row,col),name);room.tiles.push([row,col]);}
  }
  const entrance={side,r,c:side==='e'?outer.cc1:outer.cc0};
  room.entrance=entrance;
  rooms.push(room);
 }
 // Single door opening through the wall of each room.
 for(const room of rooms){
  const {r,c}=room.entrance;maze[r][c]=0;roomRings.delete(at(r,c));
 }
 // Preserve the familiar corridor network outside the rooms and reinforce a
 // central main hallway, with a short branch ending at every real doorway.
 for(let r=1;r<H-1;r++){maze[r][mid]=0;mainHall.add(at(r,mid));}
 for(let c=1;c<=mid;c++){maze[1][c]=0;mainHall.add(at(1,c));}
 for(const room of rooms){
  const {r,c,side}=room.entrance;
  const from=Math.min(mid,c),to=Math.max(mid,c);
  for(let col=from;col<=to;col++){
   maze[r][col]=0;mainHall.add(at(r,col));
  }
  room.hallwayApproach={r,c:side==='e'?c+1:c-1};
 }
 // The cross-corridors must not steal room corners. Main hallway cells are
 // outside all room footprints, other than the deliberate doorway tiles.
 // If sealing room walls isolated an old branch of the maze, reconnect it
 // around room boundaries, never through another accidental entrance.
 function reachable(){
  const seen=new Set(),q=[[1,1]];seen.add(at(1,1));
  for(let i=0;i<q.length;i++){
   const [r,c]=q[i];
   for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nr=r+dr,nc=c+dc,k=at(nr,nc);
    if(nr<1||nc<1||nr>=H-1||nc>=H-1||maze[nr][nc]!==0||seen.has(k))continue;
    seen.add(k);q.push([nr,nc]);
   }
  }
  return seen;
 }
 let fixedBranches=0;
 for(let pass=0;pass<H*H;pass++){
  const seen=reachable();let target=null;
  for(let r=1;r<H-1&&!target;r++)for(let c=1;c<H-1;c++)if(maze[r][c]===0&&!seen.has(at(r,c))){target=[r,c];break;}
  if(!target)break;
  // 0/1 shortest path from the disconnected corridor to the connected one.
  const cost=Array.from({length:H},()=>Array(H).fill(Infinity)),prev=new Map();
  const dq=[target];cost[target[0]][target[1]]=0;let head=0,meet=null;
  // Tiny grids: relaxed queue is sufficiently efficient and avoids dependencies.
  const queued=new Set([at(...target)]);
  while(dq.length){
   const [r,c]=dq.shift();queued.delete(at(r,c));
   if(seen.has(at(r,c))){meet=[r,c];break;}
   for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nr=r+dr,nc=c+dc,k=at(nr,nc);
    if(nr<1||nc<1||nr>=H-1||nc>=H-1||roomRings.has(k))continue;
    const ncost=cost[r][c]+(maze[nr][nc]===1?1:0);
    if(ncost<cost[nr][nc]){
     cost[nr][nc]=ncost;prev.set(k,at(r,c));
     if(!queued.has(k)){
      if(maze[nr][nc]===0)dq.unshift([nr,nc]);else dq.push([nr,nc]);
      queued.add(k);
     }
    }
   }
  }
  if(!meet)break;
  let cursor=at(...meet),steps=0;
  while(cursor!==at(...target)&&steps++<H*H){
   const [r,c]=cursor.split(',').map(Number);
   if(maze[r][c]===1){maze[r][c]=0;fixedBranches++;}
   cursor=prev.get(cursor);if(!cursor)break;
  }
 }
 // A schoolyard sandpit is truly within the open-air playground, and never
 // overlaps the doorway or main path into the yard.
 const yard=rooms.find(r=>r.name==='yard'),sandSize=rad===1?1:2;
 const sandpit={rr0:yard.rr1-sandSize+1,rr1:yard.rr1,
                cc0:yard.cc1-sandSize+1,cc1:yard.cc1};
 const layout={maze,H,rooms,tile,mainHall,sandpit,
  stats:{rooms:rooms.map(r=>r.name),windowViews:[],doors:rooms.length,decorationCount:0,
         mainHallCells:mainHall.size,reconnectedCorridors:fixedBranches,
         preservedOpenCells:original.flat().filter(v=>v===0).length}};
 window.__schoolWorldLayout=layout;
 return layout;
}
window.__mazeSchoolLayout=campus;

// Mesh helper: world-space objects oriented so their front faces the room entry.
class Part{
 constructor(m,x,z,turn=0){this.m=m;this.x=x;this.z=z;this.cs=Math.cos(turn);this.sn=Math.sin(turn);}
 p(x,y,z){return[this.x+x*this.cs-z*this.sn,y,this.z+x*this.sn+z*this.cs];}
 box(x,y,z,X,Y,Z,col=RGB.wood,mat=5,emit=0){
  let v=[this.p(x,y,z),this.p(X,y,z),this.p(X,Y,z),this.p(x,Y,z),this.p(x,y,Z),this.p(X,y,Z),this.p(X,Y,Z),this.p(x,Y,Z)];
  for(const [a,b,c,d] of [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]])this.m.quad(v[a],v[b],v[c],v[d],mat,col,emit);
 }
 quad(a,b,c,d,col=RGB.white,mat=5,emit=0){this.m.quad(this.p(...a),this.p(...b),this.p(...c),this.p(...d),mat,col,emit);}
 tube(a,b,r=.025,col=RGB.steel,segments=9){
  const V=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...V)||1;
  const n=V.map(x=>x/L),ref=Math.abs(n[1])>.88?[1,0,0]:[0,1,0];
  let u=[n[1]*ref[2]-n[2]*ref[1],n[2]*ref[0]-n[0]*ref[2],n[0]*ref[1]-n[1]*ref[0]];
  const U=Math.hypot(...u)||1;u=u.map(x=>x/U);
  const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
  const at=(p,t)=>[p[0]+r*(u[0]*Math.cos(t)+v[0]*Math.sin(t)),p[1]+r*(u[1]*Math.cos(t)+v[1]*Math.sin(t)),p[2]+r*(u[2]*Math.cos(t)+v[2]*Math.sin(t))];
  for(let i=0;i<segments;i++){let t=i*2*Math.PI/segments,t2=(i+1)*2*Math.PI/segments;
   this.quad(at(a,t),at(a,t2),at(b,t2),at(b,t),col);
  }
 }
 ball(x,y,z,r,col,segments=10){
  const rings=6,pt=(a,b)=>[x+r*Math.sin(a)*Math.cos(b),y+r*Math.cos(a),z+r*Math.sin(a)*Math.sin(b)];
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
   let a=j*Math.PI/rings,b=(j+1)*Math.PI/rings,t=i*2*Math.PI/segments,u=(i+1)*2*Math.PI/segments;
   this.quad(pt(a,t),pt(a,u),pt(b,u),pt(b,t),col);
  }
 }
}
// Small pixel font for real 3D entrance signs. No mirrored bitmap text.
const FONT={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],
 D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],
 G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],
 J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],
 M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],
 P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],
 S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],
 V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],
 Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111']};
function sign(A,text,width=2.0,y=2.05){
 const label=text.toUpperCase(),cw=.028,scale=Math.min(1,width/(label.length*6*cw));
 const w=(label.length*6-1)*cw*scale,left=-w/2;
 A.box(left-.10,y-.06,-.050,-left+.10,y+.30,.09,RGB.navy);
 A.box(left-.065,y+.275,-.058,-left+.065,y+.309,.09,RGB.yellow,7,.36);
 for(let j=0;j<label.length;j++){
  const rows=FONT[label[j]];if(!rows)continue;
  for(let r=0;r<7;r++)for(let k=0;k<5;k++)if(rows[r][k]==='1'){
   let x=left+(j*6+k)*cw*scale,yy=y+.21-r*.032*scale;
   A.box(x,yy,-.064,x+cw*.86*scale,yy+.029*scale,-.059,RGB.white,7,.18);
  }
 }
}
function tree(A,x,z,k){
 A.tube([x,.03,z],[x,1.02,z],.075,RGB.wood);
 const leaf=k%3===0?RGB.green:k%3===1?RGB.teal:RGB.grass;
 for(const [dx,dy,dz,r] of [[0,1.26,0,.35],[-.22,1.13,0,.24],[.22,1.13,.08,.25],[0,1.17,-.23,.27]])A.ball(x+dx,dy,z+dz,r,leaf,9);
}
function hall(m,room){
 const x=room.c+.5,z=room.r+.5,R=Math.min((room.rr1-room.rr0+1)/2,2.5),A=new Part(m,x,z),back=room.rr0+.38;
 m.plane(room.cc0+.25,room.rr0+.25,room.cc1+.75,room.rr1+.75,.017,5,[1.16,.85,.61]);
 // Stage wall and curtains make this read as a hall rather than open maze space.
 A.box(-1.34,.028,-R+.30,1.34,.30,-R+.98,RGB.wood);
 A.box(-1.31,.30,-R+.26,1.31,1.98,-R+.34,RGB.purple);
 for(const sx of [-1,1])A.box(sx*1.18,.16,-R+.24,sx*1.34,2.06,-R+.34,RGB.red);
 A.box(-.42,.30,-R+.60,.42,.92,-R+.30,RGB.wood);
 A.box(-.30,.90,-R+.63,.30,.96,-R+.28,RGB.navy);
 // rows of assembly chairs facing the stage
 for(let row=0;row<4;row++){
  const zz=-.25+row*.55;
  for(let col=0;col<4;col++){
   const xx=-.75+col*.50;
   if(Math.abs(xx)<.25 && row===0) continue;
   A.box(xx-.10,.07,zz-.08,xx+.10,.31,zz+.08,RGB.blue);
   A.box(xx-.10,.30,zz+.03,xx+.10,.72,zz+.08,RGB.blue);
  }
 }
 // side wall sports lines
 A.tube([-1.00,.012,.18],[1.00,.012,.18],.012,RGB.white);
 A.box(-.40,.018,.18,.40,.028,.21,RGB.white);
 return back;
}
function library(m,room){
 const x=room.c+.5,z=room.r+.5,R=(room.rr1-room.rr0+1)/2,A=new Part(m,x,z);
 m.plane(room.cc0+.15,room.rr0+.15,room.cc1+.85,room.rr1+.85,.016,5,[.94,.79,.61]);
 // Stronger sense of a real library: perimeter shelving PLUS clear central aisles full of books.
 for(const side of [-1,1])for(let j=0;j<3;j++){
  const zz=-1.08+j*1.08,sx=side*(R-.34);
  if(j===1 && (side===1?room.entry==='e':room.entry==='w'))continue;
  A.box(sx-.17,.02,zz-.44,sx+.17,1.86,zz+.44,RGB.wood);
  for(let h=0;h<4;h++){
   const y=.24+h*.36;
   A.box(sx-.19,y,zz-.44,sx+.19,y+.05,zz+.44,RGB.wood);
   for(let k=0;k<8;k++){
    const col=[RGB.red,RGB.blue,RGB.purple,RGB.teal,RGB.yellow,RGB.orange][(j+h+k)%6];
    A.box(sx-.08,y+.05,zz-.40+k*.10,sx+.08,y+.28,zz-.33+k*.10,col);
   }
  }
 }
 // Two double-sided middle shelves loaded with books, leaving a central arrival path.
 for(const ax of [-.55,.55]){
  A.box(ax-.16,.02,-.10,ax+.16,1.55,1.18,RGB.wood);
  for(let h=0;h<4;h++){
   const y=.22+h*.30;
   A.box(ax-.18,y,-.10,ax+.18,y+.045,1.18,RGB.wood);
   for(let side of [-1,1]) for(let k=0;k<5;k++){
    const col=[RGB.red,RGB.blue,RGB.orange,RGB.purple,RGB.teal,RGB.yellow][(h+k+(side>0))%6];
    const z0=.02+k*.22;
    A.box(ax-.075,y+.045,z0+(side<0?.00:.10),ax+.075,y+.23,z0+.09+(side<0?.00:.10),col);
   }
  }
 }
 // Circulation desk
 A.box(-.78,.035,-1.35,.78,.70,-.95,RGB.wood);
 A.box(-.68,.70,-1.30,.68,.76,-.98,RGB.blue);
 A.box(-.18,.77,-1.23,.18,1.10,-1.11,RGB.black);
 A.box(-.15,1.07,-1.21,.15,1.09,-1.13,RGB.blue,7,.1);
 // Reading rug and display bins
 A.box(-1.00,.011,.30,1.00,.025,1.42,RGB.teal);
 for(const sx of [-.42,.42]){
  A.box(sx-.20,.025,.62,sx+.20,.40,1.00,RGB.wood);
  for(let k=0;k<4;k++)A.box(sx-.14+k*.07,.41,.72,sx-.08+k*.07,.50,.92,[RGB.orange,RGB.red,RGB.green,RGB.blue][k]);
 }
 // Small reading table and stools
 A.box(-.22,.39,1.08,.22,.52,1.34,RGB.wood);
 for(const [dx,dz] of [[-.26,1.04],[.26,1.04],[-.26,1.38],[.26,1.38]])A.box(dx-.08,.02,dz-.08,dx+.08,.28,dz+.08,RGB.orange);
}
function office(m,room){
 const x=room.c+.5,z=room.r+.5,R=(room.rr1-room.rr0+1)/2,A=new Part(m,x,z);
 m.plane(room.cc0+.10,room.rr0+.10,room.cc1+.90,room.rr1+.90,.016,5,[.82,.92,.98]);
 // A proper enclosed-office feel: reception zone immediately inside the doorway.
 A.box(-1.12,.04,-.98,1.12,.82,-.52,RGB.wood);
 A.box(-1.14,.80,-1.00,1.14,.88,-.46,RGB.white);
 A.box(-.30,.88,-.80,.30,1.32,-.68,RGB.black);
 A.box(-.24,1.29,-.82,.24,1.31,-.72,RGB.blue,7,.1);
 A.tube([0,.88,-.71],[0,.79,-.70],.020,RGB.steel);
 A.box(.53,.88,-.76,.71,.93,-.57,RGB.black);
 // admin shelving wall
 A.box(-(R-.55),.12,-.18,-(R-.23),1.66,.28,RGB.grey);
 for(let j=0;j<3;j++)A.box(-(R-.50),.36+j*.40,.20,-(R-.28),.40+j*.40,.26,RGB.white);
 // filing cabinet opposite
 A.box(R-.56,.12,-.18,R-.24,1.50,.22,RGB.grey);
 for(let j=0;j<3;j++)A.box(R-.52,.38+j*.34,-.12,R-.28,.42+j*.34,.16,RGB.white);
 // visitor chairs
 for(const sx of [-1,1]){
  A.box(sx*.42-.14,.06,.72,sx*.42+.14,.36,1.04,RGB.blue);
  A.box(sx*.42-.14,.35,.95,sx*.42+.14,.76,1.04,RGB.blue);
 }
 // inner work desk
 A.box(-.54,.04,1.02,.10,.54,1.40,RGB.wood);
 A.box(-.24,.55,1.12,-.04,.95,1.22,RGB.black);
 A.box(-.20,.92,1.13,-.08,.94,1.20,RGB.blue,7,.1);
 // plant by entrance
 A.box(.76,.04,1.12,1.08,.36,1.44,RGB.orange);
 for(let i=0;i<6;i++){const t=i*2*Math.PI/6;A.tube([.92,.31,1.28],[.92+Math.cos(t)*.22,.90,1.28+Math.sin(t)*.18],.025,RGB.green);} 
}
function yard(m,room,sand){
 const x=room.c+.5,z=room.r+.5,R=(room.rr1-room.rr0+1)/2,A=new Part(m,x,z);
 m.plane(room.cc0+.16,room.rr0+.16,room.cc1+.84,room.rr1+.84,.016,5,[.54,1.12,.54]);
 // fenced playground so it feels like a distinct outdoor destination reached through the gate doorway.
 for(let j=0;j<7;j++){
  const xj=-R+.32+j*.48;
  if(Math.abs(xj)<.35) continue;
  A.tube([xj,.02,-R+.06],[xj,1.00,-R+.06],.024,RGB.white);
  A.tube([xj,.02,R-.06],[xj,1.00,R-.06],.024,RGB.white);
 }
  for(let j=0;j<7;j++){
  const zj=-R+.28+j*.48;
  A.tube([-R+.06,.02,zj],[-R+.06,1.00,zj],.024,RGB.white);
  A.tube([R-.06,.02,zj],[R-.06,1.00,zj],.024,RGB.white);
 }
 A.tube([-R+.32,.85,-R+.06],[-.42,.85,-R+.06],.022,RGB.white);
 A.tube([.42,.85,-R+.06],[R-.32,.85,-R+.06],.022,RGB.white);
 A.tube([-R+.32,.85,R-.06],[R-.32,.85,R-.06],.022,RGB.white);
 A.tube([-R+.06,.85,-R+.28],[-R+.06,.85,R-.28],.022,RGB.white);
 A.tube([R-.06,.85,-R+.28],[R-.06,.85,R-.28],.022,RGB.white);
 // coloured safety tiles near the entry
 for(let i=0;i<6;i++){
  const xx=room.cc0+.50+i*.45,zz=room.rr0+.56;
  m.plane(xx,zz,xx+.39,zz+.45,.02,5,[.63+(i%2)*.32,.75+(i%3)*.12,.99-(i%2)*.12]);
 }
 const sx=-R+.96,sz=-R+1.10;
 for(const dx of [-.60,.60]){
  A.tube([sx+dx-.25,.02,sz-.32],[sx+dx,2.1,sz],.050,RGB.blue);
  A.tube([sx+dx+.25,.02,sz+.32],[sx+dx,2.1,sz],.050,RGB.blue);
 }
 A.tube([sx-.60,2.1,sz],[sx+.60,2.1,sz],.060,RGB.red);
 for(const dx of [-.28,.28]){for(const sx2 of [-.14,.14])A.tube([sx+dx+sx2,2.05,sz],[sx+dx+sx2,.67,sz],.015,RGB.grey);A.box(sx+dx-.17,.64,sz-.09,sx+dx+.17,.71,sz+.09,RGB.orange);} 
 const px=R-1.20,pz=-R+1.20;
 A.box(px-.37,.06,pz+.25,px+.37,1.25,pz+.65,RGB.yellow);
 for(let k=0;k<5;k++)A.box(px-.39,.18+k*.21,pz+.66-k*.08,px+.39,.23+k*.21,pz+.78-k*.08,RGB.steel);
 A.quad([px-.32,1.18,pz+.28],[px+.32,1.18,pz+.28],[px+.38,.14,pz-1.00],[px-.38,.14,pz-1.00],RGB.orange);
 for(const side of [-1,1])A.tube([px+side*.36,1.20,pz+.22],[px+side*.40,.16,pz-1.00],.025,RGB.red);
 const mx=-.10,mz=R-1.10;
 for(const dx of [-.55,.55])for(const dz of [-.26,.26])A.tube([mx+dx,.03,mz+dz],[mx+dx,1.56,mz+dz],.037,RGB.teal);
 for(let j=0;j<6;j++)A.tube([mx-.55+j*.22,1.56,mz-.26],[mx-.55+j*.22,1.56,mz+.26],.024,RGB.yellow);
 const cx=(sand.cc0+sand.cc1+1)/2-x,cz=(sand.rr0+sand.rr1+1)/2-z;
 const spHalf=(sand.cc1-sand.cc0+1)/2-.12;
 A.box(cx-spHalf,.018,cz-spHalf,cx+spHalf,.045,cz+spHalf,RGB.sand);
 A.box(cx-spHalf-.06,.02,cz-spHalf-.06,cx+spHalf+.06,.20,cz-spHalf+.06,RGB.wood);
 A.box(cx-spHalf-.06,.02,cz+spHalf-.06,cx+spHalf+.06,.20,cz+spHalf+.06,RGB.wood);
 A.box(cx-spHalf-.06,.02,cz-spHalf,cx-spHalf+.06,.20,cz+spHalf,RGB.wood);
 A.box(cx+spHalf-.06,.02,cz-spHalf,cx+spHalf+.06,.20,cz+spHalf,RGB.wood);
 A.box(cx-.15,.05,cz-.20,cx+.04,.18,cz+.02,RGB.blue);
 A.tube([cx-.05,.18,cz-.12],[cx+.10,.37,cz-.12],.018,RGB.steel);
 A.ball(cx+.40,.09,cz+.18,.10,RGB.red);A.ball(cx-.42,.08,cz+.25,.08,RGB.yellow);
 tree(A,-R+.40,R-.45,2);
}
function roomSign(m,room){
 const side=room.entry,turn=({n:0,s:Math.PI,w:-Math.PI/2,e:Math.PI/2})[side];
 const x=room.entrance.c+.5,z=room.entrance.r+.5;
 const A=new Part(m,x,z,turn);
 const hue={library:RGB.teal,office:RGB.orange,hall:RGB.purple,yard:RGB.green}[room.name];
 // Deeper doorway portal so it feels like entering a separate room.
 A.box(-.49,.02,-.08,-.415,2.26,.52,RGB.white);
 A.box(.415,.02,-.08,.49,2.26,.52,RGB.white);
 A.box(-.49,2.12,-.08,.49,2.26,.52,RGB.wood);
 // short return walls inside the room, leaving a clear opening in the middle
 A.box(-.49,.02,.20,-.18,2.05,.52,RGB.white);
 A.box(.18,.02,.20,.49,2.05,.52,RGB.white);
 A.box(-.45,2.23,-.10,.45,2.29,.53,RGB.navy);
 A.box(-.45,2.08,-.10,.45,2.13,.53,hue,7,.32);
 A.box(-.40,.018,-.25,.40,.036,.40,hue,7,.14);
 sign(A,{library:'LIBRARY',office:'OFFICE',hall:'SCHOOL HALL',yard:'PLAYGROUND'}[room.name],2.20,1.90);
 if(room.name!=='yard'){
  // obvious solid door leaf parked open against the side wall
  A.box(-.49,.07,.14,-.435,1.98,.84,room.name==='office'?RGB.blue:RGB.wood);
  A.box(-.49,.80,.24,-.425,.91,.36,RGB.steel);
  A.box(-.495,1.18,.25,-.425,1.26,.56,RGB.white);
 } else {
  A.box(-.49,.15,.16,-.44,1.28,.66,RGB.teal);
  A.box(.44,.15,.16,.49,1.28,.66,RGB.teal);
  A.tube([-.44,1.26,.42],[.44,1.26,.42],.02,RGB.white);
 }
}
function isSand(layout,r,c){const s=layout.sandpit;return r>=s.rr0&&r<=s.rr1&&c>=s.cc0&&c<=s.cc1;}

const Renderer=window.Maze3DRenderer;
if(!Renderer){console.warn('School Campus requires Maze3DRenderer; School retains its 2D fallback.');return;}
const p=Renderer.prototype;
// School destinations have their own interior wall finishes; hallway faces
// stay separate and keep their normal school corridor appearance.
p.schoolRoomWallStyle=function(r,c,side){
 const d={n:[-1,0],s:[1,0],w:[0,-1],e:[0,1]}[side];
 const room=this.schoolLayout?.tile.get((r+d[0])+','+(c+d[1]));
 if(!room)return null;
 const tint={library:[1.22,1.11,.85],office:[.93,1.10,1.20],
             hall:[1.21,.99,.77],yard:[.74,1.17,.83]}[room];
 return {material:3,tint};
};
p.schoolIsOutdoor=function(r,c){return this.schoolLayout?.tile.get(r+','+c)==='yard';};
p.schoolFloorTint=function(r,c){
 const layout=this.schoolLayout,where=layout?.tile.get(r+','+c);if(!where)return null;
 if(where==='yard')return isSand(layout,r,c)?[1.13,.93,.59]:[.53,.94,.56];
 if(where==='library')return[1.12,.91,.75];
 if(where==='office')return[.91,1.02,1.14];
 return[1.15,.87,.64];
};
p.schoolWorldGeometry=function(m,s,h){
 const layout=this.schoolLayout;
 if(!layout)return;
 // The principal hallway is a physically distinct, continuous indoor corridor.
 const mid=(layout.H/2)|0;
 for(let r=1;r<layout.H-1;r++){
  m.plane(mid+.30,r+.08,mid+.70,r+.92,.020,5,[.74,.97,1.18]);
  if(r%4===2){
   const A=new Part(m,mid+.50,r+.50);
   A.box(-.34,.025,-.055,.34,.039,.055,RGB.white);
  }
 }
 for(const room of layout.rooms){
  const a=room.hallwayApproach;
  const A=new Part(m,a.c+.5,a.r+.5);
  const hue={library:RGB.teal,office:RGB.orange,hall:RGB.purple,yard:RGB.green}[room.name];
  A.box(-.30,.022,-.30,.30,.034,.30,hue);
  A.box(-.10,.035,-.10,.10,.04,.10,RGB.white);
 }
 for(const room of layout.rooms){
  try{
   if(room.name==='library')library(m,room);
   else if(room.name==='office')office(m,room);
   else if(room.name==='hall')hall(m,room);
   else if(room.name==='yard')yard(m,room,layout.sandpit);
   roomSign(m,room);
  }catch(e){console.error('School room build failed:',room.name,e);}
 }
 this.schoolStats=layout.stats;
};

// Face-aware varied window views and SOLID non-glazed school doors.
p.schoolWallDecoration=function(m,f,h,rand){
 const box=(...a)=>this.schoolWallBox(m,f,...a),L=this.schoolLayout;
 const x=(f.a[0]+f.b[0])*.5,z=(f.a[2]+f.b[2])*.5;
 const n=Math.floor(x*31+z*71),idx=Math.floor(hash(Math.round(x*10),Math.round(z*10),f.side.charCodeAt(0))*1000);
 const mode=idx%100;
 if(mode<0){
  // Legacy decorative doors disabled: only real traversable entrances look like doors.
  const door=mode<15?RGB.wood:RGB.blue;
  box(.13,.02,.02,.87,2.01,.075,5,door);
  box(.10,.02,.077,.16,2.10,.105,6,RGB.grey);
  box(.84,.02,.077,.90,2.10,.105,6,RGB.grey);
  box(.10,2.01,.079,.90,2.09,.105,6,RGB.grey);
  box(.21,.16,.082,.79,.85,.093,5,door);
  box(.21,1.01,.082,.79,1.73,.093,5,door);
  box(.26,.22,.098,.74,.28,.107,6,RGB.grey);
  box(.25,1.56,.098,.75,1.61,.108,6,RGB.grey);
  box(.72,.96,.112,.77,1.07,.155,6,RGB.steel);
  box(.72,.99,.152,.85,1.02,.168,6,RGB.steel);
  box(.14,2.14,.04,.86,2.32,.09,5,RGB.navy);
  box(.20,2.24,.094,.80,2.27,.105,7,RGB.yellow,.16);
  if(L)L.stats.doors++;return;
 }
 if(mode<72){
  const variant=(idx+Math.round(x*13+z*19))%6;
  if(L)L.stats.windowViews.push(variant);
  // Sky is a recessed colour plane. Each opening has unique 3D details:
  // trees, buildings, sports field, play structures, gardens or mountains.
  box(.11,.79,.026,.89,1.96,.038,7,[.52,.88,1.22],.02);
  box(.11,.80,.042,.89,1.03,.047,5,variant===4?[.62,.78,.86]:[.52,.88,.48]);
  // varied cloud bands, no pasted repeated image
  for(let i=0;i<2;i++){
   const xx=.19+i*.34+hash(n,i,variant)*.11,yy=1.63+i*.15;
   box(xx,yy,.057,xx+.23,yy+.047,.060,7,[1.3,1.28,1.25],.14);
  }
  if(variant===0||variant===5){
   // A stand of trees and school garden.
   for(let j=0;j<3;j++){
    const u=.20+j*.28,k=hash(n,j,variant),trunk=.19+.12*k;
    box(u,.89,.064,u+.035,1.16+trunk,.079,5,RGB.wood);
    box(u-.075,1.14+trunk,.070,u+.115,1.42+trunk,.10,5,j===2?RGB.green:RGB.teal);
    box(u-.06,1.09+trunk,.105,u+.09,1.20+trunk,.125,5,RGB.grass);
   }
   if(variant===5)for(let j=0;j<4;j++)box(.19+j*.17,1.04,.15,.24+j*.17,1.13,.17,7,[1.42,.72,.32],.1);
  }else if(variant===1||variant===4){
   // Different school buildings and rooflines.
   for(let j=0;j<3;j++){
    const u=.15+j*.25,hh=.26+hash(n,j,variant)*.25;
    box(u,.97,.06,u+.21,.97+hh,.10,5,j%2?RGB.wood:RGB.grey);
    box(u-.02,.97+hh,.06,u+.23,1.02+hh,.12,6,RGB.red);
    for(let w=0;w<2;w++)box(u+.048+w*.075,1.06,.13,u+.087+w*.075,1.19,.14,7,[.61,.84,1.17]);
   }
  }else if(variant===2){
   // Sport oval and running lanes.
   box(.13,.91,.075,.87,1.24,.090,5,[.47,1.04,.49]);
   for(let j=0;j<3;j++)box(.20,1.00+j*.064,.11,.79,1.01+j*.064,.115,7,[1.25,1.22,.96],.11);
   box(.46,1.03,.12,.49,1.46,.15,5,RGB.steel);
   box(.49,1.41,.12,.68,1.45,.15,5,RGB.yellow);
  }else{
   // Playground structure and grass beyond.
   box(.25,1.08,.075,.32,1.43,.09,5,RGB.red);
   box(.68,1.08,.075,.75,1.43,.09,5,RGB.blue);
   box(.26,1.41,.075,.74,1.47,.09,5,RGB.yellow);
   box(.52,1.21,.10,.63,1.33,.12,5,RGB.orange);
   box(.37,1.08,.10,.41,1.43,.12,5,RGB.grey);
  }
  // Rich recessed frame + internal mullions.
  box(.075,.75,.06,.12,2.00,.13,6,RGB.white);
  box(.88,.75,.06,.925,2.00,.13,6,RGB.white);
  box(.075,1.96,.06,.925,2.025,.14,6,RGB.white);
  box(.075,.73,.06,.925,.81,.17,6,RGB.white);
  box(.484,.77,.07,.514,1.99,.14,6,RGB.white);
  box(.11,1.35,.07,.89,1.38,.14,6,RGB.white);
  box(.11,1.90,.09,.89,1.94,.10,7,[1.15,1.18,1.22],.05);
  if(L)L.stats.decorationCount++;return;
 }
 if(mode<87){
  // Three distinct, non-transparent metal storage lockers.
  box(.07,.02,.026,.93,1.80,.11,6,RGB.grey);
  for(let i=0;i<3;i++){
   const x=.08+i*.28;
   box(x,.10,.116,x+.266,1.70,.138,6,i%2?RGB.blue:RGB.steel);
   for(let k=0;k<3;k++)box(x+.08,1.48+k*.043,.141,x+.19,1.495+k*.043,.145,6,RGB.black);
   box(x+.22,.75,.14,x+.235,.94,.17,6,RGB.white);
  }
  return;
 }
 // Bulletin board (no duplicate identical poster artwork).
 box(.12,.75,.02,.88,1.97,.065,5,RGB.wood);
 box(.16,.80,.07,.84,1.92,.08,5,RGB.teal);
 for(let j=0;j<5;j++){
  const u=.22+(j%3)*.20,y=1.01+Math.floor(j/3)*.46;
  box(u,y,.082,u+.15,y+.25,.086,7,[1.15+.04*j,.92+(j%2)*.16,.62+(j%3)*.22],.12);
 }
};
})();
