# bellboy [![Build Status](https://travis-ci.org/Claviz/bellboy.svg?branch=master)](https://travis-ci.org/Claviz/bellboy) [![codecov](https://codecov.io/gh/Claviz/bellboy/branch/master/graph/badge.svg)](https://codecov.io/gh/Claviz/bellboy) ![npm](https://img.shields.io/npm/v/bellboy.svg)

Highly performant JavaScript data stream ETL engine.

## How it works?
Bellboy streams input data row by row. Every row, in turn, goes through user-defined function where it can be transformed. When enough data is collected in batch, it is being loaded to destination.

## Installation

Before install, make sure you are using [latest](https://nodejs.org/en/download/current/) version of Node.js.

```
npm install bellboy
```

## Example

This example shows how `bellboy` can extract rows from the [Excel file](#excel-processor), modify it on the fly, load to the [Postgres database](#postgres-destination), move processed file to the other folder and process remaining files.

Just in five simple steps.

```javascript
const bellboy = require('bellboy');
const fs = require('fs');
const path = require('path');

(async () => {
    const srcPath = `C:/source`;
    // 1. create a processor which will process 
    // Excel files one by one in the folder 
    const processor = new bellboy.ExcelProcessor({
        path: srcPath,
        hasHeader: true,
    });
    // 2. create a destination which will add a new 'status' 
    // field to each row and load processed data to Postgres database
    const destination = new bellboy.PostgresDestination({
        connection: {
            user: 'user',
            password: 'password',
            server: 'localhost',
            database: 'bellboy',
        },
        table: 'stats',
        recordGenerator: async function* (record) {
            yield {
                ...record.raw.obj,
                status: 'done',
            };
        }
    });
    // 3. create a job which will glue processor and destination together
    const job = new bellboy.Job(processor, [destination]);
    // 4. tell bellboy to move file away as soon as it was processed
    job.on('endProcessingStream', async (file) => {
        const filePath = path.join(srcPath, file);
        const newFilePath = path.join(`./destination`, file);
        await fs.renameSync(filePath, newFilePath);
    });
    // 5. run your job
    await job.run();
})();
```

## Jobs <div id='job'/>

A job in `bellboy` is a relationship link between [processor](#processors) and [destinations](#destinations). When the job is run, data processing and loading mechanism will be started.

#### Initialization

To initialize a Job instance, pass [processor](#processors) and some [destination(s)](#destinations). 
<!-- and [options](#job-options) if needed. -->

```javascript
const job = new bellboy.Job(processor_instance, [destination_instance], job_options = {});
```

#### Options
* **reporters** `Reporter[]`\
Array of [reporters](#reporters).

#### Instance methods

* **run** `async function()`\
Starts processing data.
* **on** `function(event, async function listener)`\
Add specific [event listener](#events).
* **onAny** `function(async function listener)`\
Add [any event listener](#any-event).
* **stop** `function(errorMessage?)`\
Stops job execution. If `errorMessage` is passed, job will throw an error with this message.

#### Events and event listeners <div id='events'/>

Event listeners, which can be registered with `job.on` or `job.onAny` method, allow you to listen to specific events in the job lifecycle and interact with it.

* Multiple listeners for one event will be executed in the order they were registered.
* Job always waits code inside listener to complete.
* Any error thrown inside listener will be ignored and warning message will be printed out.
* `job.stop()` method can be used inside listener to stop job execution and throw an error if needed.

```ts
job.on('startProcessing', async (processor: IProcessor, destinations: IDestination[]) => {
    // Job has started execution.
});
```
```ts
job.on('startProcessingStream', async (...args: any) => {
    // Stream processing has been started.
    // Passed parameters may vary based on specific processor.
});
```
```ts
job.on('startProcessingRow', async (row: any)) => {
    // Row has been received and is about to be processed inside `recordGenerator` method.
});
```
```ts
job.on('rowGenerated', async (destinationIndex: number, generatedRow: any)) => {
    // Row has been generated using `recordGenerator` method.
});
```
```ts
job.on('rowGenerationError', async (destinationIndex: number, row: any, error: any)) => {
    // Record generation (`recordGenerator` method) has thrown an error.
});
```
```ts
job.on('endProcessingRow', async ()) => {
    // Row has been processed.
});
```
```ts
job.on('transformingBatch', async (destinationIndex: number, rows: any[]) => {
    // Batch is about to be transformed inside `batchTransformer` method.   
});
```
```ts
job.on('transformedBatch', async (destinationIndex: number, transformedRows: any) => {
    // Batch has been transformed using`batchTransformer` method.
});
```
```ts
job.on('transformingBatchError', async (destinationIndex: number, rows: any[], error: any) => {
    // Batch transformation (`batchTransformer` method) has thrown an error.
});
```
```ts
job.on('endTransformingBatch', async (destinationIndex: number) => {
    // Batch has been transformed.
});
```
```ts
job.on('loadingBatch', async (destinationIndex: number, data: any[]) => {
    // Batch is about to be loaded into destination.
});
```
```ts
job.on('loadedBatch', async (destinationIndex: number, data: any[]) => {
    // Batch has been loaded into destination.
});
```
```ts
job.on('loadingBatchError', async (destinationIndex: number, data: any[], error: any) => {
    // Batch load has failed.
});
```
```ts
job.on('endLoadingBatch', async (destinationIndex: number) => {
    // Batch load has finished .
});
```
```ts
job.on('endProcessingStream', async (...args: any) => {
    // Stream processing has finished.
    // Passed parameters may vary based on specific processor.
});
```
```ts
job.on('processingError', async (error: any) => {
    // Unexpected error has occured.
});
```
```ts
job.on('endProcessing', async () => {
    // Job has finished execution.
});
```

##### Listening for any event <div id='any-event'/>

Special listener can be registered using `job.onAny` method which will listen for any previously mentioned event.

```ts
job.onAny(async (eventName: string, ...args: any) => {
    // An event has been fired. 
});
```

## Processors <div id='processors'/>

Each processor in `bellboy` is a class which has a single responsibility of processing data of specific type -

* [MqttProcessor](#mqtt-processor) processes **MQTT** protocol messages.
* [HttpProcessor](#http-rocessor) processes data received from a **HTTP** call.
* [ExcelProcessor](#excel-processor) processes **XLSX** file data from the file system.
* [JsonProcessor](#json-processor) processes **JSON** file data from the file system. 
* [DelimitedProcessor](#delimited-processor) processes files with **delimited data** from the file system. 
* [PostgresProcessor](#database-processors) processes data received from a **PostgreSQL** SELECT.
* [MssqlProcessor](#database-processors) processes data received from a **MSSQL** SELECT.
* [DynamicProcessor](#dynamic-processor) processes **dynamically generated** data.
* [TailProcessor](#tail-processor) processes **new lines** added to the file.

### Options <div id='processor-options'/>

* **rowLimit** `number`\
Number of records to be processed before stopping processor. If not specified or `0` is passed, all records will be processed.

### MqttProcessor <div id='mqtt-processor'/>

[Usage examples](tests/mqtt-source.spec.ts)

Listens for messages and processes them one by one. It also handles backpressure by queuing messages, so all messages can be eventually processed. 

#### Options
* [Processor options](#processor-options)
* **url** `string` `required`
* **topics** `string[]` `required`

### HttpProcessor <div id='http-processor'/>

[Usage examples](tests/http-source.spec.ts)

Processes data received from a HTTP call. Can process `JSON` as well as `delimited` data. Can handle pagination by using `nextRequest` function.

#### Options
* [Processor options](#processor-options)
* **connection** `object` `required`\
Options from [request](https://github.com/request/request#requestoptions-callback) library.
* **dataFormat** `delimited | json` `required`
* **delimiter** `string` `required for delimited`
* **jsonPath** `string` `required for json`\
Only values that match provided [JSONPath](https://goessner.net/articles/JsonPath/) will be processed.
* **nextRequest** `async function(header)`\
Function which must return `connection` for the next request or `null` if the next request is not needed. If data format is `json`, it will have `header` parameter which contains data before the first `jsonPath` match.
```javascript
const processor = new bellboy.HttpProcessor({
    // gets next connection from the header until last page is reached
    nextRequest: async function (header) {
        if (header) {
            const pagination = header.pagination;
            if (pagination.total_pages > pagination.current_page) {
                return {
                    ...connection,
                    url: `${url}&current_page=${pagination.current_page + 1}`
                };
            }
        }
        return null;
    },
    // ...
});
```

### Directory processors <div id='directory-processors'/>
Used for streaming text data from files in directory. There are currently three types of directory processors - `ExcelProcessor`, `JsonProcessor` and `TailProcessor`. Such processors search for the files in the source directory and process them one by one.

File name (`file`) and full file path (`filePath`) parameters will be passed to `startProcessingStream` event.

#### Options <div id='directory-processor-options'/>
* [Processor options](#processor-options)
* **path** `string` `required`\
Path to the directory where files are located. 
* **filePattern** `string`\
Regex pattern for the files to be processed. If not specified, all files in the directory will be matched.
* **files** `string[]`\
Array of file names. If not specified, all files in the directory will be matched against `filePattern` regex and processed in alphabetical order.

### ExcelProcessor <div id='excel-processor'/>

[Usage examples](tests/excel-source.spec.ts)

Processes `XLSX` files in the directory.

#### Options
* [Directory processor options](#directory-processor-options)
* **hasHeader** `boolean`\
Wether worksheet has header or not, `false` by default.
* **ignoreEmpty** `boolean`\
Wether ignore empty rows or not, `true` by default.
* **sheets** `(string | number)[] | async function(sheets)`\
Array of sheet names and/or sheet indexes or async function, which accepts array of all sheet names and must return another array of sheets that needs to be processed. If not specified, first sheet will be processed.
```javascript
const processor = new bellboy.ExcelProcessor({
    // process last sheet
    sheets: async (sheets) => {
        return [sheets[sheets.length - 1]];
    },
    // ...
});
```
<!-- * **sheetName** `string`
* **sheetIndex** `number`\
Starts from `0`.
* **sheetGetter** `async function(sheets)`\
Function which has array of `sheets` as a parameter and must return required name of the sheet. 
```javascript
const processor = new bellboy.ExcelProcessor({
    // returns last sheet name
    sheetGetter: async (sheets) => {
        return sheets[sheets.length - 1];
    },
    // ...
});
```
If no `sheetName` specified, value of the `sheetIndex` will be used. If it isn't specified either, `sheetGetter` function will be called. If none options are specified, first sheet will be processed. -->

#### Produced row
To see how processed row will look like, proceed to [xlstream](https://github.com/Claviz/xlstream) library documentation which is used for Excel processing.

### JsonProcessor <div id='json-processor'/>

Processes `JSON` files in the directory.

#### Options
* [Directory processor options](#directory-processor-options)
* **jsonPath** `string` `required`\
Only values that match provided [JSONPath](https://goessner.net/articles/JsonPath/) will be processed.

### DelimitedProcessor <div id='delimited-processor'/>

[Usage examples](tests/delimited-source.spec.ts)

Processes files with delimited data in the directory.

#### Options
* [Directory processor options](#directory-processor-options)
* **delimiter** `string` `required`

### TailProcessor <div id='tail-processor'/>

[Usage examples](tests/tail-source.spec.ts)

Watches for file changes and outputs last part of file as soon as new lines are added to the file.

#### Options
* [Directory processor options](#directory-processor-options)
* **fromBeginning** `boolean`\
In addition to emitting new lines, emits lines from the beginning of file, `false` by default.

#### Produced row
* **file** `string`\
Name of the file the data came from.
* **data** `string`

### Database processors <div id='database-processors'/>
Processes `SELECT` query row by row. There are two database processors - `PostgresProcessor` ([usage examples](tests/postgres-source.spec.ts)) and `MssqlProcessor` ([usage examples](tests/mssql-source.spec.ts)). Both of them are having the same options.

#### Options

* [Processor options](#processor-options)
* **query** `string` `required`\
Query to execute.
* **connection** `object` `required`
  * **user**
  * **password**
  * **server**
  * **host**
  * **database**
  * **schema**\
    Currently available only for `PostgresProcessor`.

### DynamicProcessor <div id='dynamic-processor'/>
Processor which generates records on the fly. Can be used to define custom data processors.

#### Options
* [Processor options](#processor-options)
* **generator** `async generator function` `required`\
[Generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) function which must yield records to process.
```javascript
// processor which generates 10 records dynamically
const processor = new bellboy.DynamicProcessor({
    generator: async function* () {
        for (let i = 0; i < 10; i++) {
            yield i;
        }
    },
});
```

## Destinations <div id='destinations'/>

Every [job](#job) can have as many destinations (outputs) as needed. For example, one job can load processed data into a [database](#postgres-destination), log this data to [stdout](#stdout-destination) and post it by [HTTP](#http-destination) simultaneously.

* [StdoutDestination](#stdout-destination) logs data to **console**.
* [HttpDestination](#http-destination) executes **HTTP** request calls.
* [PostgresDestination](#postgres-destination) inserts/upserts data to **PostgreSQL** database.
* [MssqlDestination](#mssql-destination) inserts data to **MSSQL** database.

### Options <div id='destination-options'/>

* **disableLoad** `boolean`\
If `true`, no data will be loaded to the destination. In combination with [reporters](#reporters), this option can become handy during testing process. 
* **batchSize** `number`\
Number of records to be processed before loading them to the destination. If not specified or `0` is passed, all records will be processed. 
* **recordGenerator** `async generator function(row)`\
Function which receives produced row by processor and can apply transformations to it.
* **batchTransformer** `async function(rows)`\
Function which receives whole batch of rows. This function is being called after row count reaches `batchSize`. Data is being loaded to destination immediately after this function has been executed.

### StdoutDestination <div id='stdout-destination'/>

Logs out all data to stdout (console).

#### Options
* [General destination options](#destination-options)
* **asTable** `boolean`\
If set to `true`, data will be printed as table.

### HttpDestination <div id='http-destination'/>

[Usage examples](tests/http-destination.spec.ts)

Puts processed data one by one in `body` and executes specified HTTP request.

#### Options
* [General destination options](#destination-options)
* **request** `required`\
Options from [request](https://github.com/request/request#requestoptions-callback) library.

### PostgresDestination <div id='postgres-destination'/>

[Usage examples](tests/postgres-destination.spec.ts)

Inserts data to PostgreSQL.

#### Options
* [General destination options](#destination-options)
* **table** `string` `required`\
  Table name.
* **upsertConstraints** `string[]`\
  If specified, `UPSERT` command will be executed based on provided constraints.
* **connection** `object` `required`
  * **user**
  * **password**
  * **server**
  * **host**
  * **database**
  * **schema**

### MssqlDestination <div id='mssql-destination'/>

[Usage examples](tests/mssql-destination.spec.ts)

Inserts data to MSSQL.

#### Options
* [General destination options](#destination-options)
* **table** `string` `required`\
  Table name.
* **upsertConstraints** `string[]`\
  If specified, `UPSERT` command will be executed based on provided constraints.
* **connection** `object` `required`
  * **user**
  * **password**
  * **server**
  * **host**
  * **database**

## Extendability

New [processors](#processors) and [destinations](#destinations) can be made by extending existing ones. Feel free to make a pull request if you create something interesting.

### Creating a new processor

[Processor class examples](src/processors)

To create a new processor, you must extend `Processor` class and implement async `process` function. This function accepts one parameter:

* **processStream** `async function(readStream, ...args)` `required`\
  Callback function which accepts [Readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable). After calling this function, `job` instance will handle passed stream internally. Passed parameters (`args`) will be emitted with `startProcessingStream` event during job execution.

```javascript
class CustomProcessor extends bellboy.Processor {
    async process(processStream) {
        // await processStream(readStream, 'hello', 'world');
    }
}
```

### Creating a new destination

[Destination class examples](src/destinations)

To create a new destination, you must extend `Destination` class and implement async `loadBatch` function. This function accepts one parameter:

* **data** `any[]` `required`\
  Array of some processed data that needs to be loaded.

```javascript
class CustomDestination extends bellboy.Destination {
    async loadBatch(data) {
        console.log(data);
    }
}
```

### Creating a new reporter <div id='reporters'/>

[Official stdout reporter](https://github.com/claviz/bellboy-stdout-reporter)

Reporter is a job wrapper which can operate with [job instance](#job) (for example, listen to events using job `on` method). To create a new reporter, you must extend `Reporter` class and implement `report` function, which will be executed during job instance initialization. This function accepts one parameter:

* **job** `Job` `required`\
  [Job](#job) instance

```javascript
class CustomReporter extends bellboy.Reporter {
    report(job) {
        job.on('startProcessing', async () => {
            console.log('Job has been started.');
        });
    }
}
```

## Testing

Tests can be run by using `docker-compose up --abort-on-container-exit --exit-code-from test` command.
