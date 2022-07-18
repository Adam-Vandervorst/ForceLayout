This repository contains a minimal implementation of [force layouts](https://en.wikipedia.org/wiki/Force-directed_graph_drawing) for undirected graphs with at most one edge connecting two distinct nodes.
It also supports drawing and some basic graph operations and graph generators, which you can try out by opening [the HTML file](./view.html) in your browser.
Because of its minimal implementation, it is pretty slow, possibly buggy, and easy to modify.

I based the code organization of the layout and drawing functionality loosely on [Springy](https://github.com/dhotson/springy), which is probably more what you need.
A reasonably up-to-date version of this is available on [my website](https://apps.adamv.be/ForceLayout). This demo lays out an almost planar graph from random node positions which <b>may not be suitable for people with photosensitive epilepsy</b>.
