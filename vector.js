class Vector {
    constructor(x, y) {
        this.x = x
        this.y = y
    }

    toString() {
        return `Vector(${this.x}, ${this.y})`
    }

    [Symbol.iterator]() {
        return [this.x, this.y].values()
    }

    static fromPolar(r, angle) {
        return new Vector(r*Math.cos(angle), r*Math.sin(angle))
    }

    static zero() {
        return new Vector(0, 0)
    }

    static unit() {
        return new Vector(1, 1)
    }

    static random() {
        return new Vector(2*Math.random() - 1, 2*Math.random() - 1)
    }

    round(direction="nearest") {
        const round = {nearest: Math.round, up: Math.ceil, down: Math.floor}[direction]
        return new Vector(round(this.x), round(this.y))
    }

    copy() {
        return new Vector(this.x, this.y)
    }

    opposite() {
        return new Vector(-this.x, -this.y)
    }

    inverse() {
        return new Vector(1/this.x, 1/this.y)
    }

    normal() {
        return new Vector(-this.y, this.x)
    }

    max(v) {
        return new Vector(Math.max(v.x, this.x), Math.max(v.y, this.y))
    }

    min(v) {
        return new Vector(Math.min(v.x, this.x), Math.min(v.y, this.y))
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y)
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y)
    }

    multiply(n) {
        return new Vector(this.x*n, this.y*n)
    }

    divide(n) {
        return new Vector(this.x/n, this.y/n)
    }

    inner(v) {
        return this.x*v.x + this.y*v.y
    }

    pointwise(v) {
        return new Vector(this.x*v.x, this.y*v.y)
    }

    outer(v) {
        return [[this.x*v.x, this.x*v.y], [this.y*v.x, this.y*v.y]]
    }

    magnitude() {
        return Math.sqrt(this.inner(this))
    }

    angle() {
        return Math.atan2(this.y, this.x)
    }

    normalise() {
        return this.divide(this.magnitude())
    }

    clipNorm(k) {
        const norm = this.magnitude()
        return norm > k ? this.multiply(k/norm) : this
    }

    isFinite() {
        return isFinite(this.x) && isFinite(this.y)
    }

    isClose(v, magnitude=1e-4) {
        return this.subtract(v).magnitude() < magnitude
    }
}
