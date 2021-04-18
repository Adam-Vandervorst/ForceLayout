class App {
	constructor(params) {
		this.graph = params.graph

		this.setupDrawing(params)
		this.setupUpdate(params)
		this.setupInteraction(params)
	}

	setupDrawing({canvas_element, antialias=false}) {
		this.canvas = canvas_element || document.getElementById("board").firstElementChild
		this.ctx = this.canvas.getContext("2d", {
			alpha: false,
			desynchronized: true,
			powerPreference: "high-performance",
			antialias: antialias
		})

		this.renderer = new RendererGraph(this.canvas, this.ctx, p => this.toScreen(p))
		this.resetCanvas()
		window.addEventListener("resize", () => this.resetCanvas())
	}

	setupUpdate({stiffness=800., repulsion=400., damping=.25, energy_threshold=1e-5, step_size=2, max_speed=10}) {
		this.layout = new Layout(this.graph, stiffness, repulsion, damping, energy_threshold, max_speed)

		this.currentBB = this.layout.getBoundingBox()
		this.targetBB = new Layout(new this.graph.constructor()).getBoundingBox()

		this.step_size = step_size
		this.last_t = null
		this.to_stop = false
		this.start()
	}

	setupInteraction({damping=.25, selected_handler=x => x}) {
		this.selected = null
		this.nearest = null
		this.dragged = null

		window.addEventListener("mousedown", e => isTouch(e) || this.startHandler(e))
		window.addEventListener("touchstart", e => this.startHandler(e.changedTouches[0]))

		window.addEventListener("mousemove", e => isTouch(e) || this.moveHandler(e))
		window.addEventListener("touchmove", e => this.moveHandler(e.changedTouches[0]))

		window.addEventListener('mouseup', e => isTouch(e) || this.endHandler(e))
		window.addEventListener("touchend", e => this.endHandler(e.changedTouches[0]))

		window.addEventListener('keypress', e => {
			if (e.code == "Space")
				this.layout.damping = this.layout.damping == 0. ? damping : 0.
			this.start()
		})

		this.selectedHandler = selected_handler
	}

	canvasSpan() {
		return new Vector(this.canvas.width, this.canvas.height)
	}

	toScreen(p) {
		return p.subtract(this.currentBB[0])
			.pointwise(this.currentBB[1].subtract(this.currentBB[0]).inverse())
			.pointwise(this.canvasSpan())
	}

	fromScreen(s) {
		return s.pointwise(this.canvasSpan().inverse())
			.pointwise(this.currentBB[1].subtract(this.currentBB[0]))
			.add(this.currentBB[0])
	}

	resetCanvas() {
		// adapted from http://www.html5rocks.com/en/tutorials/canvas/hidpi/
		const pixel_ratio = window.devicePixelRatio || 1
		this.canvas.width = window.innerWidth*pixel_ratio
		this.canvas.height = window.innerHeight*pixel_ratio
		this.canvas.style.width = window.innerWidth + 'px'
		this.canvas.style.height = window.innerHeight + 'px'
		this.ctx.scale(pixel_ratio, pixel_ratio)
	}

	adjust() {
		this.targetBB = this.layout.getBoundingBox()
		this.currentBB = this.currentBB.map((p, i) =>
			p.add(this.targetBB[i].subtract(this.currentBB[i]).divide(10)))
	}

	start() {
		if (this.last_t !== null) return
		this.last_t = window.performance.now()
		this.to_stop = false

		window.requestAnimationFrame(() => this.step())
	}

	step() {
		const nt = window.performance.now()
		this.layout.tick(this.step_size*(nt - this.last_t)/1000)
		this.adjust()
		this.renderer.render(this.layout)

		if (this.to_stop || this.layout.totalEnergy() < this.layout.energy_threshold)
			this.last_t = null
		else {
			window.requestAnimationFrame(() => this.step())
			this.last_t = nt
		}
	}

	stop() {
		this.to_stop = true
	}

	startHandler(e) {
		const p = this.fromScreen(new Vector(e.clientX, e.clientY))
		this.selected = this.nearest = this.dragged = this.layout.nearest(p)

		if (this.selected.node !== null) {
			this.dragged.point.m = 1e4

			this.selectedHandler(this.selected.node)
		}
		this.start()
	}

	moveHandler(e) {
		const p = this.fromScreen(new Vector(e.clientX, e.clientY))
		this.nearest = this.layout.nearest(p)

		if (this.dragged !== null && this.dragged.node !== null)
			this.dragged.point.p = p

		this.start()
	}

	endHandler(e) {
		this.dragged.point.m = 1
		this.dragged = null
	}
}
