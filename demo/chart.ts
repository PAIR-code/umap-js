import * as d3 from 'd3';

export interface DataPoint {
  x: number;
  y: number;
  index: number;
  label: string;
  imageOverlay: HTMLDivElement;
}

export function constructChart(data: DataPoint[]) {
  const container = document.getElementById('scatter')!;

  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const containerSize = container.getBoundingClientRect();

  let width = containerSize.width - margin.left - margin.right;
  let height = containerSize.height - margin.top - margin.bottom;

  const x = d3.scale
    .linear()
    .range([0, width])
    .nice();

  const y = d3.scale
    .linear()
    .range([height, 0])
    .nice();

  let xMax = d3.max(data, d => d.x) * 1.2;
  let xMin = d3.min(data, d => d.y) * 1.2;
  xMin = xMin > 0 ? 0 : xMin;

  let yMax = d3.max(data, d => d.y) * 1.2;
  let yMin = d3.min(data, d => d.y) * 1.2;
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

  // create a tooltip
  const tooltip = d3
    .select('#scatter')
    .append('div')
    .style('position', 'fixed')
    .style('visibility', 'hidden');

  objects
    .selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .classed('dot', true)
    .attr('r', 6)
    .attr('transform', transform)
    .style('fill', function(d) {
      return color(d.label);
    })
    .on('mouseover', d => {
      tooltip.style('visibility', 'visible');
    })
    .on('mousemove', function(d) {
      const event = d3.event as MouseEvent;
      return tooltip
        .html(d.imageOverlay.outerHTML)
        .style('top', event.pageY - 10 + 'px')
        .style('left', event.pageX + 10 + 'px');
    })
    .on('mouseout', d => {
      tooltip.style('visibility', 'hidden');
    });

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
