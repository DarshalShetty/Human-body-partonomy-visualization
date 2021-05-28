const initHierarchy = {
    name: "body"
};
const width = 1000;
const height = 800;

const fileInput = document.querySelector('[name="partonomy_csv"]')
fileInput.addEventListener('change', (e) => {
    hierarchy = {...initHierarchy};
    let isRow = false;
    const selectedFile = e.currentTarget.files[0];
    let totalDepth = 0;
    Papa.parse(selectedFile, {
        step: (results) => {
            let row = results.data;
            if (isRow) {
                let currentNode = hierarchy;
                for (let j = 0; j < totalDepth; j++) {
                    let i = j * 3;
                    let name = row[j * 3];
                    let label = row[j * 3 + 1];
                    let id = row[j * 3 + 2];
                    if (name === "" && id === "") {
                        continue;
                    }
                    if (!currentNode.children) {
                        currentNode.children = [];
                    }
                    //name-id combo considered for uniqueness because names aren't always unique and some rows don't have ID
                    let child = currentNode.children.filter((node) => node.name === name && node.id === id)[0];
                    if (!child) {
                        child = {name, label, id};
                        currentNode.children.push(child);
                    }
                    currentNode = child;
                }
            }
            if (row[0] === "AS/1") {
                isRow = true;
                for (let header of row) {
                    if (!header.startsWith('AS/')) {
                        break;
                    }
                    totalDepth++;
                }
                totalDepth /= 3;
            }
        },
        complete: () => {
            const depth = depthInput.value === "" ? 1 : parseInt(depthInput.value);
            drawVoronoi(hierarchy, depth);
            [...Array(d3.hierarchy(hierarchy).height-1).keys()].forEach(v=>{
                const option = document.createElement('option');
                option.setAttribute('value', v+1);
                option.innerText = v+1;
                depthInput.append(option);
            });
        }
    });
})
let hierarchy = {...initHierarchy};

const depthInput = document.querySelector('[name="partonomy_depth"]')
depthInput.addEventListener('change', (e)=>{
    const depth = parseInt(e.currentTarget.value);
    drawVoronoi(hierarchy, depth);
})

function drawVoronoi(hierarchy, depth) {
    let rootNode = d3.hierarchy(hierarchy.children[0]).sum(() => 1); // a d3-hierarchy of your nested data

    let voronoiTreemap = d3.voronoiTreemap().clip([
        [0, 0],
        [0, height],
        [width, height],
        [width, 0],
    ]); // sets the clipping polygon
    voronoiTreemap(rootNode); // computes the weighted Voronoi tessellation of the d3-hierarchy; assigns a 'polygon' property to each node of the hierarchy

    let allNodes = rootNode.descendants();

    d3.selectAll('svg > *').remove();

    const svg = d3.select('svg').attr('width', width).attr('height', height);
    const voronoiViz = svg
        .append('g')
        .classed('cells', true)
        .selectAll('cell')
        .data(allNodes);
    voronoiViz
        .enter()
        .append('path')
        .classed('cell', true)
        .attr('d', function (d) {
            // d is a node
            return d3.line()(d.polygon) + 'z'; // d.polygon is the computed Voronoï cell encoding the relative weight of your underlying original data
        })
        .style("stroke", (d) =>
            d.depth === depth ? 'rgb(0, 0, 0)' : 'rgba(0, 0, 0, 0.1)'
        )
        .style('stroke-width', function (d) {
            const width = d.depth === depth ? 5 : 1;
            return `${width}px`;
        });

    const labels = svg.append("g")
        .classed('labels', true)
        .selectAll(".label")
        .data(allNodes.filter(d => d.depth === depth))
        .enter()
        .append("g")
        .classed("label", true)
        .attr("transform", function (d) {
            return "translate(" + [d.polygon.site.x, d.polygon.site.y] + ")";
        })
        .style("font-size", function (d) {
            return `${d3.scaleLinear().domain([3, 20]).range([8, 20]).clamp(true)(d.value)}px`;
        });

    labels.append("text")
        .classed("name", true)
        .html(function (d) {
            return d.data.name;
        });
    labels.append("text")
        .classed("id", true)
        .text(function (d) {
            return d.data.id;
        });

}


