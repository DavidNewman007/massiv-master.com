// Живой туман на фоне: WebGL-шейдер с «закрученным» шумом (domain warping fbm).
// Лёгкий: ~4 КБ, без картинок; считается в пониженном разрешении (туман мягкий —
// разницы не видно), в покое ≤30 кадров/с, стоит на паузе в скрытой вкладке.
// Без WebGL или при «уменьшить движение» остаётся статичный CSS-градиент body::before.
(() => {
  const c = document.querySelector('canvas.fog');
  if (!c) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = c.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) return;

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `precision mediump float;
uniform vec2 R;uniform float T;uniform float S;uniform vec3 A;uniform vec3 B;uniform vec3 D;uniform vec3 M;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;
  vec2 p=vec2(uv.x*R.x/R.y,uv.y)*1.15+vec2(0.,S*.25);
  float t=T*.07;
  vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t*.8));
  vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*1.2),fbm(p+3.*q+vec2(8.3,2.8)-t*.9));
  float f=fbm(p+2.6*r);
  // тонкие струйки — второй слой, движется навстречу крупным облакам
  float w=fbm(p*2.3+1.4*r+vec2(-t*1.6,t*.5));
  float g=clamp((uv.x+1.-uv.y)*.5,0.,1.);
  // палитра: A→B база по диагонали, D — тени между клубами, M — светлая дымка
  vec3 col=mix(A,B,smoothstep(0.,1.,g));
  col=mix(col,D,smoothstep(.52,.14,f)*.38);
  col=mix(col,M,smoothstep(.40,.84,f)*.88);
  col=mix(col,min(M+.015,vec3(1.)),smoothstep(.56,.86,w)*.4);
  gl_FragColor=vec4(col,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // один треугольник на весь экран
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uS = gl.getUniformLocation(pr, 'S');
  const uA = gl.getUniformLocation(pr, 'A'), uB = gl.getUniformLocation(pr, 'B'), uD = gl.getUniformLocation(pr, 'D'), uM = gl.getUniformLocation(pr, 'M');
  // Палитра тумана; варианты для сравнения — на varianty/fon.html.
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  let pal = { a: '#ddd8d1', b: '#c1b8ad', d: '#a2978a', m: '#f7f3ed' }; // «Дымчатый орех» (выбор владельца 22.10.2026)
  const setPal = () => { gl.uniform3fv(uA, hex(pal.a)); gl.uniform3fv(uB, hex(pal.b)); gl.uniform3fv(uD, hex(pal.d)); gl.uniform3fv(uM, hex(pal.m)); };
  setPal();
  // для страницы подбора палитр (varianty/fon.html): window.mmFog.set({a,b,d,m})
  window.mmFog = { set: (p) => { pal = { ...pal, ...p }; setPal(); if (reduce) draw(40); } };

  const scale = () => (innerWidth < 800 ? 0.32 : 0.45);
  const resize = () => { c.width = Math.max(2, Math.round(innerWidth * scale())); c.height = Math.max(2, Math.round(innerHeight * scale())); gl.viewport(0, 0, c.width, c.height); };
  resize(); addEventListener('resize', () => { resize(); if (reduce) draw(40); }, { passive: true });

  let scroll = 0;
  const draw = (t) => {
    const target = scrollY / Math.max(1, innerHeight);
    scroll += (target - scroll) * 0.08;
    gl.uniform2f(uR, c.width, c.height); gl.uniform1f(uT, t); gl.uniform1f(uS, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  draw(40); c.classList.add('on');
  if (reduce) return;

  // Скорость тумана: в покое — медленное «дыхание»; при прокрутке плавно разгоняется
  // пропорционально скорости листания и так же плавно гаснет после остановки.
  // Время шейдера — накопленная «фаза», а не часы, поэтому смена скорости без рывков.
  const IDLE = 0.32, MAXBOOST = 7;
  let phase = 40, speed = IDLE, prevY = scrollY, prevT = performance.now(), last = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (document.hidden) { prevT = now; return; }
    const dt = Math.min(0.1, (now - prevT) / 1000); prevT = now;
    const v = Math.abs(scrollY - prevY) / Math.max(dt, 0.001); prevY = scrollY; // px/с
    const target = IDLE * (1 + Math.min(MAXBOOST, v / 450));
    // разгон чуть быстрее, торможение — медленно и мягко
    speed += (target - speed) * (target > speed ? 0.06 : 0.025);
    phase += dt * speed;
    // в покое хватает 30 кадров/с, во время разгона рисуем каждый кадр — так плавнее
    if (speed < IDLE * 1.15 && now - last < 33) return;
    last = now; draw(phase);
  };
  requestAnimationFrame(loop);
  window.mmFog.state = () => ({ speed: +speed.toFixed(3), idle: IDLE }); // для отладки
})();
