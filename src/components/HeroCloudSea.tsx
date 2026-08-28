import { useEffect, useRef, useState } from 'react'

/**
 * First-person flight over a procedural cloud sea.
 *
 * Technique (not a copy of any one repo):
 * - Horizontal FBM density slab + fixed-step raymarch — the same family
 *   as IQ's Shadertoy "Clouds", the 42yeah writeup, and xbdev's
 *   "Flying Through Clouds". Camera sits just above the deck and looks
 *   slightly down, so fluffy tops occupy the lower third of the frame.
 * - Fullscreen WebGL1 fragment shader. No Three.js, no SVG, no images.
 * - IQ's original shader is CC BY-NC-SA; this GLSL is our own noise,
 *   lighting, and golden-hour palette.
 */

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform float uQuality;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float a = 0.0;
  float w = 0.5;
  for (int i = 0; i < 5; i++) {
    a += w * noise(p);
    p = p * 2.11 + vec3(1.7, 9.2, 3.4);
    w *= 0.5;
  }
  return a;
}

// Noisy height of the cloud deck. Ridges poke up as sunlit tops.
float deckHeight(vec2 xz) {
  float n = fbm(vec3(xz.x * 0.21, 0.4, xz.y * 0.21));
  float detail = fbm(vec3(xz.x * 0.62, 1.7, xz.y * 0.62));
  return n * 0.72 + detail * 0.22;
}

vec3 skyColor(vec3 rd, vec3 sunDir) {
  float h = rd.y;
  vec3 zenith = vec3(0.020, 0.031, 0.086);
  vec3 mid = vec3(0.145, 0.102, 0.302);
  vec3 hor = vec3(0.96, 0.58, 0.38);
  vec3 col = mix(hor, mid, smoothstep(-0.06, 0.22, h));
  col = mix(col, zenith, smoothstep(0.12, 0.70, h));
  float sun = max(dot(rd, sunDir), 0.0);
  col += vec3(1.00, 0.78, 0.42) * pow(sun, 26.0) * 1.15;
  col += vec3(0.98, 0.64, 0.36) * pow(sun, 4.5) * 0.32;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  float t = uTime;
  // Cockpit just above the deck; slight downward look so fluffy tops
  // occupy the lower third and peek at the section bottom.
  vec3 ro = vec3(0.22 * sin(t * 0.06), 1.18 + 0.04 * sin(t * 0.31), t * 0.55);
  vec3 fw = normalize(vec3(0.03 * sin(t * 0.09), -0.30, 1.0));
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.22 * fw);

  vec3 sunDir = normalize(vec3(0.42, 0.16, 0.86));
  vec3 col = skyColor(rd, sunDir);

  // Height-field cloud sea (flight-sim / layered-plane family).
  // Looking down hits a continuous deck of billows that recede to
  // the horizon — this is the airplane-over-cloud-tops read.
  if (rd.y < -0.018) {
    float tHit = (0.12 - ro.y) / rd.y;
    if (tHit > 0.35 && tHit < 48.0) {
      vec2 xz = (ro + rd * tHit).xz;
      float h = deckHeight(xz);
      float hN = deckHeight(xz + vec2(0.35, 0.0));
      float hS = deckHeight(xz + vec2(0.0, 0.35));
      float slope = clamp(0.55 + (h - hN) * 1.6 + (h - hS) * 0.4, 0.0, 1.0);
      float cover = smoothstep(0.22, 0.46, h);
      vec3 shade = mix(vec3(0.55, 0.42, 0.52), vec3(1.02, 0.96, 0.90), slope);
      shade = mix(shade, vec3(1.0, 0.78, 0.52), 0.22 * max(dot(rd, sunDir), 0.0));
      float fog = 1.0 - exp(-0.0078 * tHit * tHit);
      vec3 cloud = mix(shade, col, fog * 0.72);
      // Near field (bottom of the frame) stays more opaque so tops peek.
      float near = smoothstep(18.0, 3.2, tHit);
      float alpha = cover * mix(0.78, 0.98, near) * (1.0 - fog * 0.28);
      col = mix(col, cloud, clamp(alpha, 0.0, 1.0));
    }
  }

  // Soft volumetric fluff just above the deck so nearby tops feel 3D.
  vec4 sum = vec4(0.0);
  float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  float dist = 0.25 + jitter * 0.08;
  float stepMul = mix(1.85, 1.05, uQuality);
  for (int i = 0; i < 36; i++) {
    if (float(i) > mix(16.0, 36.0, uQuality)) break;
    vec3 p = ro + rd * dist;
    if (p.y < -0.4 || p.y > 1.8 || sum.a > 0.92) break;
    float top = deckHeight(p.xz);
    float d = smoothstep(0.0, 0.28, top - (p.y + 0.08) * 0.85);
    if (d > 0.04) {
      float dif = clamp(0.35 + 0.75 * (top - deckHeight(p.xz + sunDir.xz * 0.4)), 0.0, 1.0);
      vec3 lin = vec3(0.62, 0.55, 0.64) + vec3(0.95, 0.78, 0.5) * dif;
      vec3 albedo = mix(vec3(0.72, 0.62, 0.68), vec3(1.0, 0.97, 0.92), 1.0 - d * 0.35);
      vec3 c = albedo * lin;
      c = mix(c, col, 1.0 - exp(-0.014 * dist * dist));
      float a = d * 0.22;
      sum += vec4(c * a, a) * (1.0 - sum.a);
    }
    dist += max(0.07, 0.05 * dist) * stepMul;
  }

  col = col * (1.0 - sum.a) + sum.rgb;
  col += vec3(1.0, 0.5, 0.26) * pow(max(dot(rd, sunDir), 0.0), 3.0) * 0.12;
  col = pow(col, vec3(0.94));
  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[HeroCloudSea]', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function HeroCloudSea() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[HeroCloudSea]', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uQuality = gl.getUniformLocation(program, 'uQuality')

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let quality = window.innerWidth < 700 ? 0.35 : 1
    let raf = 0
    let visible = true
    let markedReady = false
    const start = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, quality < 1 ? 1 : 1.4)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      quality = window.innerWidth < 700 ? 0.35 : 1
    }

    const draw = (now: number) => {
      if (!visible) return
      resize()
      const t = reduceMotion ? 14 : (now - start) / 1000
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      gl.uniform1f(uQuality, quality)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!markedReady) {
        markedReady = true
        setReady(true)
      }
      if (!reduceMotion) raf = requestAnimationFrame(draw)
    }

    resize()
    raf = requestAnimationFrame(draw)

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible && !reduceMotion) {
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(draw)
        }
      },
      { threshold: 0.05 },
    )
    io.observe(canvas)

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
      gl.deleteBuffer(buf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-0 h-full w-full hero-cloud-sea${ready ? ' is-ready' : ''}`}
      aria-hidden="true"
    />
  )
}
