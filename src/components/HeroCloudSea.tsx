import { useEffect, useRef, useState } from 'react'

/**
 * First-person flight over a procedural cloud sea.
 *
 * Technique (not a copy of any one repo):
 * - Screen-space particle heads (PX PUSH / sprite-plane family).
 *   Each cumulus stays round; depth wraps toward the camera so far
 *   heads sit small on a low horizon and near ones peek at the bottom.
 * - Fullscreen WebGL1 fragment shader. No Three.js, no SVG, no images.
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

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Irregular lumpy head — noise on the silhouette so it is a
// cumulus, not a bokeh circle.
float head(vec2 uv, vec2 c, float s, float squash, float seed) {
  vec2 d = (uv - c) / vec2(s, s * squash);
  float r = length(d);
  float n = noise2(d * 3.4 + seed);
  r += (n - 0.5) * 0.34;
  float body = smoothstep(1.08, 0.28, r);
  float lumps = 0.58 + 0.42 * noise2(d * 2.2 + seed * 1.7);
  return body * lumps;
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
  vec3 fw = normalize(vec3(0.02 * sin(t * 0.08), -0.12, 1.0));
  vec3 rgt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 upv = cross(rgt, fw);
  vec3 rd = normalize(uv.x * rgt + uv.y * upv + 1.25 * fw);
  vec3 sunDir = normalize(vec3(0.48, 0.22, 0.82));
  vec3 col = skyColor(rd, sunDir);

  // Particle cloud sea: each head stays round (PX PUSH / sprite-plane
  // family). Depth wraps toward the camera — far = small at a low
  // horizon, near = large and cropped by the section bottom.
  float horizon = -0.24;
  float cover = 0.0;
  float lit = 0.5;
  for (int i = 0; i < 48; i++) {
    float id = float(i);
    float rnd = hash21(vec2(id, 1.7));
    float rnd2 = hash21(vec2(id, 6.3));
    float depth = fract(rnd - t * 0.09);
    float x = (hash21(vec2(id, 2.9)) - 0.5) * mix(2.15, 3.05, depth);
    float y = mix(horizon, -0.66, depth * depth);
    float s = mix(0.05, 0.30, depth * depth);
    float a = head(uv, vec2(x, y), s, 0.80, rnd * 8.0);
    float a2 = head(uv, vec2(x + (rnd2 - 0.5) * s * 0.95, y + s * 0.20), s * 0.64, 0.84, rnd2 * 8.0);
    float a3 = head(uv, vec2(x - (rnd - 0.5) * s * 0.7, y + s * 0.08), s * 0.48, 0.86, rnd * 5.1);
    float puff = max(a, max(a2, a3));
    if (puff > cover) {
      cover = puff;
      lit = 0.35 + 0.65 * rnd2;
    }
  }
  if (cover > 0.02) {
    vec3 shade = mix(vec3(0.42, 0.30, 0.38), vec3(1.06, 0.97, 0.90), lit);
    shade = mix(shade, vec3(1.0, 0.74, 0.46), lit * 0.22);
    col = mix(col, shade, clamp(cover, 0.0, 1.0));
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
      const parent = canvas.parentElement
      const cssW = parent?.clientWidth || canvas.clientWidth || window.innerWidth
      const cssH = parent?.clientHeight || canvas.clientHeight || window.innerHeight
      const w = Math.max(1, Math.floor(cssW * dpr))
      const h = Math.max(1, Math.floor(cssH * dpr))
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
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  )
}
