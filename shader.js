/* ============================================================
   shader.js — "Sakura Night" cursor-reactive shader (WebGL1)
   Deep violet night sky, a faint pink grid that warps + glows
   toward the cursor, drifting cherry-blossom petals, and a
   pink/gold bloom that follows the pointer. Auto-orbits when idle.
   ============================================================ */
(function () {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;

  const opts = { antialias: true, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true };
  const gl = canvas.getContext('webgl', opts)
          || canvas.getContext('experimental-webgl', opts);
  if (!gl) { canvas.style.display = 'none'; return; }

  const VERT = `
    attribute vec2 a_pos;
    void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;     // framebuffer px, origin bottom-left
    uniform float u_glow;
    uniform float u_scroll;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm(vec2 p){
      float v = 0.0, amp = 0.5;
      for(int i = 0; i < 5; i++){ v += amp * noise(p); p *= 2.02; amp *= 0.5; }
      return v;
    }
    mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

    void main(){
      vec2 frag = gl_FragCoord.xy;
      vec2 uv = frag / u_res;
      float aspect = u_res.x / u_res.y;
      float t = u_time;

      // --- night sky base (violet gradient) ---
      vec3 bot = vec3(0.078, 0.063, 0.125);   // #141020
      vec3 top = vec3(0.150, 0.115, 0.225);   // lighter violet up top
      vec3 col = mix(bot, top, smoothstep(0.0, 1.0, uv.y));

      vec3 sakura = vec3(0.965, 0.655, 0.776);
      vec3 lilac  = vec3(0.725, 0.659, 0.933);
      vec3 gold   = vec3(0.949, 0.784, 0.475);
      vec3 petalc = vec3(0.988, 0.847, 0.918);

      // --- drifting aurora washes ---
      vec2 q = vec2(uv.x * aspect, uv.y) * 1.3;
      q += 0.4 * vec2(fbm(q + t * 0.025), fbm(q + 4.0 - t * 0.02));
      float wash = fbm(q * 1.1 + t * 0.015);
      col += sakura * smoothstep(0.40, 1.02, wash) * 0.10;
      col += lilac  * smoothstep(0.45, 1.05, fbm(q * 0.8 - t * 0.02)) * 0.085;

      // --- mouse field ---
      float md = distance(frag, u_mouse) / u_res.y;
      float prox = exp(-md * 3.0);
      float halo = exp(-md * 1.2);
      float glow = u_glow;

      // --- warped grid (pink), brighter near cursor ---
      float cell = max(u_res.y / 22.0, 34.0);
      vec2 warp = vec2(fbm(uv * 3.0 + t * 0.05), fbm(uv * 3.0 - t * 0.04 + 9.0)) - 0.5;
      float bend = 0.18 + prox * glow * 0.6;
      vec2 gp = (frag / cell) + warp * bend;
      vec2 gv = abs(fract(gp) - 0.5);
      float lw = 0.03;
      float lines = max(smoothstep(lw, 0.0, gv.x), smoothstep(lw, 0.0, gv.y));
      float node = smoothstep(0.12, 0.0, length(gv));
      float gridA = lines * (0.05 + 0.5 * prox * glow + 0.12 * halo * glow);
      col = mix(col, sakura, clamp(gridA, 0.0, 0.8));
      col += sakura * node * (0.05 + 0.7 * prox * glow);

      // --- falling cherry-blossom petals ---
      vec2 auv = vec2(uv.x * aspect, uv.y);
      vec2 amouse = vec2(u_mouse.x / u_res.y, u_mouse.y / u_res.y);
      const int NP = 18;
      for(int i = 0; i < NP; i++){
        float fi = float(i);
        float s1 = hash(vec2(fi, 1.7));
        float s2 = hash(vec2(fi * 2.3, 5.1));
        float s3 = hash(vec2(fi * 0.7, 9.3));
        float speed = 0.035 + s1 * 0.05;
        float xb = (s2 * 1.06) * aspect;
        float yy = fract(s3 - t * speed);          // 1 -> 0 (falls down)
        float py = yy * 1.25 - 0.12;
        float sway = 0.045 * sin(t * 0.6 + fi * 1.7) + 0.02 * sin(t * 0.23 + fi);
        vec2 pc = vec2(xb + sway, py);
        vec2 pu = auv - pc;
        pu = rot(t * (0.4 + s1 * 0.6) + fi) * pu;
        float sz = 0.011 + s1 * 0.013;
        float d = length(pu / vec2(sz * 1.7, sz));  // elongated petal
        float petal = smoothstep(1.0, 0.0, d);
        float op = 0.14 + 0.18 * s2;
        vec3 pcol = mix(sakura, petalc, s1);
        pcol = mix(pcol, gold, step(0.88, s3) * 0.6); // rare gold mote
        // petals near the cursor catch a little more light
        float catch = exp(-distance(pc, amouse) * 2.2) * glow;
        col += pcol * petal * op * (0.85 + 0.7 * catch + 0.3 * glow);
      }

      // --- pointer bloom ---
      col += sakura * prox * glow * 0.22;
      col += gold   * prox * glow * 0.06;
      col += lilac  * halo * glow * 0.05;

      // --- gentle twinkle ---
      col += 0.010 * sin(frag.y * 0.6 + t * 1.3) * vec3(1.0, 0.92, 0.96);

      // --- vignette ---
      float vig = smoothstep(1.30, 0.30, length(uv - 0.5));
      col *= mix(0.68, 1.0, vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('shader compile error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('program link error:', gl.getProgramInfoLog(prog));
    canvas.style.display = 'none';
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a_pos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

  const u_res = gl.getUniformLocation(prog, 'u_res');
  const u_time = gl.getUniformLocation(prog, 'u_time');
  const u_mouse = gl.getUniformLocation(prog, 'u_mouse');
  const u_glow = gl.getUniformLocation(prog, 'u_glow');
  const u_scroll = gl.getUniformLocation(prog, 'u_scroll');

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.floor(window.innerWidth * dpr);
    H = Math.floor(window.innerHeight * dpr);
    canvas.width = W; canvas.height = H;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  let targX = window.innerWidth / 2, targY = window.innerHeight * 0.4;
  let curX = targX, curY = targY;
  let glow = 0.4, glowTarget = 0.55;
  let lastMove = -9999;

  window.addEventListener('pointermove', (e) => {
    targX = e.clientX; targY = e.clientY;
    lastMove = performance.now();
    glowTarget = 1.0;
  }, { passive: true });
  window.addEventListener('pointerdown', () => { glowTarget = 1.0; });

  window.__pointer = { x: targX, y: targY };

  const start = performance.now();
  function frame(now) {
    const t = (now - start) / 1000;
    const idle = now - lastMove > 1400;
    if (idle) {
      const a = t * 0.35;
      targX = window.innerWidth * (0.5 + 0.28 * Math.cos(a));
      targY = window.innerHeight * (0.45 + 0.22 * Math.sin(a * 1.3));
      glowTarget = 0.55;
    }
    curX += (targX - curX) * 0.06;
    curY += (targY - curY) * 0.06;
    glow += (glowTarget - glow) * 0.04;
    window.__pointer.x = curX; window.__pointer.y = curY;

    const scroll = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);

    gl.uniform2f(u_res, W, H);
    gl.uniform1f(u_time, t);
    gl.uniform2f(u_mouse, curX * dpr, H - curY * dpr);
    gl.uniform1f(u_glow, glow);
    gl.uniform1f(u_scroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
