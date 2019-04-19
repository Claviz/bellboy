# bellboy

Highly performant JavaScript data stream ETL engine.

Supported sources (processors):
* PostgreSQL
* MSSQL
* HTTP
* MQTT
* XLS/XLSX/JSON/CSV files

Supported destinations:
* PostgreSQL
* MSSQL
* HTTP
* stdout
* Custom

## How it works?
Bellboy streams input data row by row. Every row, in turn, goes through user-defined function where it can be transformed. When enough data is collected in batch, it is being loaded to destination.

## Installation
```
npm install bellboy
```

## Example

```javascript
const bellboy = require(bellboy);
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const rename = promisify(fs.rename);

(async () => {
    const srcPath = `C:/source`;
    // tell bellboy to process all Excel files in folder 
    // and export every record to Postgres
    const processor = new bellboy.ExcelProcessor({
        path: srcPath,
        hasHeader: true,
        destinations: [
            {
                type: 'postgres',
                connection: {
                    user: 'user',
                    password: 'password',
                    server: 'localhost',
                    database: 'bellboy'
                },
                // tell bellboy to send records to destination 
                // as soon as he collects 9999 records
                batchSize: 9999,
                // in addition to processed record fields,
                // add a new one - status field before sending to destination
                recordGenerator: async function* (record) {
                    yield {
                        ...record,
                        status: 'done'
                    };
                }
            }
        ]
    });
    // tell him to move file away as soon as it was processed
    processor.on('processedFile', async (file) => {
        const filePath = path.join(srcPath, file);
        const newFilePath = path.join(`./destination`, file);
        await rename(filePath, newFilePath);
    });
    // get it going!
    await processor.process();
})();

```

## Processors

Each processor in `bellboy` is a class which has a single responsibility of processing data of specific type -

* `MqttProcessor` processes **MQTT** protocol messages.
* `HttpProcessor` processes data received from a **HTTP** call.
* `ExcelProcessor` processes **XLSX** file data from the file system.
* `JsonProcessor` processes **JSON** file data from the file system. 
* `PostgresProcessor` processes data received from a **PostgreSQL** SELECT.
* `MssqlProcessor` processes data received from a **MSSQL** SELECT.
* `DynamicProcessor` processes **dynamically generated** data.
* `TailProcessor` processes **new lines** added to the file.

#### Processor instance methods

* **process** `async function()`\
Starts processing data.
* **on** `function(event, async function listener`\
Intercepts specified `event` and pauses processing until `listener` function will be executed.\
If `on` returns some `truthy` value, processing will be stopped.
```javascript
// move file to the new location when processedFile event is fired
processor.on('processedFile', async (file) => {
    const filePath = path.join(srcPath, file);
    const newFilePath = path.join(`./destination`, file);
    await rename(filePath, newFilePath);
});
```

#### Options
Each processor has specific set of options in addition to general options - 
* **destinations** `Destination[]` `required`\
List of processor destinations.
* **verbose** `boolean`\
If set to `true`, all events will be logged to stdout.

#### Events
* **startProcessing**\
Emitted when processor starts working.
* **processedFile**\
Emitted when processor ends it's work.
* **transformingBatch**\
Emitted when batch is about to be transformed - right before calling `batchTransformer` function.
* **transformedBatch**\
Emitted when batch has been transformed - after calling `batchTransformer` function.
* **loadingBatch**\
Emitted when batch is about to be loaded in destination.
* **loadingBatchError** `(error)`\
Emitted when batch load has failed.
* **loadedBatch**\
Emitted when batch has been loaded.

### MQTT processor

Listens for messages and processes them one by one. It also handles backpressure by queuing messages, so all messages can be eventually processed. 

#### Options
* **connection** `object` `required`
    * **url** `string`
    * **topics** `string[]`

### HTTP processor

#### Options
* **connection** `object` `required`\
Options from [request](https://github.com/request/request#requestoptions-callback) library.
* **dataFormat** `delimited | json` `required`
* **delimiter** `string` `required for delimited`
* **jsonPath** `string` `required for json`\
Only values that match provided [JSONPath](https://goessner.net/articles/JsonPath/) will be processed.
* **nextRequest** `async function(header)`\
Function which must return `connection` for the next request or `null` if the next request is not needed. If data format is `json`, it will have nullable `header` parameter which will contain data before the first `jsonPath` match.
```javascript
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
```

### Directory processors
Used for streaming text data from files in directory. There are currently three types of directory processors - `ExcelProcessor`, `JsonProcessor` and `TailProcessor`. Such processors search for the files in the source directory and process them one by one.

#### Options
* **path** `string` `required`\
Path to the directory where files are located. 

* **filePattern** `string`\
Regex pattern for the files to be processed. If not specified, all files in the directory will be matched.

* **files** `string[]`\
Array of file names. If not specified, all files in the directory will be matched against `filePattern` regex and processed in alphabetical order.

#### Events
* **processingFile** `(file, filePath)`\
Emitted when file is about to be processed.
* **processedFile** `(file, filePath)`\
Emitted after file has been processed.

### Excel processor
Processes `XLSX` files.

#### Options
* **hasHeader** `boolean`\
Wether worksheet has header or not, `false` by default.
* **skipRows** `number`\
How many rows to skip, `0` by default.
* **sheetName** `string`
* **sheetIndex** `number`\
Starts from `0`.
* **sheetGetter** `async function(sheets)`\
Function which has array of `sheets` as a parameter and must return required name of the sheet. 
```javascript
// returns last sheet name
sheetGetter: async (sheets) => {
    return sheets[sheets.length - 1];
},
```
If no `sheetName` specified, value of the `sheetIndex` will be used. If it isn't specified either, `sheetGetter` function will be called. If none options are specified, first sheet will be processed.

### JSON processor

#### Options
* **jsonPath** `string` `required`\
Only values that match provided [JSONPath](https://goessner.net/articles/JsonPath/) will be processed.

### [Tail](https://en.wikipedia.org/wiki/Tail_(Unix)) processor
Watches for file changes and outputs last part of file as soon as new lines are added to the file.

#### Options
* **fromBeginning** `boolean`\
In addition to emitting new lines, emits lines from the beginning of file, `false` by default.

#### recordGenerator's row
* **file** `string`\
Name of the file the data came from.
* **data** `string`

### Database processors
Processes `SELECT` query row by row. There are two database processors - `PostgresProcessor` and `MssqlProcessor`. Both of them are having the same options.

#### Options

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

### Dynamic processor
Processor which generates records on the fly. Can be used to define custom data processors.

#### Options
* **generator** `async generator function` `required`\
[Generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) function which must yield records to process.
```javascript
// generates 10 records dynamically
generator: async function* () {
    for (let i = 0; i < 10; i++) {
        yield { data: i };
    }
},
```

## Destinations

Every processor can have as many destinations (outputs) as needed. For example, one processor can load processed data into a database, log this data to stdout and post it by HTTP simultaneously.

### Options

* **batchSize** `number` `required`\
Number of records to be processed before loading them to the destination.
* **recordGenerator** `async generator function(row)`\
Function which processes and transforms every row from source.
* **batchTransformer** `async function(rows)`\
Function which processes and transforms whole batch of rows. This function is being called after row count reaches `batchSize`. Data is being loaded to destination immediately after this function has been executed.

### stdout
This destination logs out all data to stdout (console).

#### Options
* **type** `stdout` `required`
* **asTable** `boolean`\
If set to `true`, data will be printed as table.

### HTTP request
Puts processed data one by one in `body` and executes specified HTTP request.

#### Options
* **type** `http` `required`
* **setup** `object` `required`\
Options from [request](https://github.com/request/request#requestoptions-callback) library.

### Postgres
Inserts data to PostgreSQL.

#### Options
* **type** `postgres` `required`
* **setup** `object` `required`
  * **table** `string`\
    Table name.
  * **upsertConstraints** `string[]`\
    If specified, `UPSERT` command will be executed based on provided constraints.
  * **connection** `object`
    * **user**
    * **password**
    * **server**
    * **host**
    * **database**
    * **schema**

### MSSQL
Inserts data to MSSQL.

#### Options
* **type** `mssql` `required`
* **setup** `object` `required`
  * **table** `string`\
    Table name.
  * **connection** `object`
    * **user**
    * **password**
    * **server**
    * **host**
    * **database**

### Custom
Custom destination defined by `load` function.

#### Options
* **type** `custom` `required`
* **load** `async function(rows)` `required`\
Function which can be extended to implement custom destination.

## Testing

Tests can be run by using `docker-compose up` command.