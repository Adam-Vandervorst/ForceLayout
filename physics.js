class Layout {
    constructor(graph, stiffness, repulsion, damping, energy_threshold, max_speed) {
        this.graph = graph
        this.stiffness = stiffness
        this.repulsion = repulsion
        this.damping = damping
        this.energy_threshold = energy_threshold || 0.01
        this.max_speed = max_speed || Infinity

        this.node_points = {}
        this.edge_springs = {}

        this.domain_size = 2
        this.domain_padding = .075
    }

    point(node) {
        let node_point = this.node_points[node.id]
        if (node_point !== undefined) return node_point

        return this.node_points[node.id] = new Layout.Point(
            Vector.random().multiply(this.domain_size), node.data.mass || 1.)
    }

    spring(edge) {
        let edge_spring = this.edge_springs[edge.id]
        if (edge_spring !== undefined) return edge_spring

        return this.edge_springs[edge.id] = new Layout.Spring(
            this.point(edge.source), this.point(edge.target), edge.data.length || 1., this.stiffness)
    }

    getEdge(source, dest) {
        if (dest === null || source === null) return null
        return source.entity.tentacles.find(t => t.id == dest.id) || null
    }

    mapPoints(f) {
        return this.graph.nodes.map(n => f(n, this.point(n)))
    }

    mapSprings(f) {
        return this.graph.edges.map(e => f(e, this.spring(e)))
    }

    applyCoulombsLaw() {
        this.mapPoints((n1, point1) => {
            this.mapPoints((n2, point2) => {
                if (point1 === point2) return

                const d = point1.p.subtract(point2.p)
                const distance = d.magnitude(), direction = d.normalise()

                const force = direction.multiply(this.repulsion).divide(Math.pow(distance, 2)/2)

                point1.applyForce(force)
                point2.applyForce(force.opposite())
            })
        })
    }

    applyHookesLaw() {
        this.mapSprings((_, spring) => {
            const d = spring.point2.p.subtract(spring.point1.p)
            const displacement = spring.equilibrium - d.magnitude()
            const direction = d.normalise()

            const force = direction.multiply(-spring.k*displacement)

            spring.point1.applyForce(force)
            spring.point2.applyForce(force.opposite())
        })
    }

    attractToCentre() {
        const attraction = this.repulsion*.02
        this.mapPoints((node, point) => {
            const direction = point.p.opposite()

            const force = direction.multiply(attraction)

            point.applyForce(force)
        })
    }

    propagateChange(delta) {
        const activation_energy = .01
        this.mapPoints((node, point) => {
            const new_speed = point.v.add(point.a.multiply(delta)).multiply(this.damping)
            point.a = Vector.zero()

            if (point.energy(new_speed.magnitude()) < activation_energy)
                return point.v = Vector.zero()

            point.v = new_speed.clipNorm(this.max_speed)
            point.p = point.p.add(point.v.multiply(delta))
        })
    }

    totalEnergy() {
        return this.mapPoints((_, point) => point.energy()).reduce((t, e) => t + e, 0)
    }

    tick(delta) {
        this.applyCoulombsLaw()
        this.applyHookesLaw()
        this.attractToCentre()
        this.propagateChange(delta)
    }

    nearest(pos) {
        let min = {node: null, point: null, distance: Infinity}

        this.mapPoints((n, point) => {
            const distance = point.p.subtract(pos).magnitude()

            if (distance < min.distance)
                min = {node: n, point: point, distance: distance}
        })

        return min
    }

    getBoundingBox() {
        let br = Vector.unit().multiply(this.domain_size), tl = br.opposite()

        this.mapPoints((_, point) => {
            tl = tl.min(point.p)
            br = br.max(point.p)
        })

        const padding = br.subtract(tl).multiply(this.domain_padding)
        return [tl.subtract(padding), br.add(padding)]
    }
}

Layout.Point = class Point {
    constructor(pos, mass) {
        this.p = pos
        this.m = mass
        this.v = Vector.zero()
        this.a = Vector.zero()
    }

    applyForce(force) {
        const max_update = 1e2
        if (force.magnitude() < 1) return
        this.a = this.a.add(force.clipNorm(max_update).divide(this.m))
    }

    energy(hypothetical) {
        return this.m*Math.pow(hypothetical || this.v.magnitude(), 2)/2
    }
}

Layout.Spring = class Spring {
    constructor(point1, point2, equilibrium, k) {
        this.point1 = point1
        this.point2 = point2
        this.equilibrium = equilibrium
        this.k = k
    }

    distanceToPoint(point) {
        const n = this.point2.p.subtract(this.point1.p).normalise().normal()
        const ac = point.p.subtract(this.point1.p)
        return Math.abs(ac.inner(n))
    }

    energy(hypothetical) {
        const length = this.point2.p.subtract(this.point1.p).magnitude()
        return this.k*Math.pow(hypothetical || (this.equilibrium - length), 2)/2
    }
}
