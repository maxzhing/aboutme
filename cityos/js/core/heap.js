// Preallocated binary heap used by every shortest-path routine in the sim.
export class Heap {
  constructor(cap) { this.v = new Int32Array(cap); this.d = new Float64Array(cap); this.n = 0; this.cap = cap; this.topV = -1; this.topD = 0; }
  get size() { return this.n; }
  clear() { this.n = 0; }
  push(val, key) {
    if (this.n >= this.cap) return;
    let i = this.n++;
    const v = this.v, d = this.d;
    v[i] = val; d[i] = key;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (d[p] <= d[i]) break;
      const tv = v[p]; v[p] = v[i]; v[i] = tv;
      const td = d[p]; d[p] = d[i]; d[i] = td;
      i = p;
    }
  }
  pop() {
    const v = this.v, d = this.d;
    this.topV = v[0]; this.topD = d[0];
    const n = --this.n;
    if (n > 0) {
      v[0] = v[n]; d[0] = d[n];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let sm = i;
        if (l < n && d[l] < d[sm]) sm = l;
        if (r < n && d[r] < d[sm]) sm = r;
        if (sm === i) break;
        const tv = v[sm]; v[sm] = v[i]; v[i] = tv;
        const td = d[sm]; d[sm] = d[i]; d[i] = td;
        i = sm;
      }
    }
  }
}
