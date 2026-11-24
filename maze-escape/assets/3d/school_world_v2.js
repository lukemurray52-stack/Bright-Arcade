/* Bright Arcade – School Campus V2 (real traversable school spaces)
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
 const near=Math.floor(H*.27),far=H-1-near;
 const radius=H>=33?3:H>=25?3:2;
 const positions=[['library',near,near],['office',near,far],['hall',far,near],['yard',far,far]];
 const rooms=[],tile=new Map();
 for(const [name,r,c] of positions){
  const rad=name==='office'?Math.max(1,radius-1):radius;
  const rr0=Math.max(2,r-rad),rr1=Math.min(H-3,r+rad),cc0=Math.max(2,c-rad),cc1=Math.min(H-3,c+rad);
  const room={name,r,c,rr0,rr1,cc0,cc1,tiles:[],entry:'n'};
  // Preserve every existing corridor; open the previously solid cells forming
  // large, connected rooms rather than drawing inaccessible fake backdrops.
  for(let row=rr0;row<=rr1;row++)for(let col=cc0;col<=cc1;col++){
    maze[row][col]=0;tile.set(row+','+col,name);room.tiles.push([row,col]);
  }
  rooms.push(room);
 }
 const yard=rooms.find(x=>x.name==='yard');
 // Real 2x2 sandpit is inside the outdoor playground and has its own surface.
 const sandpit={rr0:yard.rr1-1,rr1:yard.rr1,cc0:yard.cc1-1,cc1:yard.cc1};
 // Assign a guaranteed exterior approach / entrance, not a fake door to a wall.
 for(const room of rooms){
  const options=[];
  for(let c=room.cc0;c<=room.cc1;c++){
   if(maze[room.rr0-1]?.[c]===0)options.push({side:'n',r:room.rr0,c});
   if(maze[room.rr1+1]?.[c]===0)options.push({side:'s',r:room.rr1,c});
  }
  for(let r=room.rr0;r<=room.rr1;r++){
   if(maze[r]?.[room.cc0-1]===0)options.push({side:'w',r,c:room.cc0});
   if(maze[r]?.[room.cc1+1]===0)options.push({side:'e',r,c:room.cc1});
  }
  // Every carved area intersects or adjoins the original spanning-tree maze.
  // If a rare edge lacks a corridor, open one cell towards the nearest path.
  if(!options.length){
   const c=room.c, r=room.rr0-1;
   maze[r][c]=0;options.push({side:'n',r:room.rr0,c});
  }
  const centre=v=>Math.abs(v.r-room.r)+Math.abs(v.c-room.c);
  options.sort((a,b)=>centre(a)-centre(b));
  room.entrance=options[0];room.entry=options[0].side;
 }
 const layout={maze,H,rooms,tile,sandpit,
  stats:{rooms:rooms.map(r=>r.name),windowViews:[],doors:0,decorationCount:0}};
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
 // Polished timber assembly floor, central sports markings and side seating.
 m.plane(room.cc0+.25,room.rr0+.25,room.cc1+.75,room.rr1+.75,.017,5,[1.16,.85,.61]);
 A.box(-1.34,.028,-R+.30,1.34,.28,-R+.99,RGB.wood);
 A.box(-1.31,.27,-R+.27,1.31,1.91,-R+.32,RGB.purple);
 for(const sx of [-1,1])A.box(sx*1.20,.17,-R+.25,sx*1.34,2.04,-R+.30,RGB.red);
 A.box(-.38,.28,-R+.60,.38,.89,-R+.30,RGB.wood); // podium
 A.box(-.28,.86,-R+.65,.28,.92,-R+.28,RGB.navy);
 for(let j=0;j<5;j++){
  const row=-R+1.45+j*.47;
  for(const sx of [-1,1]){
   A.box(sx*(R-.50),.08,row-.10,sx*(R-.28),.32,row+.08,RGB.blue);
   A.box(sx*(R-.50),.31,row+.035,sx*(R-.28),.73,row+.08,RGB.blue);
  }
 }
 A.tube([-1.00,.012,.15],[1.00,.012,.15],.012,RGB.white);
 A.box(-.40,.018,.15,.40,.028,.18,RGB.white);
 return back;
}
function library(m,room){
 const x=room.c+.5,z=room.r+.5,R=(room.rr1-room.rr0+1)/2,A=new Part(m,x,z);
 m.plane(room.cc0+.15,room.rr0+.15,room.cc1+.85,room.rr1+.85,.016,5,[.94,.79,.61]);
 // Bookcases placed at perimeter to keep a clear centre route for the player.
 for(const side of [-1,1])for(let j=0;j<3;j++){
  const zz=-1.10+j*1.10,sx=side*(R-.32);
  A.box(sx-.16,.02,zz-.46,sx+.16,1.82,zz+.46,RGB.wood);
  for(let h=0;h<4;h++){
   const y=.24+h*.36;
   A.box(sx-.18,y,zz-.46,sx+.18,y+.050,zz+.46,RGB.wood);
   for(let k=0;k<8;k++){
    const col=[RGB.red,RGB.blue,RGB.purple,RGB.teal,RGB.yellow,RGB.orange][(j+h+k)%6];
    A.box(sx-.075,y+.05,zz-.43+k*.105,sx+.075,y+.27,zz-.35+k*.105,col);
   }
  }
 }
 A.box(-.72,.035,-1.40,.72,.67,-1.02,RGB.wood);
 A.box(-.63,.68,-1.35,.63,.74,-1.04,RGB.blue);
 // Reading rug + two book display stations.
 A.box(-1.04,.011,.27,1.04,.025,1.47,RGB.teal);
 A.box(-.40,.025,.59,.40,.38,1.02,RGB.wood);
 for(let k=0;k<5;k++)A.box(-.26+k*.11,.39,.70,-.18+k*.11,.47,.90,[RGB.orange,RGB.red,RGB.green,RGB.blue,RGB.purple][k]);
}
function office(m,room){
 const x=room.c+.5,z=room.r+.5,R=(room.rr1-room.rr0+1)/2,A=new Part(m,x,z);
 m.plane(room.cc0+.10,room.rr0+.10,room.cc1+.90,room.rr1+.90,.016,5,[.82,.92,.98]);
 // Reception counter, monitor, telephone and visitor chairs.
 A.box(-1.10,.04,-.95,1.10,.78,-.56,RGB.wood);
 A.box(-1.12,.77,-.97,1.12,.85,-.47,RGB.white);
 A.box(-.28,.86,-.79,.28,1.30,-.68,RGB.black);
 A.box(-.22,1.27,-.81,.22,1.29,-.72,RGB.blue,7,.1);
 A.tube([0,.86,-.71],[0,.77,-.70],.020,RGB.steel);
 A.box(.51,.86,-.76,.70,.92,-.55,RGB.black);
 for(const sx of [-1,1]){
  A.box(sx*(R-.53),.06,.60,sx*(R-.20),.39,1.00,RGB.blue);
  A.box(sx*(R-.53),.38,.88,sx*(R-.20),.82,1.00,RGB.blue);
  A.box(sx*(R-.53),.12,-.22,sx*(R-.21),1.61,.21,RGB.grey);
  for(let j=0;j<3;j++)A.box(sx*(R-.49),.35+j*.41,.17,sx*(R-.25),.39+j*.41,.24,RGB.white);
 }
 // Plant by entrance
 A.box(.70,.04,1.17,1.06,.37,1.53,RGB.orange);
 for(let i=0;i<6;i++){const t=i*2*Math.PI/6;A.tube([.88,.31,1.35],[.88+Math.cos(t)*.24,.91,1.35+Math.sin(t)*.20],.025,RGB.green);}
}
function yard(m,room,sand){
 const x=room.c+.5,z=room.r+.5,R=(room.rr1-room.rr0+1)/2,A=new Part(m,x,z);
 // Actual open-sky walkable playground with grass and painted safety pads.
 m.plane(room.cc0+.16,room.rr0+.16,room.cc1+.84,room.rr1+.84,.016,5,[.54,1.12,.54]);
 // Colourful square soft-fall playground surface and hopscotch markings.
 for(let i=0;i<6;i++){
  const xx=room.cc0+.50+i*.45,zz=room.rr0+.56;
  m.plane(xx,zz,xx+.39,zz+.45,.02,5,[.63+(i%2)*.32,.75+(i%3)*.12,.99-(i%2)*.12]);
 }
 // Swing frame at upper-left, chains, seats.
 const sx=-R+.96,sz=-R+1.10;
 for(const dx of [-.60,.60]){
  A.tube([sx+dx-.25,.02,sz-.32],[sx+dx,2.1,sz],.050,RGB.blue);
  A.tube([sx+dx+.25,.02,sz+.32],[sx+dx,2.1,sz],.050,RGB.blue);
 }
 A.tube([sx-.60,2.1,sz],[sx+.60,2.1,sz],.060,RGB.red);
 for(const dx of [-.28,.28]){
  for(const sx2 of [-.14,.14])A.tube([sx+dx+sx2,2.05,sz],[sx+dx+sx2,.67,sz],.015,RGB.grey);
  A.box(sx+dx-.17,.64,sz-.09,sx+dx+.17,.71,sz+.09,RGB.orange);
 }
 // Play slide and stairs to the right, coloured plastic curved-ish slope.
 const px=R-1.20,pz=-R+1.20;
 A.box(px-.37,.06,pz+.25,px+.37,1.25,pz+.65,RGB.yellow);
 for(let k=0;k<5;k++)A.box(px-.39,.18+k*.21,pz+.66-k*.08,px+.39,.23+k*.21,pz+.78-k*.08,RGB.steel);
 A.quad([px-.32,1.18,pz+.28],[px+.32,1.18,pz+.28],[px+.38,.14,pz-1.00],[px-.38,.14,pz-1.00],RGB.orange);
 for(const side of [-1,1])A.tube([px+side*.36,1.20,pz+.22],[px+side*.40,.16,pz-1.00],.025,RGB.red);
 // Monkey bars at far edge.
 const mx=-.10,mz=R-1.10;
 for(const dx of [-.55,.55])for(const dz of [-.26,.26])A.tube([mx+dx,.03,mz+dz],[mx+dx,1.56,mz+dz],.037,RGB.teal);
 for(let j=0;j<6;j++)A.tube([mx-.55+j*.22,1.56,mz-.26],[mx-.55+j*.22,1.56,mz+.26],.024,RGB.yellow);
 // True sandpit with edging and tan sandy floor.
 const cx=(sand.cc0+sand.cc1+1)/2-x,cz=(sand.rr0+sand.rr1+1)/2-z;
 A.box(cx-.89,.018,cz-.89,cx+.89,.045,cz+.89,RGB.sand);
 A.box(cx-.96,.02,cz-.95,cx+.96,.22,cz-.80,RGB.wood);
 A.box(cx-.96,.02,cz+.80,cx+.96,.22,cz+.95,RGB.wood);
 A.box(cx-.96,.02,cz-.80,cx-.80,.22,cz+.80,RGB.wood);
 A.box(cx+.80,.02,cz-.80,cx+.96,.22,cz+.80,RGB.wood);
 A.box(cx-.15,.05,cz-.20,cx+.04,.18,cz+.02,RGB.blue);
 A.tube([cx-.05,.18,cz-.12],[cx+.10,.37,cz-.12],.018,RGB.steel);
 A.ball(cx+.40,.09,cz+.18,.10,RGB.red);A.ball(cx-.42,.08,cz+.25,.08,RGB.yellow);
 // Fenced accent only near the boundary; avoid enclosing the corridor entrance.
 for(let j=0;j<6;j++){
  const xj=-R+.40+j*.60;
  A.tube([xj,.02,-R+.08],[xj,1.02,-R+.08],.026,RGB.white);
 }
 A.tube([-R+.4,.87,-R+.08],[R-.50,.87,-R+.08],.025,RGB.white);
 tree(A,0,0,2); // one friendly tree for shade
}
function roomSign(m,room){
 const side=room.entry,turn=({n:0,s:Math.PI,w:Math.PI/2,e:-Math.PI/2})[side];
 let x=room.c+.5,z=room.r+.5;
 if(side==='n'){x=room.entrance.c+.5;z=room.rr0+.48;}
 if(side==='s'){x=room.entrance.c+.5;z=room.rr1+.52;}
 if(side==='w'){x=room.cc0+.48;z=room.entrance.r+.5;}
 if(side==='e'){x=room.cc1+.52;z=room.entrance.r+.5;}
 const A=new Part(m,x,z,turn);
 sign(A,{library:'LIBRARY',office:'OFFICE',hall:'SCHOOL HALL',yard:'PLAYGROUND'}[room.name],2.20,2.02);
}
function isSand(layout,r,c){const s=layout.sandpit;return r>=s.rr0&&r<=s.rr1&&c>=s.cc0&&c<=s.cc1;}

const Renderer=window.Maze3DRenderer;
if(!Renderer){console.warn('School Campus requires Maze3DRenderer; School retains its 2D fallback.');return;}
const p=Renderer.prototype;
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
 if(mode<30){
  // Solid opaque classroom/office door: raised panels, NO window or blue glass.
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
