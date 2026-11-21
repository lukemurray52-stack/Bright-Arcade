/* Bright Arcade · Maze Escape · Arcade Immersion V4
 * Fully volumetric, material-textured arcade attractions; NO billboard sprites.
 * Existing renderer supplies lighting, architectural shells and spell/exit logic.
 * Changes apply exclusively to the 'classic' (Arcade) theme.
 */
(function(){'use strict';
const PI=Math.PI,TAU=PI*2;
const C={ink:[.21,.23,.34],black:[.11,.12,.20],ruby:[1.24,.22,.31],coral:[1.18,.45,.31],pink:[1.28,.37,.79],purple:[.68,.39,1.28],cyan:[.21,1.13,1.31],blue:[.34,.55,1.25],mint:[.43,1.20,.88],lime:[.58,1.20,.36],yellow:[1.36,1.00,.34],orange:[1.35,.64,.29],steel:[.79,.86,.96],silver:[1.02,1.05,1.09],white:[1.17,1.19,1.19],glass:[.66,1.05,1.24],tan:[1.2,.77,.56],plush:[1.26,.98,.73],lavender:[.80,.70,1.19],forest:[.33,.69,.64]};
const THEMES=[
 {name:'RACING',racer:'racer',extra:'pinball',accent:C.cyan},
 {name:'PRIZES',racer:'claw',extra:'prizes',accent:C.pink},
 {name:'SPORTS',racer:'hoops',extra:'hockey',accent:C.orange},
 {name:'RHYTHM',racer:'dance',extra:'skee',accent:C.purple},
 {name:'FUN FAIR',racer:'bumper',extra:'wheel',accent:C.lime}
];
function roomsFor(H){
 const M=Math.floor(H/2),a=H<=17?4:H<=25?6:8,b=H-1-a,rad=H<=17?2:H<=25?3:4;
 return [[a,a],[a,b],[b,a],[b,b],[M,M]].map(([r,c],i)=>{
  const o={r,c,rad,zone:i,name:THEMES[i].name,minR:Math.max(1,r-rad),maxR:Math.min(H-2,r+rad),minC:Math.max(1,c-rad),maxC:Math.min(H-2,c+rad)};
  // Two recognisable attractions per district, anchored to solid floor islands.
  // The 2m+ broad circulation route around the islands remains clear.
  o.props=i===4?[{r:r,c:c,kind:'bumper',spin:0},{r:r+1,c:c+1,kind:'wheel',spin:1}]:[
   {r:r,c:c,kind:THEMES[i].racer,spin:0},
   {r:r-1,c:c+1,kind:THEMES[i].extra,spin:1}
  ];
  for(const prop of o.props){
   const wide=['racer','hockey','dance','pinball','prizes'].includes(prop.kind);
   prop.cells=[[prop.r,prop.c]];
   if(wide && prop.c+1<o.maxC)prop.cells.push([prop.r,prop.c+1]);
  }
  return o;
 });
}
function shapeArcade(maze){
 if(!maze||maze.length<17)return [];
 const H=maze.length,M=Math.floor(H/2),R=roomsFor(H);
 const dig=(r,c)=>{if(r>0&&c>0&&r<H-1&&c<H-1)maze[r][c]=0;};
 const rect=(r0,c0,r1,c1)=>{for(let r=Math.max(1,r0);r<=Math.min(H-2,r1);r++)for(let c=Math.max(1,c0);c<=Math.min(H-2,c1);c++)dig(r,c);};
 const avenue=(r0,c0,r1,c1,w=3)=>{const h=Math.floor(w/2);
  if(r0===r1)rect(r0-h,Math.min(c0,c1),r0+h,Math.max(c0,c1));
  else if(c0===c1)rect(Math.min(r0,r1),c0-h,Math.max(r0,r1),c0+h);
  else {avenue(r0,c0,r0,c1,w);avenue(r0,c1,r1,c1,w);}
 };
 // Authentic open arcade districts separated by a network of wider aisles.
 R.forEach(o=>rect(o.minR,o.minC,o.maxR,o.maxC));
 avenue(M,2,M,H-3,3);avenue(2,M,H-3,M,3);
 R.slice(0,4).forEach(o=>avenue(o.r,o.c,M,o.c,3));
 // Perimeter walkway creates loops and glimpses into other zones.
 const outer=H<=17?3:5;
 avenue(outer,outer,outer,H-outer-1,2);avenue(H-outer-1,outer,H-outer-1,H-outer-1,2);
 avenue(outer,outer,H-outer-1,outer,2);avenue(outer,H-outer-1,H-outer-1,H-outer-1,2);
 // Accessible entrance lobby. No outer boundary is opened.
 rect(1,1,4,4);avenue(3,3,R[0].r,R[0].c,3);
 // Display islands are collision-solid from the start, before word placement.
 // Thus no words can spawn inside a machine and walkability matches geometry.
 for(const o of R)for(const p of o.props)for(const [r,c] of p.cells){
  if(r>2&&c>2&&r<H-3&&c<H-3)maze[r][c]=1;
 }
 dig(1,1);
 return R;
}
window.__mazeArcadeLayout=shapeArcade;
window.__mazeArcadeZoneNames=THEMES.map(z=>z.name);

/* Mesh helper. All geometry has true 3D fronts, backs, sides, tops, normals
 * and world depth. Only machine displays use 2D texture surfaces, as in life.
 * Every model is positioned inside its own solid cell in the maze grid. */
class Asset3D{
 constructor(m,x,z,rotation=0){this.m=m;this.x=x;this.z=z;this.co=Math.cos(rotation);this.si=Math.sin(rotation);}
 P(x,y,z){return [this.x+x*this.co-z*this.si,y,this.z+x*this.si+z*this.co];}
 q(a,b,c,d,mat=5,col=C.white,em=0){this.m.quad(this.P(...a),this.P(...b),this.P(...c),this.P(...d),mat,col,em);}
 triangle(a,b,c,mat=5,col=C.white,em=0){this.m.tri(this.P(...a),this.P(...b),this.P(...c),null,mat,col,em);}
 box(x0,y0,z0,x1,y1,z1,mat=5,col=C.ink,em=0){
  const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>this.P(a<0?x0:x1,b<0?y0:y1,c<0?z0:z1));
  const quad=(a,b,c,d)=>this.m.quad(v[a],v[b],v[c],v[d],mat,col,em);
  quad(0,3,2,1);quad(5,6,7,4);quad(4,7,3,0);quad(1,2,6,5);quad(3,7,6,2);quad(4,0,1,5);
 }
 curveBox(x0,y0,z0,x1,y1,z1,rad=.12,mat=5,col=C.ink,em=0){
  // Extruded rounded-rectangle chassis: true curved corners, 9 arc points per
  // corner, underside, top and vertical panels. Softens low-poly silhouettes.
  const r=Math.min(rad,(x1-x0)*.42,(z1-z0)*.42),verts=[];
  for(const [cx,cz,ang] of [[x1-r,z1-r,0],[x0+r,z1-r,PI/2],[x0+r,z0+r,PI],[x1-r,z0+r,PI*1.5]]){
   for(let j=0;j<=8;j++){const a=ang+j*PI/16;verts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}
  }
  for(let i=0;i<verts.length;i++){const [ax,az]=verts[i],[bx,bz]=verts[(i+1)%verts.length];this.q([ax,y0,az],[bx,y0,bz],[bx,y1,bz],[ax,y1,az],mat,col,em);}
  for(let i=0;i<verts.length;i++){const a=verts[i],b=verts[(i+1)%verts.length];const cx=(x0+x1)/2,cz=(z0+z1)/2;
   this.triangle([cx,y1,cz],[a[0],y1,a[1]],[b[0],y1,b[1]],mat,col,em);
   this.triangle([cx,y0,cz],[b[0],y0,b[1]],[a[0],y0,a[1]],mat,col,em);
  }
 }
 bar(a,b,r,col=C.silver,mat=5,em=0,sides=10){
  const A=this.P(...a),B=this.P(...b),dx=B[0]-A[0],dy=B[1]-A[1],dz=B[2]-A[2],len=Math.hypot(dx,dy,dz)||1;
  const unit=[dx/len,dy/len,dz/len],tmp=Math.abs(unit[1])>.85?[1,0,0]:[0,1,0];
  const vx=[unit[1]*tmp[2]-unit[2]*tmp[1],unit[2]*tmp[0]-unit[0]*tmp[2],unit[0]*tmp[1]-unit[1]*tmp[0]];
  const vl=Math.hypot(...vx)||1;vx.forEach((v,i)=>vx[i]=v/vl);
  const wx=[unit[1]*vx[2]-unit[2]*vx[1],unit[2]*vx[0]-unit[0]*vx[2],unit[0]*vx[1]-unit[1]*vx[0]];
  for(let k=0;k<sides;k++){
   const ta=k*TAU/sides,tb=(k+1)*TAU/sides;
   const add=(p,t)=>p.map((v,i)=>v+r*(Math.cos(t)*vx[i]+Math.sin(t)*wx[i]));
   this.m.quad(add(A,ta),add(A,tb),add(B,tb),add(B,ta),mat,col,em);
  }
 }
 sphere(x,y,z,r,col=C.white,mat=5,em=0){
  const latitude=9,longitude=14;
  for(let i=0;i<latitude;i++){
   const a=i/latitude*PI,b=(i+1)/latitude*PI;
   for(let j=0;j<longitude;j++){
    const c=j/longitude*TAU,d=(j+1)/longitude*TAU;
    const p=(t,u)=>[x+r*Math.sin(t)*Math.cos(u),y+r*Math.cos(t),z+r*Math.sin(t)*Math.sin(u)];
    this.q(p(a,c),p(a,d),p(b,d),p(b,c),mat,col,em);
   }
  }
 }
 ring(x,y,z,r,t,col=C.silver,plane='xy',em=0){
  const n=30;for(let j=0;j<n;j++){const a=j*TAU/n,b=(j+1)*TAU/n;
   const pt=ang=>plane==='xy'?[x+r*Math.cos(ang),y+r*Math.sin(ang),z]:plane==='xz'?[x+r*Math.cos(ang),y,z+r*Math.sin(ang)]:[x,y+r*Math.cos(ang),z+r*Math.sin(ang)];
   this.bar(pt(a),pt(b),t,col,7,em,6);
  }
 }
 screen(x0,y0,z,x1,y1,material=60){
  this.box(x0-.055,y0-.055,z-.05,x1+.055,y1+.055,z+.045,5,C.black);
  this.q([x0,y0,z-.055],[x1,y0,z-.055],[x1,y1,z-.055],[x0,y1,z-.055],material,C.white,.45);
  this.bar([x0,y0,z-.06],[x1,y0,z-.06],.015,C.cyan,7,.7);
 }
 led(x0,y0,z0,x1,y1,z1,col=C.cyan,em=.9){this.box(x0,y0,z0,x1,y1,z1,7,col,em);}
 wheel(x,y,z,r=.17,col=C.silver){this.ring(x,y,z,r,.020,col,'xy',.10);this.bar([x-r,y,z],[x+r,y,z],.009,col);this.bar([x,y-r,z],[x,y+r,z],.009,col);this.sphere(x,y,z,.055,C.black);}
 label(x0,y0,z,x1,y1,material){this.q([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],material,C.white,.32);}
 }
function modelRacer(A){
 // A real sit-down racer: screen hood, wheel, pedal deck, bucket seat, console.
 A.curveBox(-.44,.02,-.46,.44,.13,.45,.11,5,C.ink);
 A.curveBox(-.42,.12,-.46,.42,.30,-.08,.12,5,C.ruby);
 A.box(-.34,.30,-.46,.34,1.94,-.38,5,C.ink);
 A.curveBox(-.41,1.31,-.47,.41,2.13,-.23,.11,5,C.blue);
 A.screen(-.34,1.40,-.485,.34,2.00,60);
 A.curveBox(-.40,2.13,-.46,.40,2.47,-.18,.12,5,C.coral);
 A.label(-.34,2.21,-.472,.34,2.39,61);
 A.led(-.39,2.05,-.49,.39,2.10,-.465,C.cyan,1.2);
 A.curveBox(-.30,.13,.11,.30,.31,.40,.12,5,C.coral);
 A.curveBox(-.30,.32,.18,.30,.47,.44,.07,5,C.black);
 A.curveBox(-.32,.45,.37,.32,1.16,.49,.12,5,C.ruby);
 A.curveBox(-.26,.46,.24,.26,.69,.43,.08,5,C.black);
 A.bar([0,.70,-.12],[0,1.12,-.26],.042,C.steel);
 A.wheel(0,1.13,-.28,.17,C.steel);
 A.box(-.22,.15,-.32,.22,.29,-.19,5,C.steel);
 for(const xx of [-.12,.08])A.box(xx,.15,-.36,xx+.05,.18,-.28,5,C.black);
 for(const z of [-.32,.33])A.led(-.40,.10,z,.40,.14,z+.035,C.cyan,.9);
}
function modelHoops(A){
 // Cage silhouette, elevated backboard, round rim, net and basketball ramp.
 A.curveBox(-.47,.03,-.45,.47,.25,.44,.09,5,C.orange);
 A.q([-.37,.40,.40],[.37,.40,.40],[.29,1.19,-.34],[-.29,1.19,-.34],5,C.tan);
 for(const x of [-.44,.44]){
  A.bar([x,.24,.42],[x,2.48,-.38],.024,C.silver);
  for(let j=0;j<9;j++)A.bar([x,.48+j*.20,.40-j*.07],[x,.45+j*.20,-.41],.009,C.steel);
 }
 A.curveBox(-.42,2.39,-.46,.42,2.73,-.27,.08,5,C.blue);
 A.label(-.37,2.45,-.465,.37,2.68,62);
 A.box(-.28,1.54,-.465,.28,2.35,-.44,5,C.white);
 A.label(-.23,1.68,-.47,.23,2.22,62);
 A.ring(0,1.75,-.26,.17,.020,C.orange,'xz',.4);
 for(let k=0;k<11;k++){
  const a=k*TAU/11;A.bar([Math.cos(a)*.17,1.75,-.26+Math.sin(a)*.17],[Math.cos(a)*.09,1.50,-.26+Math.sin(a)*.09],.006,C.white);
 }
 for(const [x,z] of [[-.24,.22],[.03,.29],[.25,.23]]){
  A.sphere(x,.31,z,.115,C.orange);
  A.ring(x,.31,z,.117,.004,C.ink,'xz');
 }
 A.led(-.39,.12,.40,.39,.18,.44,C.yellow,.85);
}
function modelClaw(A){
 // Transparent-case illusion achieved with real open glass-frame geometry,
 // prizes behind the front pane, overhead grabber and separate control plinth.
 A.curveBox(-.42,.03,-.43,.42,.73,.43,.09,5,C.pink);
 A.curveBox(-.46,2.29,-.46,.46,2.65,.46,.13,5,C.purple);
 A.label(-.38,2.35,-.475,.38,2.56,63);
 for(const x of [-.40,.40])for(const z of [-.38,.40]){
  A.bar([x,.73,z],[x,2.29,z],.023,C.silver);
  A.led(x-.015,.75,z-.02,x+.015,2.28,z+.02,C.cyan,.9);
 }
 for(let k=0;k<6;k++){
  const x=-.24+(k%3)*.23,z=-.21+Math.floor(k/3)*.29;
  const col=[C.plush,C.lavender,C.mint,C.pink,C.yellow,C.tan][k];
  A.sphere(x,1.05,z,.16,col);A.sphere(x,1.25,z,.13,col);
  A.sphere(x-.095,1.34,z,.055,col);A.sphere(x+.095,1.34,z,.055,col);
  A.sphere(x-.045,1.265,z-.12,.019,C.ink);A.sphere(x+.045,1.265,z-.12,.019,C.ink);
 }
 A.bar([.05,2.30,.02],[.05,1.70,.02],.016,C.silver);
 for(const x of [-.06,.06])A.bar([.05,1.74,.02],[x,1.54,-.02],.024,C.steel);
 A.curveBox(-.34,.53,-.48,.34,.70,-.24,.065,5,C.ruby);
 A.bar([-.17,.70,-.43],[-.17,.88,-.43],.021,C.steel);A.sphere(-.17,.88,-.43,.055,C.yellow);
 A.sphere(.16,.71,-.43,.052,C.cyan,7,.70);
 A.curveBox(-.18,.15,-.465,.18,.39,-.43,.025,5,C.black);
 A.led(-.34,.68,-.47,.34,.73,-.46,C.pink,1.1);
}
function modelDance(A){
 A.curveBox(-.43,.03,-.45,.43,.16,.43,.08,5,C.purple);
 A.box(-.33,.16,-.41,.33,2.33,-.29,5,C.ink);
 A.curveBox(-.40,1.24,-.46,.40,2.42,-.22,.08,5,C.blue);
 A.screen(-.32,1.37,-.47,.32,2.21,64);
 A.curveBox(-.42,2.41,-.46,.42,2.76,-.23,.08,5,C.purple);
 A.label(-.33,2.50,-.474,.33,2.67,65);
 // Dual rhythm pads are real flush floor tiles, not hovering pictures.
 for(const x of [-.20,.20]){
  A.curveBox(x-.16,.16,.07,x+.16,.205,.41,.024,5,C.steel);
  const pads=[[-.095,.0],[.095,.0],[0,-.095],[0,.095]];
  for(let k=0;k<pads.length;k++){
   const [dx,dz]=pads[k];
   A.led(x+dx-.042,.206,.24+dz-.037,x+dx+.042,.215,.24+dz+.037,[C.pink,C.cyan,C.yellow,C.mint][k],.9);
  }
 }
 for(const x of [-.25,.25]){
  A.bar([x,.21,-.05],[x,1.19,-.12],.023,C.steel);
  A.bar([x,1.19,-.12],[x*.8,1.19,-.42],.023,C.steel);
 }
 for(const x of [-.29,.29]){
  A.ring(x,.88,-.46,.095,.018,C.cyan,'xy',.7);
  A.sphere(x,.88,-.46,.046,C.black);
 }
 A.led(-.38,.11,.40,.38,.15,.44,C.pink,1.0);
}
function modelAirHockey(A){
 A.curveBox(-.46,.06,-.43,.46,.76,.43,.095,5,C.blue);
 A.curveBox(-.47,.75,-.45,.47,.88,.45,.075,5,C.steel);
 A.q([-.39,.881,-.37],[.39,.881,-.37],[.39,.881,.37],[-.39,.881,.37],6,[.64,1.12,1.27]);
 A.led(-.47,.81,-.46,.47,.87,-.43,C.cyan,1.5);
 A.led(-.47,.81,.43,.47,.87,.46,C.pink,1.3);
 A.ring(0,.887,0,.17,.012,C.ruby,'xz');
 A.bar([0,.888,-.33],[0,.888,.33],.007,C.ruby,7,.08);
 for(const [x,z,c] of [[-.20,-.13,C.ruby],[.24,.12,C.blue]]){
  A.bar([x,.91,z],[x,1.04,z],.04,c);
  A.sphere(x,1.04,z,.06,c);
 }
 A.sphere(0,.909,.05,.038,C.ink);
 A.bar([0,.87,-.43],[0,1.72,-.44],.026,C.steel);
 A.curveBox(-.25,1.65,-.48,.25,1.94,-.39,.07,5,C.purple);
 A.label(-.20,1.72,-.484,.20,1.88,66);
}
function modelBumper(A){
 // Moulded car body, contrasting padded perimeter, headlights and steering.
 A.curveBox(-.46,.05,-.42,.46,.22,.42,.20,5,C.ink);
 A.curveBox(-.42,.21,-.39,.42,.59,.39,.19,5,C.cyan);
 A.curveBox(-.31,.51,-.08,.31,.73,.34,.13,5,C.blue);
 A.curveBox(-.27,.72,.11,.27,1.12,.31,.14,5,C.ink);
 A.bar([0,.62,-.15],[0,.85,-.21],.025,C.steel);A.wheel(0,.85,-.21,.13,C.steel);
 for(const x of [-.27,.27]){
  A.sphere(x,.45,-.35,.08,C.yellow,7,.6);
  A.sphere(x,.42,.35,.053,C.ruby,7,.5);
 }
 for(const x of [-.33,.33])for(const z of [-.30,.30]){
  A.sphere(x,.13,z,.085,C.ink);
 }
 A.led(-.40,.23,-.42,.40,.28,-.385,C.mint,1.1);
 A.led(-.40,.23,.385,.40,.28,.42,C.mint,1.1);
 A.bar([0,1.01,.20],[0,2.20,.20],.015,C.steel);
 A.sphere(0,2.22,.20,.052,C.yellow,7,.75);
}
function modelWheel(A){
 A.curveBox(-.46,.03,-.39,.46,.83,.38,.10,5,C.tan);
 A.curveBox(-.42,.68,-.46,.42,1.11,.44,.10,5,C.purple);
 A.label(-.33,.77,-.472,.33,1.02,67);
 A.bar([-.37,1.00,.16],[-.37,2.37,.16],.038,C.steel);
 A.bar([.37,1.00,.16],[.37,2.37,.16],.038,C.steel);
 A.curveBox(-.44,2.39,-.14,.44,2.65,.21,.11,5,C.coral);
 A.label(-.33,2.45,-.18,.33,2.58,67);
 // Rotating wheel face is the only moving part; turn it via time in dynamic mesh.
 // Coloured prize wedges form a solid, recognizable wheel face.
 for(let k=0;k<16;k++){const a=k*TAU/16,b=(k+1)*TAU/16;
  A.triangle([0,1.74,.081],[Math.cos(a)*.45,1.74+Math.sin(a)*.45,.081],[Math.cos(b)*.45,1.74+Math.sin(b)*.45,.081],5,[C.pink,C.orange,C.cyan,C.purple][Math.floor(k/2)%4]);
 }
 A.ring(0,1.74,.09,.47,.036,C.yellow,'xy',.95);
 for(let k=0;k<16;k++){
  const a=k*TAU/16;
  A.sphere(Math.cos(a)*.48,1.74+Math.sin(a)*.48,.07,.026,k%2?C.pink:C.yellow,7,1.0);
 }
 A.sphere(0,1.74,-.035,.058,C.steel);
 A.triangle([-.075,2.31,-.09],[.075,2.31,-.09],[0,2.15,-.09],5,C.ruby);
}
function modelSkee(A){
 A.curveBox(-.43,.04,-.44,.43,.29,.44,.07,5,C.orange);
 A.q([-.39,.44,.35],[.39,.44,.35],[.25,1.54,-.35],[-.25,1.54,-.35],5,C.tan);
 A.curveBox(-.35,1.47,-.43,.35,2.31,-.27,.075,5,C.blue);
 A.label(-.31,1.55,-.46,.31,2.19,69);
 for(const r of [.22,.14,.067])A.ring(0,1.83,-.48,r,.018,C.yellow,'xy',.7);
 for(let k=0;k<4;k++){
  A.sphere(-.24+k*.17,.35,.20,.063,C.orange);
 }
 A.led(-.38,.17,.37,.38,.22,.41,C.yellow,.8);
}
function modelPinball(A){
 A.curveBox(-.39,.03,-.43,.39,.30,.45,.06,5,C.purple);
 A.q([-.33,.56,.35],[.33,.56,.35],[.29,.91,-.35],[-.29,.91,-.35],11,C.glass);
 for(let k=0;k<6;k++)A.sphere(-.18+(k%3)*.18,.68+(k%2)*.06,-.22+Math.floor(k/3)*.28,.054,[C.pink,C.yellow,C.cyan][k%3],7,.6);
 for(const x of [-.33,.33])for(const z of [-.33,.33])A.bar([x,.10,z],[x,.65,z],.028,C.steel);
 A.curveBox(-.36,.85,-.46,.36,2.05,-.30,.06,5,C.blue);
 A.label(-.30,1.05,-.475,.30,1.91,71);
 A.led(-.34,.87,-.48,.34,.94,-.45,C.pink,.7);
}
function modelPrizes(A){
 A.curveBox(-.44,.02,-.39,.44,.92,.42,.10,5,C.pink);
 A.curveBox(-.46,.85,-.44,.46,1.03,.45,.07,5,C.tan);
 A.curveBox(-.38,1.07,-.38,.38,2.33,.31,.07,5,C.purple);
 for(let j=0;j<3;j++){
  const y=1.21+j*.42;
  A.box(-.33,y,-.38,.33,y+.04,.28,5,C.silver);
  for(let k=0;k<3;k++){
   const x=-.24+k*.24;
   A.curveBox(x-.075,y+.04,-.24,x+.075,y+.27,-.03,.025,5,[C.cyan,C.yellow,C.pink][(j+k)%3]);
   A.sphere(x,y+.29,-.14,.05,C.plush);
  }
 }
 A.curveBox(-.43,2.26,-.45,.43,2.70,-.30,.07,5,C.coral);
 A.label(-.35,2.36,-.42,.35,2.63,70);
}
const BUILDERS={racer:modelRacer,hoops:modelHoops,claw:modelClaw,dance:modelDance,hockey:modelAirHockey,bumper:modelBumper,wheel:modelWheel,skee:modelSkee,pinball:modelPinball,prizes:modelPrizes};
// Expose light-weight diagnostic hooks for testing without needing WebGL.
window.__mazeArcadeV4={shapeArcade,roomsFor,BUILDERS,Asset3D};
const Renderer=window.Maze3DRenderer;if(!Renderer){console.warn('Arcade V4: WebGL renderer unavailable; native fallback remains.');return;}
const proto=Renderer.prototype;
const OLD_ARCH=proto.arcadePlazaArchitecture;
const OLD_CARVE=proto.arcadeCarvePlazas;
const OLD_WALL=proto.arcadeWall;
proto.arcadeCarvePlazas=function(maze,s){
 const rooms=shapeArcade(maze);
 this.arcadePlazas=rooms;
 this.arcadePlazaStats={rooms:rooms.length,newFloors:0};
 this.arcadeV4Islands=new Set(rooms.flatMap(o=>o.props.flatMap(p=>p.cells.map(([r,c])=>r+','+c))));
 this.arcadeV4Props=rooms.flatMap(o=>o.props);
};
// Dedicated replacement of all 3D wall surfaces, preserving existing roof/floor;
// the player's collision and the minimap both use the exact same solid cells.
proto.arcadeWall=function(m,f,zone,h,rand,H){
 const c=Math.floor(Math.min(f.a[0],f.b[0])-(f.side==='e'?.5:0)+.001);
 const r=Math.floor(Math.min(f.a[2],f.b[2])-(f.side==='s'?.5:0)+.001);
 const pKey=r+','+c;
 if(this.arcadeV4Islands&&this.arcadeV4Islands.has(pKey))return;
 const n=({n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]})[f.side];
 const P=(u,y,d)=>[f.a[0]+(f.b[0]-f.a[0])*u+n[0]*d,y,f.a[2]+(f.b[2]-f.a[2])*u+n[1]*d];
 const b=(u0,y0,d0,u1,y1,d1,mat,col,em=0)=>this.arcadeBox(m,f,u0,y0,d0,u1,y1,d1,mat,col,em);
 const base=[[.64,.49,.98],[.69,.45,.81],[.65,.55,.87],[.40,.47,.75],[.57,.51,.91]][zone];
 m.quad(f.a,f.b,f.c,f.d,0,base);
 b(0,0,.025,1,.15,.16,5,C.ink);
 b(0,h-.24,.025,1,h-.08,.15,5,C.purple);
 b(.03,h-.16,.15,.97,h-.115,.19,7,THEMES[zone].accent,.65);
 b(.015,.19,.07,.08,h-.26,.15,5,C.steel);
 b(.92,.19,.07,.985,h-.26,.15,5,C.steel);
 // Architectural rhythm rather than repeated pokie cabinets.
 if((Math.floor(r*11+c*3)%7)===0){
  b(.18,1.33,.08,.82,2.40,.17,5,C.ink);
  b(.21,1.40,.17,.79,2.34,.183,60+([0,3,2,4,6][zone]),C.white,.28);
  b(.15,1.29,.18,.85,1.335,.23,7,THEMES[zone].accent,.9);
  this.arcadeStats.neonSigns++;
 }
};
proto.arcadePlazaArchitecture=function(m,p,h,rand,H){
 // Original grand ceiling trusses and architectural light rims are retained.
 if(typeof OLD_ARCH==='function')OLD_ARCH.call(this,m,p,h,rand,H);
 const zone=THEMES[p.zone]||THEMES[0];
 for(const prop of p.props){
  const build=BUILDERS[prop.kind];if(!build)continue;
  const theta=prop.cells.length>1?PI/2:(prop.spin?PI/2:0);
  const asset=new Asset3D(m,prop.c+.5+(prop.cells.length-1)/2,prop.r+.5,theta);
  asset._v4Wide=prop.cells.length>1;
  build(asset);
  if(this.arcadeStats){this.arcadeStats.v4Attractions=(this.arcadeStats.v4Attractions||0)+1;}
  // A warm lit plinth edge grounds the model, rather than transparent sprite.
  asset.led(-.45,.012,-.45,.45,.030,-.425,zone.accent,.45);
  asset.led(-.45,.012,.425,.45,.030,.45,zone.accent,.45);
 }
 // A restrained overhead colour accent leads students toward each destination.
 const A=new Asset3D(m,p.c+.5,p.r+.5,0);
 A.bar([-.76,h-.18,0],[.76,h-.18,0],.035,zone.accent,7,.95);
};
// Load a fresh atlas of real arcade machine displays, no casino artwork.
proto.loadArcadeSigns=function(){
 const self=this,image=new Image();
 image.onload=()=>{
  if(!self.ready)return;
  const gl=self.gl;
  try{gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,self.arcadeSigns);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);gl.activeTexture(gl.TEXTURE0);
    self.arcadeSignsLoaded=true;
  }catch(e){console.warn('Arcade V4: screen atlas upload failed',e);}
 };
 image.onerror=()=>console.warn('Arcade V4: immersive screen atlas missing');
 image.src='assets/3d/arcade_immersive_screens_v4.png';
};
})();
