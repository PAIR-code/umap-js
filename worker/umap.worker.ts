import { UMAP } from '../src/lib';

async function messageHandler({ data: { id, method, args } }) {
  console.log(
    `UMAPWorker: received instruction to execute 'umap.${method}' with ${args.length} args`
  );
  switch (method) {
    case 'fit': {
      const umap = new UMAP();
      const embedding = await umap.fit(args[0]);
      // @ts-ignore
      postMessage({ id, method, results: { embedding } });
      break;
    }
    default: {
      // @ts-ignore
      postMessage({
        id,
        error: `Unknown method requested of UMAPWorker: 'umap.${method}'`,
      });
    }
  }
}

onmessage = messageHandler;
