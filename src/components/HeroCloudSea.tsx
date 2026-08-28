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

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
        mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
        mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float a = 0.0;
  float w = 0.5;
  for (int i = 0; i < 4; i++) {
    a += w * noise(p);
    p = p * 2.11 + vec3(1.7, 9.2, 3.4);
    w *= 0.5;
  }
  return a;
}

// Cellular billows — distinct cumulus heads, not a flat sheet.
float cumulus(vec2 xz, float freq) {
  vec2 p = xz * freq;
  vec2 i = floor(p);
  vec2 f = fract(p);
  float m = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 id = i + g;
      vec2 o = vec2(hash21(id), hash21(id + 19.7));
      vec2 r = g + 0.22 + 0.62 * o - f;
      float d = length(r);
      float blob = smoothstep(1.05, 0.18, d);
      m = max(m, blob * (0.62 + 0.38 * o.x));
    }
  }
  float wrinkle = fbm(vec3(xz * freq * 2.4, 0.6));
  return clamp(m * (0.78 + 0.32 * wrinkle), 0.0, 1.0);
}

float deck(vec2 xz, float tHit) {
  float freq = mix(0.07, 0.13, smoothstep(3.0, 22.0, tHit));
  float big = cumulus(xz, freq);
  float small = cumulus(xz + vec2(8.2, 3.1), freq * 1.7);
  return clamp(max(big, small * 0.72), 0.0, 1.0);
}

vec3 skyColor(vec3 rd, vec3 sunDir) {
  float h = rd.y;
  vec3 zenith = vec3(0.020, 0.031, 0.086);
  vec3 mid = vec3(0.145, 0.102, 0.302);
  vec3 hor = vec3(0.96, 0.58, 0.38);
  vec3 col = mix(hor, mid, smoothstep(-0.02, 0.24, h));
  col = mix(col, zenith, smoothstep(0.14, 0.72, h));
  float sun = max(dot(rd, sunDir), 0.0);
  col += vec3(1.00, 0.78, 0.42) * pow(sun, 26.0) * 1.15;
  col += vec3(0.98, 0.64, 0.36) * pow(sun, 4.5) * 0.32;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  float t = uTime;
  // Horizon sits just below center so the headline stays in sky.
  // Lower third looks down onto nearby tops.
  vec3 ro = vec3(0.18 * sin(t * 0.05), 1.42 + 0.03 * sin(t * 0.27), t * 0.62);
  vec3 fw = normalize(vec3(0.025 * sin(t * 0.08), -0.155, 1.0));
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 upv = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * upv + 1.18 * fw);

  vec3 sunDir = normalize(vec3(0.46, 0.20, 0.84));
  vec3 col = skyColor(rd, sunDir);

  if (rd.y < -0.012) {
    float tHit = (0.08 - ro.y) / rd.y;
    if (tHit > 0.8 && tHit < 55.0) {
      vec2 xz = (ro + rd * tHit).xz;
      float h = deck(xz, tHit);
      float hX = deck(xz + vec2(0.9, 0.0), tHit);
      float hZ = deck(xz + vec2(0.0, 0.9), tHit);
      vec3 N = normalize(vec3(h - hX, 0.42, h - hZ));
      float ndotl = clamp(dot(N, sunDir) * 0.65 + 0.35, 0.0, 1.0);
      vec3 shade = mix(vec3(0.40, 0.30, 0.40), vec3(1.06, 0.98, 0.90), ndotl);
      shade = mix(shade, vec3(1.0, 0.72, 0.42), pow(ndotl, 4.0) * 0.28);
      float fog = 1.0 - exp(-0.0048 * tHit * tHit);
      vec3 cloud = mix(shade, col, fog * 0.78);
      float cover = smoothstep(0.18, 0.48, h);
      float near = smoothstep(20.0, 2.8, tHit);
      float alpha = cover * mix(0.82, 1.0, near) * (1.0 - fog * 0.22);
      col = mix(col, cloud, clamp(alpha, 0.0, 1.0));
    }
  }

  col += vec3(1.0, 0.5, 0.26) * pow(max(dot(rd, sunDir), 0.0), 3.0) * 0.10;
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
