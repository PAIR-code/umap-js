import { v4 as uuid } from 'uuid';

// @ts-ignore
import UMAPWorker from './umap.worker';

const requests = {};

function onError(id, error) {
  console.error(error);
  try {
    requests[id].reject(error.message);
  } finally {
    delete requests[id];
  }
}

function onMessage({ data: { error, id, method, results } }) {
  if (error) {
    onError(id, new Error(error));
  }
  switch (method) {
    case 'fit': {
      const { embedding } = results;
      if (requests[id]) {
        requests[id].resolve(embedding);
      } else {
        requests[id].reject(
          `Could not find existing UMAPWorker request with id ${id}`
        );
      }
      delete requests[id];
      break;
    }
    default: {
      throw new Error(
        `Unknown method performed by UMAPWorker: 'umap.${method}'`
      );
    }
  }
}

const worker = new UMAPWorker();
worker.onerror = onError;
worker.onmessage = onMessage;

class UMAPWorkerWrapper {
  fit(data) {
    const id = uuid();
    worker.postMessage({ id, method: 'fit', args: [data] });

    const promise = new Promise((resolve, reject) => {
      requests[id] = { resolve, reject };
    });

    return promise;
  }
}

export { UMAPWorkerWrapper as UMAP };
