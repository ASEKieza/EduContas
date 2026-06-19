"use client";

export default function AngolaWatermark() {

  // ── ESTRELA DE 5 PONTAS ──────────────────────────────────────
  // Centro (272, 150) — raio externo 21, raio interno 8.5
  // Ponta de cima começa a -90°, passo de 36°
  const starD = (() => {
    const cx = 272, cy = 150, Ro = 21, Ri = 8.5;
    let d = "";
    for (let i = 0; i < 10; i++) {
      const a = ((-90) + i * 36) * Math.PI / 180;
      const r = i % 2 === 0 ? Ro : Ri;
      d += (i === 0 ? "M" : "L") +
        (cx + r * Math.cos(a)).toFixed(2) + "," +
        (cy + r * Math.sin(a)).toFixed(2);
    }
    return d + "Z";
  })();

  // ── MEIA ENGRENAGEM (semicírculo inferior) ───────────────────
  // Centro (300, 204) · Ro=67 (pico dos dentes) · Ri=53 (entre dentes)
  // 10 dentes → 20 pontos alternados de 9° cada, de 180° a 360°
  // Fórmula: y = cy − r·sin(a)  [compensa eixo Y invertido no SVG]
  const gearD = (() => {
    const cx = 300, cy = 204, Ro = 67, Ri = 53;
    let d = "";
    for (let i = 0; i <= 20; i++) {
      const a = (180 + i * 9) * Math.PI / 180;
      const r = i % 2 === 0 ? Ri : Ro;
      d += (i === 0 ? "M" : "L") +
        (cx + r * Math.cos(a)).toFixed(2) + "," +
        (cy - r * Math.sin(a)).toFixed(2);
    }
    // Fechar com linha recta no topo (de (cx+Ri, cy) a (cx-Ri, cy))
    return d + "Z";
  })();

  // ── CATANA (lâmina + guarda + punho) ────────────────────────
  // Ângulo ~38° acima horizontal, do canto inferior-esquerdo ao superior-direito
  // Lâmina: paralelo gramo de ~14px de largura
  // Guarda: barra perpendicular à lâmina junto ao punho
  // Punho: rectângulo curto

  // Vectores de direcção da lâmina:
  //   da base (232, 262) até à ponta (368, 149)
  //   vector: (136, -113) — ângulo ≈ 39.7° acima horizontal
  // Vector unitário u: (136, -113) / ||(136,-113)||
  //   magnitude = sqrt(136²+113²) = sqrt(18496+12769) = sqrt(31265) ≈ 176.8
  //   u = (0.769, -0.639)
  // Normal n (90° CCW de u) = (0.639, 0.769)

  // Lâmina — paralelo gramo (base mais larga, ponta mais estreita)
  // Base (t=0): centro=(232,262), meia-largura=8 → ±8·n
  // Ponta (t=1): centro=(368,149), meia-largura=4 → ±4·n
  //   Base-superior:  (232-8·0.639, 262-8·0.769) = (226.9, 255.8)
  //   Base-inferior:  (232+8·0.639, 262+8·0.769) = (237.1, 268.2)
  //   Ponta-inferior: (368+4·0.639, 149+4·0.769) = (370.6, 152.1)
  //   Ponta-superior: (368-4·0.639, 149-4·0.769) = (365.4, 145.9)
  const bladeD =
    "M226.9,255.8 L237.1,268.2 L370.6,152.1 L365.4,145.9 Z";

  // Guarda — barra perpendicular a t≈0.22 da lâmina
  //   Centro guarda: (232+0.22·136, 262+0.22·(-113)) = (261.9, 237.1)
  //   Extensão: ±16·n; largura: ±4·u
  //   Os 4 cantos:
  //   TL: (261.9-16·0.639-4·0.769, 237.1-16·0.769+4·(-0.639))
  //      = (261.9-10.2-3.1, 237.1-12.3-2.6) = (248.6, 222.2)
  //   TR: (261.9+16·0.639-4·0.769, 237.1+16·0.769+4·(-0.639))
  //      = (261.9+10.2-3.1, 237.1+12.3-2.6) = (269.0, 246.8)
  //   BR: (261.9+16·0.639+4·0.769, 237.1+16·0.769+4·0.639)
  //      = (261.9+10.2+3.1, 237.1+12.3+2.6) = (275.2, 252.0)
  //   BL: (261.9-16·0.639+4·0.769, 237.1-16·0.769+4·0.639)
  //      = (261.9-10.2+3.1, 237.1-12.3+2.6) = (254.8, 227.4)
  const guardD =
    "M248.6,222.2 L269.0,246.8 L275.2,252.0 L254.8,227.4 Z";

  // Punho — pequeno rectângulo de t=−0.08 a t=0 da lâmina
  //   De (220,271) a (230,258) — mesmo ângulo
  //   PL: (220-4·0.639, 271-4·0.769) = (217.4, 267.9)
  //   PR: (230-4·0.639, 258-4·0.769) = (227.4, 254.9)
  //   QR: (230+4·0.639, 258+4·0.769) = (232.6, 261.1)
  //   QL: (220+4·0.639, 271+4·0.769) = (222.6, 274.1)
  const gripD =
    "M217.4,267.9 L227.4,254.9 L232.6,261.1 L222.6,274.1 Z";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Metade superior — Vermelho Angola ──────────────────── */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: "50%",
        background: "#CC0000",
        opacity: 0.18,
      }} />

      {/* ── Metade inferior — Preto ────────────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0, height: "50%",
        background: "#111111",
        opacity: 0.18,
      }} />

      {/* ── Emblema Angola — Ouro ──────────────────────────────── */}
      <svg
        viewBox="0 0 600 400"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.20,
          filter: "blur(0.3px)",
        }}
      >
        <g fill="#FFAA00" fillRule="evenodd">
          {/* Meia engrenagem */}
          <path d={gearD} />
          {/* Lâmina da catana */}
          <path d={bladeD} />
          {/* Guarda (cross-guard) */}
          <path d={guardD} />
          {/* Punho */}
          <path d={gripD} />
          {/* Estrela */}
          <path d={starD} />
        </g>
      </svg>
    </div>
  );
}
