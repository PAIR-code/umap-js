import * as digits from '../data/digits.json';
import { constructChart, DataPoint } from './chart';
import { UMAP } from '../src/umap';

const rawData = digits.data.slice(0, 1000);
const umap = new UMAP({ nNeighbors: 5 });

function setProjecting(isProjecting = true) {
  const overlay = document.querySelector('.loading-overlay')!;
  if (isProjecting) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

async function projectData() {
  setProjecting(true);
  const projection = umap.fit(rawData);
  setProjecting(false);

  const data = createDataPoints(projection);
  constructChart(data);
}

setTimeout(() => {
  projectData();
}, 100);

function createDataPoints(projection: number[][]) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;

  var ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const data: DataPoint[] = projection.map(([x, y], index) => {
    const label = `${digits.label[index]}`;
    const imageData = ctx.createImageData(8, 8);
    rawData[index].forEach((pixel, i) => {
      imageData.data[i * 4 + 0] = pixel * 16;
      imageData.data[i * 4 + 1] = pixel * 16;
      imageData.data[i * 4 + 2] = pixel * 16;
      imageData.data[i * 4 + 3] = 255;
    });
    ctx.putImageData(imageData, 0, 0);
    const imageUrl = c.toDataURL('image/png');
    const imageOverlay = document.createElement('div');
    imageOverlay.style.width = '64px';
    imageOverlay.style.height = '64px';

    const imageElement = new Image();
    imageElement.src = imageUrl;
    imageElement.classList.add('digit');
    imageElement.width = 64;
    imageElement.height = 64;

    imageOverlay.append(imageElement);

    return { x, y, index, label, imageOverlay };
  });

  return data;
}
