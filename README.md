# ass-mongoose
A Mongoose StorageEngine for [ASS](https://github.com/tycrek/ass) (A ShareX Server)

## Usage
1. Install with `npm install @dylancl/ass-mongoose`
2. Create a `config.mongoose.json` file in the root of your project with the following content:
```json
{
 "host": "domain.of.mongoose.database",
 "port": 12345,
 "database": "your-db-name",
 "mongooseOpts": {
  "useNewUrlParser": true,
  "useUnifiedTopology": true,
  ...,
 }
 "model": "your-imported-model-name"
}
```

| Key | Description |
  | --- | --- |
  | `host` | Hostname of the Mongoose server |
  | `port` | Port of the Mongoose server |
  | `database` | Name of the Mongoose database |
  | `mongooseOpts` | An object of Mongoose options |
  | `model` | The model of the data schema |

3. Add `@dylancl/ass-mongoose` to `data.js` using `require` & create a new instance of `MongooseStorageEngine`:
  ```js
  // Import the package
  const { MongooseStorageEngine } = require('@dylancl/ass-psql');

  // Import the options
  const { host, port, database, mongooseOpts, model } = require('./config.mongoose.json');

  // Create a new instance of the MongooseStorageEngine
  const data = new MongooseStorageEngine({
    host, 
    port, 
    database,
    mongooseOpts,
    model, 
  });

  // Initialize the StorageEngine
  // Always call data.init() before using the StorageEngine!
  data.init()
    .then(console.log)
    .catch(console.error);

  // Export the StorageEngine
  module.exports = data;
  ```
### The `init()` method

The `init()` method is used to initialize the StorageEngine. It returns a Promise that resolves when the StorageEngine is ready to use.

This method is used to create the database if it doesn't already exist.

### Migrating old data (from `JsonStorageEngine`)

Create a new instance of `MongooseStorageEngine` with the same options as before. Run `data.migrate()`, which returns a Promise. The result of `.then()` is the number of data entries migrated.
```js
// Import the old StorageEngine
const { JsonStorageEngine } = require('@tycrek/ass-storage-engine');
const dataOld = new JsonStorageEngine();

// Import the new StorageEngine & options
const { MongooseStorageEngine } = require('@tycrek/ass-psql');
const { sslPath, host, port, username, password, database } = require('./auth.psql.json');

// Create a new instance of the MongooseStorageEngine
const data = new MongooseStorageEngine({ /* ... */ });
data.init()
  .then(console.log)
  .then(() => dataOld.get())
  .then((oldData) => data.migrate(oldData)) // <-- Remove this after migration!
  .then(console.log)
  .catch(console.error);

module.exports = data;
```

**Only run this command if you are sure you want to migrate your data!**
  
Make sure you have a backup of your data before running this command. In pretty much all scenarios, you'll only need to run this command once, and then you can remove the migrate function from your code. Calling `data.migrate()` will only work if you have a `data.json` file in your project root. It will **not** modify or delete your `data.json` file (but having a backup of your data is still a good idea)


### Delete your table

If you want to delete the entire table, with zero data returns or backups or anything, you can use the following code:

```js
// Please realize this is dangerous
data.deleteTable()
  .then(console.log)
  .catch(console.error);
// There is no undo for this command!
```

**This will immediatly delete your table,** use with caution! The table will automatically be created when you call `data.init()` again.

