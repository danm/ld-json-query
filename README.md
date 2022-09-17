# LDJSON Query

## Description
Line delimitered JSON is a file with many valid JSON documents inside of it which are seperated by a simple line break. These files are useful when you have a lot of JSON data that may not fit into memory which need to be filtered and sorted.

This package will let you stream over a LDJSON file, running a query function in order to filter documents you do not need keeping large files out of RAM allowing you service to remain fast and light. It does this by using the Node FS Read stream, filtering and transforming the payload and then writing to a new file using a Write stream.

## Installing

To install this package, you can download it from your favourite package manager.

- `npm install @danm/ld-json-query`
- `yarn add @danm/ld-json-query`
- `pnpm add @danm/ld-json-query`

## Getting Started

### Import 

ESM    
`import ldjson from '@danm/ld-json-query';`   
CommonJS    
`const ldjson = require('@danm/ld-json-query);`

### API

| Argument | Description |
| -- | -- |
| src | The source of where the file you want to process is found. This can be a valid S3 URL or a file system path |
| opts | Options |
| query | Query |

#### Options
An object to pass into the 2nd `opts` argument

| Property | Type | Optional | Default | Description |
| -- | -- | -- | -- | -- |
| clearOld | boolean | true | false | If true, any old output will be deleted |
| inflate | boolean | true | false | If the file has been compressed, set this to true to decompress during the stream |
| deflate | boolean | true | false | Will compress the output of the stream |
| verbose | boolean | true | false | Print all logs, not just errors |
| output | string | false | | The location of where the outputed file should be stored. The output currently doesn't support S3 |
| aws | AWS S3 Config Object | required if using S3 | | If retrieving the file from S3, this object is required |

#### Query
A function to pass into the 3rd argument
```
(payload: any) => payload: any | null
```

### Example

#### File System
You can load a LDJSON file from the file system by passing in a file system path. The file is GZIP'd so you can pass in the `inflate = true` property to the `option` object.

The query function will filter out any JSON documents which do not match the 3 conditions. Return the object that you want to be added to the new output file  `filtered-output.ldjson`. Return `false` will omit the object from the output.

```js
import ldjson from '@danm/ld-json-query';

main(
  './file.ldjson.gz',
  { inflate: true, output: './filtered-output.ldjson' },
  (json) => {
    if (json.app_name === 'news' && json.event_name === 'rm.play' && json.av_broadcasting_type === 'Live') return json;
    return null;
  },
)
```

#### S3
In addition to being able to load files from the file system, you can stream a file from S3. This does not download the file first, but streams it from AWS. If you are running this package on a system with a small amout of disk space or memory, neither will be compremised because nothing is downloaded to disk. The output is 
however written to the file system uncompressed. 

When the function starts, any old files that that match the output file name will be cleared. Additionally, extra logging will be provided due to the verbose option.

```js
import ldjson from '@danm/ld-json-query';

main(
  's3://mybucket/my-file.ldjson.gz',
  { clearOld: true, verbose: true, inflate: true, output: './filtered-output.ldjson' },
  (json) => {
    if (json.app_name === 'news' && json.event_name === 'rm.play' && json.av_broadcasting_type === 'Live') return json;
    return null;
  },
)
```

### Next steps

- Tests
- Write output to S3
- Command line options
- Additional cloud providers

PR's welcome!
