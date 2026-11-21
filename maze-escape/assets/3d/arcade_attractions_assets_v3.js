/*
 * Bright Arcade — Maze Escape Arcade Adventure — asset-based attractions V3
 * Uses original first-person WebGL projection and depth buffer. The rich, shaded
 * game-machine artwork is displayed INSIDE the 3D world, rooted on real, solid
 * exhibit cells, with distance fog, floor contact shadows and soft colour light.
 * Requires maze3d.js + arcade_attractions_v2.js; only changes Arcade theme.
 */
(function(){'use strict';
 const Renderer=window.Maze3DRenderer;
 if(!Renderer||!window.__arcadeAttractionV2){console.warn('Arcade asset display needs the Arcade V2 renderer.');return;}
 const p=Renderer.prototype;
 // Reproduce the same exhibit cells in the 2D fallback as in the WebGL map.
 window.__mazeArcadeAssetNodesForSize=function(H){
   const corner=H<=17?4:H<=25?6:8,rad=H<=17?2:H<=25?3:4;
   const mid=Math.floor(H/2),end=H-1-corner;
   const defs=[{zone:0,r:corner,c:corner},{zone:1,r:corner,c:end},
      {zone:2,r:end,c:corner},{zone:3,r:end,c:end},{zone:4,r:mid,c:mid}];
   const kinds=[['racer','skee','racer','wheel'],['claw','wheel','claw','skee'],
      ['hoops','skee','hockey','hoops'],['dance','hockey','dance','claw'],
      ['bumper','hockey','wheel','bumper']];
   const n=H<=17?2:H<=25?3:4,result=[];
   for(const q of defs){
     const candidates=[[0,0],[q.r<H/2?2:-2,q.c<H/2?1:-1],
      [q.r<H/2?-2:2,q.c<H/2?-1:1],[0,q.c<H/2?2:-2]];
     if(q.zone===4)candidates.splice(1,3,[-2,-2],[2,2],[-2,2]);
     for(let i=0;i<n;i++){
       const [dr,dc]=candidates[i],r=q.r+dr,c=q.c+dc;
       if(r<2||c<2||r>H-3||c>H-3||result.some(x=>x.r===r&&x.c===c))continue;
       result.push({r,c,zone:q.zone,kind:kinds[q.zone][i]});
     }
   }
   return result;
 };

 const TYPE={
   racer:{tile:0,height:2.48,width:2.44,light:[.12,.79,1.0]},
   claw:{tile:1,height:2.52,width:2.52,light:[1.0,.26,.66]},
   hoops:{tile:2,height:2.58,width:2.58,light:[1,.42,.14]},
   dance:{tile:3,height:2.43,width:2.43,light:[.72,.30,.99]},
   bumper:{tile:4,height:1.62,width:1.66,light:[.22,1,.67]},
   hockey:{tile:5,height:1.39,width:1.39,light:[.12,.82,1]},
   wheel:{tile:6,height:2.38,width:2.38,light:[1,.72,.12]},
   // A second basketball/air-hockey exhibit replaces the former polygon skee-ball.
   skee:{tile:2,height:2.47,width:2.47,light:[1,.45,.18]}
 };
 const SWAP=TYPE;
 const vs=`precision highp float;
 attribute vec3 aPosition;attribute vec2 aUV;
 uniform vec3 uEye;uniform float uAngle;uniform float uAspect;uniform float uFocus;uniform float uScale;
 uniform float uBob;uniform float uPitch;
 varying vec2 vUV;varying float vDistance;
 void main(){
   vec3 pos=aPosition;pos.xz*=uScale;vec3 rel=pos-uEye;
   float cs=cos(uAngle),sn=sin(uAngle);
   float side=-sn*rel.x+cs*rel.z;
   float forward=cs*rel.x+sn*rel.z;
   float vertical=rel.y-uBob;
   float depth=forward*cos(uPitch)+vertical*sin(uPitch);
   float high=vertical*cos(uPitch)-forward*sin(uPitch);
   float nearP=.06,farP=92.;
   gl_Position=vec4(side*uFocus/uAspect,high*uFocus,(farP+nearP)/(farP-nearP)*depth-2.*farP*nearP/(farP-nearP),depth);
   vUV=aUV;vDistance=depth;
 }`;
 const fs=`precision mediump float;
 varying vec2 vUV;varying float vDistance;
 uniform sampler2D uSpriteAtlas;
 uniform vec2 uAtlasScale;uniform vec2 uAtlasOffset;
 uniform vec3 uFog;uniform vec3 uAccent;
 uniform float uTime;uniform float uShadow;uniform float uGlow;
 void main(){
  if(uShadow>.5){
    float radial=length(vUV*2.0-1.0);
    float fade=(1.0-smoothstep(.11,.96,radial));
    float flicker=.86+.14*sin(uTime*2.9);
    if(uGlow>.5){
      float a=.13*fade*flicker;
      if(a<.006)discard;
      gl_FragColor=vec4(uAccent*.58,a);return;
    }
    float a=.40*fade;
    if(a<.006)discard;
    gl_FragColor=vec4(vec3(.015,.009,.045),a);return;
  }
  vec4 pixel=texture2D(uSpriteAtlas,uAtlasOffset+uAtlasScale*vUV);
  if(pixel.a<.065)discard;
  float ambient=.79+.035*sin(uTime*1.7+uAtlasOffset.x*10.0);
  vec3 rgb=pixel.rgb*ambient;
  // Gentle animated coloured spill from LEDs, rather than whole-sprite flashes.
  float shine=pow(max(max(pixel.r,pixel.g),pixel.b),2.5);
  float active=.45+.55*(.5+.5*sin(uTime*3.1+uAtlasOffset.x*16.0));
  rgb+=uAccent*shine*.095*active;
  float fog=smoothstep(10.,40.,vDistance)*.24;
  rgb=mix(rgb,uFog,fog);
  gl_FragColor=vec4(rgb,pixel.a);
 }`;
 function shader(gl,type,code){let s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(s));throw Error('Arcade asset shader failed');}return s;}
 function createProgram(gl){const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Arcade asset program link failed: '+gl.getProgramInfoLog(program));return program;}
 function init(renderer){
   const gl=renderer.gl,program=createProgram(gl),vbo=gl.createBuffer();
   const uniforms={};for(const n of ['uEye','uAngle','uAspect','uFocus','uScale','uBob','uPitch','uSpriteAtlas','uAtlasScale','uAtlasOffset','uFog','uAccent','uTime','uShadow','uGlow'])uniforms[n]=gl.getUniformLocation(program,n);
   const pos=gl.getAttribLocation(program,'aPosition'),uv=gl.getAttribLocation(program,'aUV');
   const texture=gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   const obj={program,vbo,uniforms,pos,uv,texture,loaded:false,failed:false};
   const image=new Image();
   image.onload=()=>{try{
     gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,texture);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.activeTexture(gl.TEXTURE0);obj.loaded=true;
   }catch(err){console.error('Arcade display texture upload failed',err);obj.failed=true;}};
   image.onerror=()=>{obj.failed=true;console.error('Missing Arcade asset atlas at assets/3d/arcade_attractions_atlas.webp');};
   image.src='assets/3d/arcade_attractions_atlas.webp';
   return obj;
 }
 // Each pose is a real WebGL quad with perspective, occlusion and contact with the
 // existing 3D floor. The cutout faces the camera, so detailed machinery retains
 // its rich painted 3D appearance while students walk around the solid exhibit.
 function plane(gl,obj,vertices){
   gl.bindBuffer(gl.ARRAY_BUFFER,obj.vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(obj.pos);gl.vertexAttribPointer(obj.pos,3,gl.FLOAT,false,20,0);
   gl.enableVertexAttribArray(obj.uv);gl.vertexAttribPointer(obj.uv,2,gl.FLOAT,false,20,12);
   gl.drawArrays(gl.TRIANGLES,0,6);
 }
 function quad(p0,p1,p2,p3){let d=[];function v(p,u,w){d.push(p[0],p[1],p[2],u,w)}
   v(p0,0,0);v(p1,1,0);v(p2,1,1);v(p0,0,0);v(p2,1,1);v(p3,0,1);return d;}
 function worldShadow(x,z,size,y=.061){return quad([x-size,y,z-size],[x+size,y,z-size],[x+size,y,z+size],[x-size,y,z+size]);}
 function spriteWorld(x,z,width,height,angle){
   const s=Math.sin(angle),c=Math.cos(angle),hw=width*.5;
   // right hand side of camera: +(-sin(angle), cos(angle))
   const dx=-s*hw,dz=c*hw;
   return quad([x-dx,0.018,z-dz],[x+dx,0.018,z+dz],[x+dx,height,z+dz],[x-dx,height,z-dz]);
 }
 function drawAssets(renderer,now){
   const state=renderer.getState();
   if(!state||state.theme!=='classic'||!renderer.arcadeDisplayNodes?.length)return;
   const gl=renderer.gl;if(!gl)return;
   const obj=renderer.__arcadeAssetRenderer||(renderer.__arcadeAssetRenderer=init(renderer));
   if(!obj.loaded)return;
   const canvas=renderer.canvas,angle=state.playerAngle,eye=[state.playerX*1.36,.88,state.playerY*1.36];
   const nodes=renderer.arcadeDisplayNodes.filter(n=>SWAP[n.kind]);
   const maxDistance=28;
   const list=nodes.map(n=>({n,d:Math.hypot(n.c+.5-state.playerX,n.r+.5-state.playerY)})).filter(o=>o.d<maxDistance).sort((a,b)=>b.d-a.d);
   if(!list.length)return;
   const programBefore=gl.getParameter(gl.CURRENT_PROGRAM);
   const activeBefore=gl.getParameter(gl.ACTIVE_TEXTURE);
   const blendBefore=gl.isEnabled(gl.BLEND);
   const depthBefore=gl.isEnabled(gl.DEPTH_TEST);
   const maskBefore=gl.getParameter(gl.DEPTH_WRITEMASK);
   const cullBefore=gl.isEnabled(gl.CULL_FACE);
   gl.useProgram(obj.program);
   const u=obj.uniforms;
   gl.uniform3fv(u.uEye,eye);gl.uniform1f(u.uAngle,angle);gl.uniform1f(u.uAspect,canvas.width/canvas.height);
   gl.uniform1f(u.uFocus,1.35);gl.uniform1f(u.uScale,1.36);gl.uniform1f(u.uBob,Math.sin(state.headBob||0)*.025*(state.moveBlend||0));gl.uniform1f(u.uPitch,.015);
   gl.uniform1f(u.uTime,now*.001);gl.uniform3fv(u.uFog,[.24,.12,.39]);
   gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,obj.texture);gl.uniform1i(u.uSpriteAtlas,4);
   gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
   // Dark contact under every machine, plus a faint animated RGB light spill.
   gl.uniform1f(u.uShadow,1);gl.uniform2f(u.uAtlasScale,1,1);gl.uniform2f(u.uAtlasOffset,0,0);
   for(const {n} of list){
     const item=SWAP[n.kind],x=n.c+.5,z=n.r+.5;
     gl.uniform3fv(u.uAccent,item.light);gl.uniform1f(u.uGlow,0);plane(gl,obj,worldShadow(x,z,.83,.040));
     gl.uniform1f(u.uGlow,1);plane(gl,obj,worldShadow(x,z,1.12,.042));
   }
   // Depth-tested lit atlas sprites; one texture and one shader for every cabinet.
   gl.uniform1f(u.uShadow,0);gl.uniform1f(u.uGlow,0);
   for(const {n} of list){
      const item=SWAP[n.kind],x=n.c+.5,z=n.r+.5,index=item.tile;
      // Each half-image cell is padded by the atlas generator for safe alpha edges.
      gl.uniform2f(u.uAtlasScale,1/4,1/2);
      gl.uniform2f(u.uAtlasOffset,(index%4)/4,(1-Math.floor(index/4))/2);
      gl.uniform3fv(u.uAccent,item.light);
      plane(gl,obj,spriteWorld(x,z,item.width,item.height,angle));
   }
   gl.depthMask(maskBefore);
   if(cullBefore)gl.enable(gl.CULL_FACE);
   if(!depthBefore)gl.disable(gl.DEPTH_TEST);
   if(!blendBefore)gl.disable(gl.BLEND);
   gl.activeTexture(activeBefore);
   gl.useProgram(programBefore);
 }
 const oldDraw=p.draw;
 p.draw=function(now){oldDraw.call(this,now);try{drawAssets(this,now);}catch(e){if(!this.__arcadeAssetError){console.error('Arcade attraction display error',e);this.__arcadeAssetError=true;}}};
 // Remove ONLY the old chunky attraction models; preserve ceiling architecture
 // and keep the original maze's 3D walls, doors, word orbs and floors.
 p.arcadePlazaArchitecture=function(m,room,height,random,H){
    const cols=[[.28,1.08,1.25],[1.22,.31,.81],[1.28,.87,.25],[.89,.42,1.2],[.25,1.12,.67]];
    const col=cols[room.zone||0];
    const y=height-.11;
    const x0=room.minC+.1,x1=room.maxC+.9,z0=room.minR+.1,z1=room.maxR+.9;
    // Restrained luminaire edge strips suspended from the ceiling.
    m.box(x0,y,z0,x1,y+.025,z0+.032,7,col,.30);
    m.box(x0,y,z1-.03,x1,y+.025,z1,7,col,.30);
    m.box(x0,y,z0,x0+.03,y+.025,z1,7,col,.30);
    m.box(x1-.03,y,z0,x1,y+.025,z1,7,col,.30);
    this.arcadeStats.plazas++;
 };
 // V2's rotating polygonal wheel was part of the previous crude model. The new
 // textured prize wheel includes a finished round wheel, so omit those polygons.
 p.dynamicMesh=function(s,now){
    const mesh=this.makeGateMesh(s,this.smoothUnlock);
    for(const token of s.tokens||[])if(!s.collected[token.word])this.addToken(mesh,token,now,s.theme);
    return new Float32Array(mesh.v);
 };
 window.__arcadeAssetV3=true;
 console.info('Arcade Adventure V3: detailed shaded attraction assets enabled');
})();
