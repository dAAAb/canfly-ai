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
  float w = 0.52;
  for (int i = 0; i < 5; i++) {
    a += w * noise(p);
    p = p * 2.11 + vec3(1.7, 9.2, 3.4);
    w *= 0.5;
  }
  return a;
}

// Horizontal cloud deck: FBM minus height. High puffs poke up toward
// the camera; the floor is a continuous sea, not floating icons.
float density(vec3 p) {
  vec3 q = vec3(p.x * 0.38, p.y * 0.92, p.z * 0.38);
  float n = fbm(q);
  float ridge = fbm(q * 0.55 + vec3(4.1, 0.0, 2.7));
  float cover = 0.34 + ridge * 0.18;
  return clamp(n - cover - p.y * 0.62, 0.0, 1.0);
}

vec3 skyColor(vec3 rd, vec3 sunDir) {
  float h = rd.y;
  vec3 zenith = vec3(0.020, 0.031, 0.086);
  vec3 mid = vec3(0.145, 0.102, 0.302);
  vec3 hor = vec3(0.937, 0.541, 0.353);
  vec3 col = mix(hor, mid, smoothstep(-0.12, 0.20, h));
  col = mix(col, zenith, smoothstep(0.10, 0.68, h));
  float sun = max(dot(rd, sunDir), 0.0);
  col += vec3(1.00, 0.74, 0.40) * pow(sun, 28.0) * 1.05;
  col += vec3(0.96, 0.62, 0.38) * pow(sun, 5.0) * 0.28;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  float t = uTime;
  // Cockpit just above the deck; look slightly down so cloud tops
  // fill the lower third and peek at the section bottom.
  vec3 ro = vec3(0.18 * sin(t * 0.07), 0.86 + 0.03 * sin(t * 0.28), t * 0.48);
  vec3 fw = normalize(vec3(0.035 * sin(t * 0.11), -0.26, 1.0));
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.28 * fw);

  vec3 sunDir = normalize(vec3(0.38, 0.12, 0.90));
  vec3 col = skyColor(rd, sunDir);

  vec4 sum = vec4(0.0);
  float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  float dist = 0.18 + jitter * 0.06;
  float stepMul = mix(1.7, 1.0, uQuality);
  for (int i = 0; i < 52; i++) {
    if (float(i) > mix(24.0, 52.0, uQuality)) break;
    vec3 p = ro + rd * dist;
    if (p.y < -0.8 || p.y > 2.2 || sum.a > 0.97) break;
    float d = density(p);
    if (d > 0.014) {
      float dif = clamp((d - density(p + sunDir * 0.28)) / 0.45, 0.0, 1.0);
      vec3 lin = vec3(0.40, 0.36, 0.50) + vec3(1.05, 0.82, 0.55) * dif;
      vec3 albedo = mix(vec3(0.28, 0.22, 0.32), vec3(1.0, 0.96, 0.90), 1.0 - d * 0.5);
      vec3 c = albedo * lin;
      c = mix(c, col, 1.0 - exp(-0.010 * dist * dist));
      float a = d * 0.42;
      sum += vec4(c * a, a) * (1.0 - sum.a);
    }
    dist += max(0.048, 0.034 * dist) * stepMul;
  }

  col = col * (1.0 - sum.a) + sum.rgb;
  col += vec3(1.0, 0.48, 0.24) * pow(max(dot(rd, sunDir), 0.0), 3.0) * 0.14;
  col = pow(col, vec3(0.92));
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
