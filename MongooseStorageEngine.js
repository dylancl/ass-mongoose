const { StorageType, StorageEngine, StorageFunction, StorageFunctionType, StorageFunctionGroup, KeyFoundError, KeyNotFoundError } = require('@tycrek/ass-storage-engine');
const { name: EngineName, version: EngineVersion } = require('./package.json');
const { mergeNoArray } = require('./deepMerge');
const mongoose = require('mongoose');

const TIMEOUTS = {
 IDLE: 30000,
 CONNECT: 5000,
};


/*
 * Default options
 */

const OPTIONS = {
 host: 'mongodb://...',
 port: 27017,
 database: 'myFirstDatabase',
 mongooseOpts: {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: TIMEOUTS.IDLE,
  connectTimeoutMS: TIMEOUTS.CONNECT,
 },
 model: null
};

/**
 * Get resource data from the database
 * @param {string} resourceId The resource id
 * @returns {Promise<*>} The resource data
 * @throws {KeyNotFoundError} If the resource is not found
 */
function get(resourceId) {
 return new Promise(async (resolve, reject) => {
  try {
   if (!resourceId) {
    const result = await MongooseStorageEngine.model.find({}).lean();
    resolve(result.map(resourceData => [resourceData.resourceId, resourceData]));
   } else {
    const result = await MongooseStorageEngine.model.findOne({ resourceId });
    if (!result) {
     throw new KeyNotFoundError(`Resource ${resourceId} not found`);
    }
    resolve([resourceId, result]);
   }
  } catch (err) {
   reject(err);
  }
 });
}

/**
 * Store resource data in the database
 * @param {string} resourceId The resource id
 * @param {string} data The resource data
 * @returns {Promise<void>}
 */
function put(resourceId, data) {
 return new Promise(async (resolve, reject) => {
  try {
   const resourceData = await MongooseStorageEngine.model.findOne({ resourceId });
   if (resourceData) {
    await MongooseStorageEngine.model.updateOne({ resourceId }, { $set: { data } });
   } else {
    await MongooseStorageEngine.model.create({ resourceId, data });
   }
   resolve();
  } catch (err) {
   reject(err);
  }
 });
}

/**
 * Check if item with resourceId exist in the database
 * @param {string} resourceId The resource id
 * @returns {Promise<boolean>}
 */
function has(resourceId) {
 return new Promise(async (resolve, reject) => {
  try {
   const result = await MongooseStorageEngine.model.findOne({ resourceId });
   resolve(!!result);
  } catch (err) {
   reject(err);
  }
 });
}

/**
 * Delete singular data item or all items from the database
 * @param {string} resourceId The resource id
 * @returns {Promise<void>}
 */
function del(resourceId) {
 return new Promise(async (resolve, reject) => {
  try {
   if (!resourceId) {
    await MongooseStorageEngine.model.deleteMany({});
    resolve(`Succesfully deleted all items`);
   } else {
    await MongooseStorageEngine.model.deleteOne({ resourceId });
    resolve(`Succesfully deleted item with resourceId ${resourceId}`);
   }
  } catch (err) {
   reject(err);
  }
 });
}

class MongooseStorageEngine extends StorageEngine {

 /**
  * @type {OPTIONS}
  * @private
  */
 #options = {};

 /**
  * @type {Connection}
  * @public
  * @static
  */
 static connection = null;

 /**
  * @type { Model }
  * @public
  * @static 
  */
 static model = null;

 /**
  * @param {OPTIONS} [options] The options to use for the storage engine (optional)
  */
 constructor(options = OPTIONS) {
  super('Mongoose', StorageType.DB, new StorageFunctionGroup(
   new StorageFunction(StorageFunctionType.GET, get),
   new StorageFunction(StorageFunctionType.PUT, put),
   new StorageFunction(StorageFunctionType.DEL, del),
   new StorageFunction(StorageFunctionType.HAS, has)
  ));

  this.#options = mergeNoArray(OPTIONS, options);
  MongooseStorageEngine.model = this.#options.model;
 }

 /**
  * Initialize the database connection
  * @returns {Promise<*>}
  */
 init() {
  return new Promise((resolve, reject) => {
   // Get the options 
   const { host, database, mongooseOpts } = this.#options;
   // Connect to the Mongoose database
   MongooseStorageEngine.connection = mongoose.connect(`${host}${database}`, mongooseOpts).then(
    () => resolve(`Connected to Mongoose database ${database}`),
    (err) => reject(err));
  });
 }

 /**
  * Get the number of keys in the database
  * @returns {number} The number of keys
  */
 get size() { return this.#size(); }
 async #size() {
  try {
   const result = await MongooseStorageEngine.model.countDocuments();
   return result;
  } catch (err) {
   return err;
  }
 }

 /**
  * Migrate function takes the existing and adds all entries to the database.
  * @param {*[]} data The existing data
  * @returns {Promise<*>}
  */
 migrate(data) {
  return new Promise((resolve, reject) => {
   Promise.all(data.map(([key, value]) => has(key).then((exists) => !exists && put(key, value))))
    .then((results) => resolve(`${results.length} entries migrated`))
    .catch(reject);
  });
 }

 /** Delete the collection
  * @returns {Promise<*>}
  */
 deleteTable() {
  return new Promise(async (resolve, reject) => {
   try {
    await MongooseStorageEngine.model.collection.drop();
    resolve(`Collection ${MongooseStorageEngine.model} deleted`);
   } catch (err) {
    reject(err);
   }
  });
 }

}


module.exports = {
 EngineName,
 EngineVersion,
 MongooseStorageEngine
}