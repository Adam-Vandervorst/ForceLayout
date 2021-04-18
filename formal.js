const clampByte = v => Math.max(Math.min(Math.round(v), 255), 0)

const rgbToHex = (r, g, b) => '#' + [r, g, b]
    .map(clampByte)
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')

const rgbToYuv = (r, g, b) =>
           [   0.299*r +    0.587*g +    0.114*b,
            -0.14713*r + -0.28886*g +    0.436*b + 128,
               0.615*r + -0.51499*g + -0.10001*b + 128].map(clampByte)

const yuvToRgb = (y, u, v) =>
           [y +        0*(u - 128) + 1.13983*(v - 128),
            y + -0.39465*(u - 128) + -0.5806*(v - 128),
            y +  2.03211*(u - 128) +       0*(v - 128)].map(clampByte)

const hsvToRgb = (h, s, v) => {
    const f = n => {
        const k = (n + h/60) % 6
        return v - v*s*Math.max(Math.min(k, 4-k, 1), 0)
    }
    return [5, 3, 1].map(i => Math.floor(255*f(i)))
}

const color_1d = value => {
    const v = Math.floor(value*255)
    return rgbToHex(v, 100 + v/2, 100 - v/2)
}

const color_2d = (lightness, [sx, sy]) => {
    const yuv = [20 + .8*lightness, 255*sx, 255*sy]
    return rgbToHex(...yuvToRgb(...yuv))
}

class Node {
    constructor(id, data) {
        this.id = id
        this.data = data
    }
}

class Edge {
    constructor(a, b, data) {
        this.id = `${a.id} - ${b.id}`
        this.source = a
        this.target = b
        this.data = data
    }
}

class Graph {
    constructor() {
        this.edges = []
        this.lookup = {}
        this.adj = {}

        this.node_count = 0
    }

    get nodes() {
        return Object.values(this.lookup)
    }

    neighbors(a) {
        return this.adj[a.id].map(nid => this.lookup[nid])
    }

    addNode(data) {
        const node_id = `${this.node_count++}`
        const node = new Node(node_id, data)
        this.lookup[node_id] = node
        this.adj[node.id] = []
        return node
    }

    connect(a, b, data) {
        if (this.adj[a.id].includes(b.id) || a.id == b.id) return
        const edge = new Edge(a, b, data)
        this.adj[a.id].push(b.id)
        this.adj[b.id].push(a.id)
        this.edges.push(edge)
        return edge
    }

    masked(p, q=e => true) {
        const g = new Graph(), ns = new Set()
        g.lookup = Object.fromEntries(Object.entries(this.lookup).filter(([nid, n]) => p(n, this) && ns.add(nid)))
        g.edges = this.edges.filter(e => ns.has(e.source.id) && ns.has(e.target.id) && q(e, this))
        g.adj = Object.fromEntries(Array.from(ns).map(n => [n, []]))
        g.edges.forEach(e => g.adj[e.source.id].push(e.target.id))
        g.edges.forEach(e => g.adj[e.target.id].push(e.source.id))
        return g
    }

    static genTree(arity, depth) {
        const g = new Graph()

        const expand = (p, i, d) => {
            while (i--) {
                const c = g.addNode({label: `${d} ${i}`, child: i, depth: d})
                g.connect(p, c, {color: rgbToHex(...hsvToRgb(0, 1, d/depth))})
                if (d > 0) expand(c, arity, d - 1)
            }
        }

        const root = g.addNode({label: "root"})
        expand(root, arity, depth - 1)
        return g
    }

    static genErosRenyi(n, m) {
        const g = new Graph()
        const nodes = Array(n).fill().map((_, i) => g.addNode({label: `${i}`, index: i}))

        while (m) {
            let i = Math.floor(n*Math.random()), j = Math.floor(n*Math.random())
            let ni = nodes[i], nj = nodes[j]
            if (g.connect(ni, nj, {color: rgbToHex(255*i/n, 0, 255*j/n), index: m})) --m
        }
        return g
    }

    static genWithinSphere(n, dimensions, radius) {
        const g = new Graph()
        const l2 = (u, v) => Math.sqrt(u.reduce((t, a, i) => t + Math.pow(a-v[i], 2), 0.))
        const gen_pos = () => Array(dimensions).fill().map(_ => Math.random())
        const nodes = []

        while (--n) {
            const pos = gen_pos(), color = pos.length == 2 ? color_2d(100, pos) : undefined
            nodes.push(g.addNode({label: `${n}`, pos: pos, color: color}))
        }

        for (const n1 of nodes) for (const n2 of nodes) {
            const d = l2(n1.data.pos, n2.data.pos)
            if (d > radius) continue
            g.connect(n1, n2, {length: d, color: color_1d(d/radius)})
        }
        return g
    }
}
