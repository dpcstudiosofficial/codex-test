export function createHUD() {
  const scoreEl = document.getElementById('score');
  const distEl = document.getElementById('distance');
  const nearEl = document.getElementById('nearMisses');
  const messageEl = document.getElementById('message');
  const gauge = document.getElementById('speedometer');
  const ctx = gauge.getContext('2d');

  function resizeGauge() {
    const size = gauge.clientWidth;
    gauge.width = size * window.devicePixelRatio;
    gauge.height = size * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function drawSpeedometer(speedKmh, maxKmh) {
    const w = gauge.clientWidth;
    const h = gauge.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.4;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, r + 14, Math.PI * 0.75, Math.PI * 0.25, false);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 14;
    ctx.stroke();

    const ratio = Math.min(speedKmh / maxKmh, 1);
    const end = Math.PI * (0.75 + 1.5 * ratio);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 14, Math.PI * 0.75, end, false);
    ctx.strokeStyle = '#7dc2ff';
    ctx.lineWidth = 14;
    ctx.stroke();

    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const a = Math.PI * (0.75 + t * 1.5);
      const x0 = cx + Math.cos(a) * (r - 2);
      const y0 = cy + Math.sin(a) * (r - 2);
      const x1 = cx + Math.cos(a) * (r + 10);
      const y1 = cy + Math.sin(a) * (r + 10);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const needleA = Math.PI * (0.75 + ratio * 1.5);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleA) * (r - 14), cy + Math.sin(needleA) * (r - 14));
    ctx.strokeStyle = '#ff8f8f';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f0f6ff';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, Math.round(speedKmh))}`, cx, cy + 12);
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('km/h', cx, cy + 28);
  }

  window.addEventListener('resize', resizeGauge);
  resizeGauge();

  return {
    update({ score, distance, nearMisses, speedKmh, maxKmh, crashed }) {
      scoreEl.textContent = `${Math.floor(score)}`;
      distEl.textContent = `${Math.floor(distance)} m`;
      nearEl.textContent = `${nearMisses}`;
      drawSpeedometer(speedKmh, maxKmh);
      messageEl.classList.toggle('visible', crashed);
    },
  };
}
