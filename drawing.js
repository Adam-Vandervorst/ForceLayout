const isTouch = e => {
    try {
        return e.sourceCapabilities.firesTouchEvents
    } catch (error) {
        return ('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)
    }
}

const computed_style = getComputedStyle(document.body)
const css_var = name => computed_style.getPropertyValue(name).trim()

const _test_canvas = document.createElement('canvas'), _test_ctx = _test_canvas.getContext("2d")
_test_canvas.width = _test_canvas.height = 1
const measureText = (text, font) => {
    _test_ctx.font = font
    const rect = _test_ctx.measureText(text)
    return [rect.width, rect.actualBoundingBoxAscent]
}

const getDim = (item, font) => {
    if (item.data.image)
        return new Vector(item.data.image.width, item.data.image.height)
    else if (item._width !== undefined && item._height !== undefined)
        return new Vector(item._width, item._height)
    else
        [item._width, item._height] = measureText(item.data.label || item.id, font)
    return getDim(item, font)
}

class RendererGraph {
    constructor(canvas, ctx, project) {
        this.canvas = canvas
        this.ctx = ctx
        this.project = project

        this.font = `${css_var("font-size")}, ${css_var("font-family")}`
    }

    clear() {
        this.ctx.fillStyle = css_var("--background-color")
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    edgeContext() {
        this.ctx.textAlign = "center"
        this.ctx.textBaseline = "top"
        this.ctx.font = this.font
        this.ctx.fillStyle = css_var("--contrast-text")
    }

    drawEdge(edge, p1, p2) {
        const s1 = this.project(p1), s2 = this.project(p2)

        const direction = s2.subtract(s1)
        const normal = direction.normalized()

        this.ctx.lineWidth = Math.max(2*edge.data.weight || 2.0, 0.1)

        this.ctx.strokeStyle = edge.data.color || '#000000'
        this.ctx.beginPath()
        this.ctx.moveTo(...s1)
        this.ctx.lineTo(...s2)
        this.ctx.stroke()

        if (edge.data.label) {
            let text = edge.data.label

            let angle = s2.subtract(s1).angle()
            let displacement = 8
            if (angle > Math.PI/2 || angle < -Math.PI/2) {
                displacement = -displacement
                angle += Math.PI
            }
            const textPos = s1.add(s2).divide(2).add(normal.multiply(displacement))
            this.ctx.save()
            this.ctx.translate(...textPos.round())
            this.ctx.rotate(angle)
            this.ctx.fillText(text, 0, 0)
            this.ctx.restore()
        }
    }

    nodeContext() {
        this.ctx.textAlign = "left"
        this.ctx.textBaseline = "top"
        this.ctx.font = this.font
    }

    drawNode(node, p) {
        const s = this.project(p)

        if (node.data.colors && !node.data.label) {
            const n = node.data.colors.length;
            node.data.colors.forEach((c, i) => {
                this.ctx.beginPath();
                this.ctx.moveTo(...s);
                this.ctx.arc(...s, 10, (.5 + 2*i/n)*Math.PI, (.5 + 2*(i + 1)/n)*Math.PI);
                this.ctx.lineTo(...s);
                this.ctx.closePath();
                this.ctx.fillStyle = c;
                this.ctx.fill();
            })
        } else {
            const padding = Vector.unit().multiply(6)
            const contentSize = getDim(node, this.font)

            const box = contentSize.add(padding)
            this.ctx.fillStyle = node.data.color || "#FFFFFF"
            this.ctx.fillRect(...s.subtract(box.divide(2)), ...box)

            const tl = s.subtract(contentSize.divide(2)).round("down")
            if (node.data.image !== undefined) {
                this.ctx.drawImage(node.data.image, ...tl)
            } else {
                this.ctx.fillStyle = css_var("--background-color")
                const text = (node.data.label !== undefined) ? node.data.label : node.id
                this.ctx.fillText(text, ...tl)
            }
        }
    }

    render(layout) {
        this.clear()

        this.edgeContext()
        layout.mapSprings((edge, spring) => this.drawEdge(edge, spring.point1.p, spring.point2.p))
        this.nodeContext()
        layout.mapPoints((node, point) => this.drawNode(node, point.p))
    }
}
