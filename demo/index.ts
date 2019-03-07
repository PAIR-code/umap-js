import * as d3 from 'd3';
import * as fmnist from '../data/fmnist.json';

export interface Item {
  x: number;
  y: number;
  index: number;
  label: string;
}

const data: Item[] = fmnist.projection_2d.map(([x, y], index) => {
  const labelIndex = fmnist.labels[index];
  const label = fmnist.label_names[labelIndex];
  return { x, y, index, label };
});

function constructChart() {
  const margin = { top: 50, right: 300, bottom: 50, left: 50 };
  let width = window.innerWidth - margin.left - margin.right;
  let height = window.innerHeight - margin.top - margin.bottom;

  const x = d3.scale
    .linear()
    .range([0, width])
    .nice();

  const y = d3.scale
    .linear()
    .range([height, 0])
    .nice();

  let xMax = d3.max(data, d => d.x) * 1.25;
  let xMin = d3.min(data, d => d.y) * 1.25;
  xMin = xMin > 0 ? 0 : xMin;

  let yMax = d3.max(data, d => d.y) * 1.05;
  let yMin = d3.min(data, d => d.y) * 1.05;
  yMin = yMin > 0 ? 0 : yMin;

  x.domain([xMin, xMax]);
  y.domain([yMin, yMax]);

  const color = d3.scale.category10();

  const zoomBeh = d3.behavior
    .zoom()
    .x(x)
    .y(y)
    .scaleExtent([0, 500])
    .on('zoom', zoom);

  const svg = d3
    .select('#scatter')
    .append('svg')
    .attr('width', outerWidth)
    .attr('height', outerHeight)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .call(zoomBeh);

  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  var objects = svg
    .append('svg')
    .classed('objects', true)
    .attr('width', width)
    .attr('height', height);

  objects
    .append('svg:line')
    .classed('axisLine hAxisLine', true)
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', width)
    .attr('y2', 0)
    .attr('transform', 'translate(0,' + height + ')');

  objects
    .append('svg:line')
    .classed('axisLine vAxisLine', true)
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', height);

  objects
    .selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .classed('dot', true)
    .attr('r', function(d) {
      return 6 * Math.sqrt(1 / Math.PI);
    })
    .attr('transform', transform)
    .style('fill', function(d) {
      return color(d.label);
    });
  // .on('mouseover', tip.show)
  // .on('mouseout', tip.hide);

  const legend = svg
    .selectAll('.legend')
    .data(color.domain())
    .enter()
    .append('g')
    .classed('legend', true)
    .attr('transform', function(d, i) {
      return 'translate(0,' + i * 20 + ')';
    });

  legend
    .append('circle')
    .attr('r', 3.5)
    .attr('cx', width + 20)
    .attr('fill', color);

  legend
    .append('text')
    .attr('x', width + 26)
    .attr('dy', '.35em')
    .text(function(d) {
      return d;
    });

  d3.select('input').on('click', change);

  function change() {
    xMax = d3.max(data, d => d.x);
    xMin = d3.min(data, d => d.x);

    zoomBeh.x(x.domain([xMin, xMax])).y(y.domain([yMin, yMax]));

    const svg = d3.select('#scatter').transition();

    objects
      .selectAll('.dot')
      .transition()
      .duration(1000)
      .attr('transform', transform);
  }

  function zoom() {
    svg.selectAll('.dot').attr('transform', transform);
  }

  function transform(d) {
    return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
  }
}

constructChart();
