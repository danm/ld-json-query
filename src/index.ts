import fs from 'fs';
import readline from 'readline';
import zlib from 'zlib';
import stream from 'stream';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

type Options = {
  // should the output file be deleted on start
  clearOld?: boolean,
  inflate?: boolean, // decompress
  deflate?: boolean, // compress
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

function parseFile(
  readStream: fs.ReadStream,
  query: (json: any) => any,
  opts: Options,
) {
  return new Promise((resolve, reject) => {
    const stats = {
      found: 0,
      removed: 0,
      error: 0,
    };

    const outputStream = new stream.Readable();
    const zipper = zlib.createGzip();
    const writer = fs.createWriteStream(opts.output || './tmp-output.ld-json');
    if (opts.deflate === true) {
      outputStream._read = () => {};
      outputStream.pipe(zipper).pipe(writer);
    } else {
      outputStream._read = () => {};
      outputStream.pipe(writer);
    }

    const inflator = zlib.createGunzip();
    const reader = readline.createInterface({
      input: opts.inflate ? readStream.pipe(inflator) : readStream,
    });

    writer.on('close', () => {
      resolve(stats);
    });
    writer.on('error', (err) => {
      console.log(err);
      reject(err);
    });

    reader.on('line', (data) => {
      let json;
      try {
        json = JSON.parse(data);
        const filtered = query(json);
        if (filtered !== null) {
          stats.found += 1;
          outputStream.push(`${JSON.stringify(filtered)}\n`);
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

    reader.on('error', (err) => {
      console.log(err);
      stats.error += 1;
    });

    reader.on('close', () => {
      outputStream.push(null);
    });
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
    const streamer = await getFromS3(src, opts);
    if (streamer === undefined) return;
    parseFile(streamer, query, opts);
  } else {
    const streamer = getFileFromFS(src);
    parseFile(streamer, query, opts);
  }
}
