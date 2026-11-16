// Zeichnet Übungsfiguren aus Gelenkpunkten (Seitenansicht, Blick nach rechts).
// L = dem Betrachter zugewandte Seite (dunkel), R = abgewandte Seite (hell).
const Fig = (() => {
  const C = { near: '#2e4a49', far: '#6ea9a2', hl: '#e59a1f', hlFar: '#f8d596', prop: '#74b3ab', band: '#c4674a' };
  const ln = (a, b, c, w) =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;

  function render(p) {
    const hl = p.hl || [];
    const col = (name, far) => (far = far && !p.front, hl.includes(name) ? (far ? C.hlFar : C.hl) : far ? C.far : C.near);
    const sh = p.sh || [p.neck[0] + (p.hip[0] - p.neck[0]) * 0.12, p.neck[1] + (p.hip[1] - p.neck[1]) * 0.12];
    const leg = (l, s, far) => {
      const toe = l[2] || [l[1][0] + 8, l[1][1]];
      return ln(p.hip, l[0], col('thigh' + s, far), 7.5) + ln(l[0], l[1], col('shin' + s, far), 6.5) + ln(l[1], toe, col('shin' + s, far), 5);
    };
    const arm = (a, s, far) => ln(sh, a[0], col('arm' + s, far), 5.5) + ln(a[0], a[1], col('arm' + s, far), 5);
    let o = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img">`;
    o += `<defs><marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.hl}"/></marker></defs>`;
    o += `<line x1="6" y1="${p.ground || 112}" x2="114" y2="${p.ground || 112}" stroke="${C.prop}" stroke-width="2" stroke-linecap="round"/>`;
    (p.props || []).forEach(pr => {
      if (pr.t === 'line') o += `<polyline points="${pr.pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${C.prop}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
    o += arm(p.aR, 'R', true) + leg(p.lR, 'R', true);
    o += ln(p.hip, p.neck, col('torso'), 9.5);
    o += `<circle cx="${p.head[0]}" cy="${p.head[1]}" r="7.5" fill="${C.near}"/>`;
    o += leg(p.lL, 'L') + arm(p.aL, 'L');
    (p.props || []).forEach(pr => {
      if (pr.t === 'band') o += `<polyline points="${pr.pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${C.band}" stroke-width="2.5" stroke-linecap="round"/>`;
    });
    if (p.arrow) {
      const [x1, y1, x2, y2, bend = 0] = p.arrow;
      const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
      o += `<path d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${C.hl}" stroke-width="2.2" stroke-dasharray="1 4.5" stroke-linecap="round" marker-end="url(#ah)"/>`;
    }
    return o + '</svg>';
  }
  return { render };
})();
