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

const linearGen = (start_hue, reverse=false, range=120) => v => {
    if (reverse) v = 1 - v
    const hue = Math.floor((start_hue || 0) + range*v)
    return rgbToHex(...hsvToRgb(hue, .7, .5))
}

const cyclicGen = (start_hue, reverse=false) => v => {
    // TODO temporary, figure out better parametric cyclic color maps
    return v < .5 ? linearGen(start_hue, reverse)(2*v)
                  : linearGen(start_hue, reverse)(2 - 2*v)
}

const color1d = value => {
    const v = Math.floor(value*255)
    return rgbToHex(v, 100 + v/2, 100 - v/2)
}

const color2d = (lightness, [sx, sy]) => {
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

    addNode(data={}) {
        const node_id = `${this.node_count++}`
        const node = new Node(node_id, data)
        this.lookup[node_id] = node
        this.adj[node.id] = []
        return node
    }

    connect(a, b, data={}) {
        if (this.adj[a.id].includes(b.id) || a.id == b.id) return
        const edge = new Edge(a, b, data)
        this.adj[a.id].push(b.id)
        this.adj[b.id].push(a.id)
        this.edges.push(edge)
        return edge
    }

    product(other, type="cartesian") {
        const g = new Graph(), M = {}

        for (const n1 of this.nodes) for (const n2 of other.nodes) {
            M[[n1.id, n2.id]] = g.addNode({
                left: n1.data, right: n2.data,
                colors: [...n1.data.colors || (n1.data.color && [n1.data.color]) || [],
                         ...n1.data.colors || (n2.data.color && [n2.data.color]) || []]})
        }

        for (const n1 of this.nodes) for (const n2 of other.nodes) {
            if (type == "strong" || type == "cartesian")
                for (const nb1 of this.neighbors(n1))
                    g.connect(M[[n1.id, n2.id]], M[[nb1.id, n2.id]])
            if (type == "strong" || type == "cartesian")
                for (const nb2 of other.neighbors(n2))
                    g.connect(M[[n1.id, n2.id]], M[[n1.id, nb2.id]])
            if (type == "strong" || type == "tensor")
                for (const nb1 of this.neighbors(n1)) for (const nb2 of other.neighbors(n2))
                    g.connect(M[[n1.id, n2.id]], M[[nb1.id, nb2.id]])
        }
        return g
    }

    masked(p, q=e => true) {
        const g = new Graph(), ns = new Set()
        g.lookup = Object.fromEntries(Object.entries(this.lookup).filter(([nid, n]) => p(n, this) && ns.add(nid)))
        g.node_count = this.node_count
        g.edges = this.edges.filter(e => ns.has(e.source.id) && ns.has(e.target.id) && q(e, this))
        g.adj = Object.fromEntries(Array.from(ns).map(n => [n, []]))
        g.edges.forEach(e => g.adj[e.source.id].push(e.target.id))
        g.edges.forEach(e => g.adj[e.target.id].push(e.source.id))
        return g
    }

    static genPath(length, cyclic=false) {
        const g = new Graph()
        const color = (cyclic ? cyclicGen : linearGen)(Math.random()*360, Math.random() > .5)

        const nodes = Array(length).fill().map((_, i) => g.addNode({color: color(i/length)}))
        nodes.forEach((n, i) => nodes[i + 1] && g.connect(n, nodes[i + 1]))
        if (cyclic)
            g.connect(nodes[nodes.length - 1], nodes[0])
        return g
    }

    static genTree(arity, depth) {
        const g = new Graph()
        const color = linearGen(Math.random()*360, Math.random() > .5)

        const expand = (p, i, d) => {
            while (i--) {
                const c = g.addNode({label: `${d} ${i}`, child: i, depth: d, color: color(d/depth)})
                g.connect(p, c)
                if (d > 0) expand(c, arity, d - 1)
            }
        }

        const root = g.addNode({label: "root", color: color(1.)})
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
        const color_pos = {1: p => color1d(p[0]), 2: p => color2d(100, p), 3: p => rgbToHex(...p.map(v => 255*v))}[dimensions]
        const nodes = []

        while (--n) {
            const pos = gen_pos(),  color = color_pos && color_pos(pos)
            nodes.push(g.addNode({label: `${n}`, pos: pos, color: color}))
        }

        for (const n1 of nodes) for (const n2 of nodes) {
            const d = l2(n1.data.pos, n2.data.pos)
            if (d > radius) continue
            g.connect(n1, n2, {length: d, color: color1d(d/radius)})
        }
        return g
    }
}
