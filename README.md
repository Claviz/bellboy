# bellboy

Highly performant JavaScript data stream ETL engine.

Supported sources:
* Database: Postgres, MSSQL
* HTTP: JSON
* File system: XLS, XLSX, JSON, CSV

Supported destinations:
* Database: Postgres, MSSQL
* HTTP endpoints
* Terminal (stdout)

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

## Documentation

TODO