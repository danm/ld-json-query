import fs from 'fs';
import readline from 'readline';
import zlib from 'zlib';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

type Options = {
  // should the output file be deleted on start
  clearOld?: boolean,
  inflate?: boolean,
  deflate?: boolean,
  verbose?: boolean,
  output?: string,
  aws?: any,
};

async function getFromS3(src: string, opts: Options) {
  const srcWithoutProtocol = src.slice('s3://'.length);
  const locationOfFirstSlash = srcWithoutProtocol.indexOf('/');
  const bucket = srcWithoutProtocol.slice(0, locationOfFirstSlash);
  const key = srcWithoutProtocol.slice(locationOfFirstSlash + 1);

  const s3Client = new S3Client(opts.aws);
  const command = new GetObjectCommand({ Bucket: bucket, Key: decodeURIComponent(key) });
  const s3Item = await s3Client.send(command);
  return s3Item.Body as fs.ReadStream;
}

function getFileFromFS(src: string) {
  return fs.createReadStream(src);
}

function writeToFile(json: any, output: string = './tmp-output.ld-json') {
  const str = JSON.stringify(json);
  fs.appendFileSync(output, `${str}\n`);
}

async function parseFile(
  stream: fs.ReadStream,
  query: (json: any) => any,
  opts: Options,
) {
  const stats = {
    found: 0,
    removed: 0,
    error: 0,
  };

  const inflator = zlib.createGunzip();
  const reader = readline.createInterface({
    input: opts.inflate ? stream.pipe(inflator) : stream,
  });

  reader.on('line', (data) => {
    let json;
    try {
      json = JSON.parse(data);
      const filtered = query(json);
      if (filtered !== null) {
        stats.found += 1;
        writeToFile(filtered, opts.output);
      } else {
        stats.removed += 1;
      }

      if (opts.verbose) console.log(json);
    } catch (e) {
      if (e instanceof Error) {
        stats.error += 1;
        console.error(e.message);
      }
    }
  });
}

export default async function main(src: string, opts: Options, query: (json: any) => any) {
  if (opts.clearOld === true) {
    try {
      fs.unlinkSync(opts.output || './tmp-output.ld-json');
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.message);
      }
    }
  }

  if (src.indexOf('s3://') === 0) {
    const stream = await getFromS3(src, opts);
    if (stream === undefined) return;
    parseFile(stream, query, opts);
  } else {
    const stream = getFileFromFS(src);
    parseFile(stream, query, opts);
  }
}
