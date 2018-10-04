
import { Vector3vl } from '3vl';

export { Vector3vl };

export class Waveform {
    private _present : number;

    constructor(private readonly _bits : number, private readonly _data : [number, Vector3vl][] = []) {
        if (_data.length == 0) this._present = -1;
        else this._present = this._data[this._data.length-1][0];
    }

    get bits() {
        return this._bits;
    }

    push(t : number, v : Vector3vl) {
        console.assert(v.bits == this._bits && t > this._present);
        this._present = t;
        if (this._data.length > 0) {
            const [pt, pv] = this._data[this._data.length-1];
            if (pv.eq(v)) return;
            console.assert(t > pt);
        }
        this._data.push([t, v]);
    }

    getRange(i : number, n : number) {
        if (this._data.length == 0) return [];
        const binsearch = (k : number) => {
            let first = 0, last = this._data.length;
            while (last > first) {
                const middle = (first + last) >> 1;
                const mtick = this._data[middle][0];
                if (k == mtick) return middle;
                else if (k < mtick) last = middle;
                else first = middle + 1;
            }
            return first;
        };
        let first = binsearch(i);
        let last = binsearch(i+n);
        if (first > 0 && this._data[first][0] > i) first--;
        if (last < this._data.length-1 && this._data[last][0] < i+n) last++;
        const s = this._data.slice(first, last + 1);
        if (s[s.length-1][0] < i+n && this._present > s[s.length-1][0])
            s.push([this._present, s[s.length-1][1]]);
        return s;
    }
}

export interface WaveCanvasSettings {
    start : number,
    span : number,
    bitColors : [string, string, string, string],
    heightFill : number,
    gapScale : number
}

export const defaultSettings : WaveCanvasSettings = {
    start: 0,
    span: 0,
    bitColors: ['#fc7c68', '#999', '#03c03c', '#779ecb'],
    gapScale: 0.2,
    heightFill: 0.8
};

Object.freeze(defaultSettings);

export function extendSettings(settings : WaveCanvasSettings, newSettings) : WaveCanvasSettings {
    var props = {};
    for (const [k, v] of Object.entries(newSettings)) {
        props[k] = {value: v};
    }
    const ret = Object.create(settings, props);
    return ret;
}

export function drawWaveform(w : Waveform, c : CanvasRenderingContext2D, s : WaveCanvasSettings) {
    const data = w.getRange(s.start, s.span);
    const zdata = data.map((e, i) => [e, data[i+1]]);
    zdata.pop();
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    const t2x = (t) => (t - s.start) / s.span * c.canvas.width;
    const xy = 0.5 * c.canvas.height;
    const hy = (0.5 - s.heightFill / 2) * c.canvas.height;
    const ly = (0.5 + s.heightFill / 2) * c.canvas.height;
    const b2y = (b) => [ly, xy, hy][b+1];
    const b2c = (b) => s.bitColors[b+1];
    const w2c = (w) => s.bitColors[!w.isDefined ? 1 : w.isLow ? 0 : w.isHigh ? 2 : 3];
    const grad = c.createLinearGradient(0, ly, 0, hy);
    grad.addColorStop(0, s.bitColors[0]);
    grad.addColorStop(0.5, s.bitColors[1]);
    grad.addColorStop(1, s.bitColors[2]);
    c.lineWidth = 0.5;
    for (const t of Array(s.span).keys()) {
        const x = t2x(t + s.start);
        c.beginPath();
        c.strokeStyle = 'gray';
        c.moveTo(x, 0);
        c.lineTo(x, c.canvas.height);
        c.stroke();
    }
    c.lineWidth = 2;
    for (const [[at, av], [bt, bv]] of zdata) {
        const ax = t2x(at), bx = t2x(bt);
        if (w.bits == 1) {
            const ab = av.get(0), bb = bv.get(0);
            const ay = b2y(ab), by = b2y(bb);
            const ac = b2c(ab), bc = b2c(bb);
            const gap = Math.min(Math.abs(ay-by) * s.gapScale, c.canvas.width / s.span / 2);
            c.beginPath();
            c.strokeStyle = grad;
            c.moveTo(bx - gap, ay);
            c.lineTo(bx, by);
            c.stroke();
            c.beginPath();
            c.strokeStyle = ac;
            c.moveTo(ax, ay);
            c.lineTo(bx - gap, ay);
            c.stroke();
        } else {
            const gap = Math.min(Math.abs(hy-ly) * s.gapScale, c.canvas.width / s.span / 2);
            const ac = w2c(av), bc = w2c(bv);
            const ad = av.isDefined, bd = bv.isDefined;
            if (!ad && !bd) {
                c.beginPath();
                c.strokeStyle = ac;
                c.moveTo(ax, xy);
                c.lineTo(bx, xy);
                c.stroke();
            } else if (av.eq(bv)) {
                c.strokeStyle = bc;
                c.beginPath();
                c.moveTo(ax, hy);
                c.lineTo(bx, hy);
                c.stroke();
                c.beginPath();
                c.moveTo(ax, ly);
                c.lineTo(bx, ly);
                c.stroke();
            } else {
                c.strokeStyle = bc;
                if (bd) {
                    c.beginPath();
                    c.moveTo(bx, hy);
                    c.lineTo(bx - gap/2, xy);
                    c.lineTo(bx, ly);
                    c.stroke();
                } else {
                    c.beginPath();
                    c.moveTo(bx, xy);
                    c.lineTo(bx - gap/2, xy);
                    c.stroke();
                }
                c.strokeStyle = ac;
                if (ad) {
                    c.beginPath();
                    c.moveTo(ax, hy);
                    c.lineTo(bx - gap, hy);
                    c.lineTo(bx - gap/2, xy);
                    c.lineTo(bx - gap, ly);
                    c.lineTo(ax, ly);
                    c.stroke();
                } else {
                    c.beginPath();
                    c.moveTo(ax, xy);
                    c.lineTo(bx - gap/2, xy);
                    c.stroke();
                }
            }
        }
    }
}

