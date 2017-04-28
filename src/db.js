const AWS = require('aws-sdk');

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000"
});
const dynamodb = new AWS.DynamoDB();

const INDEED_TABLE_NAME = 'INDEED_JOBS';
module.exports.init = function(){
	return tableExists(INDEED_TABLE_NAME)
		.then(tableExists => {
			if(!tableExists){
				return createTable(INDEED_TABLE_NAME);
			}
		})
		.catch(err => {
			throw err;
		});
}

module.exports.check = function(job) {
	// Accepts a job and adds it to the table if it is not already in it
	return new Promise(function(resolve, reject) {
		const params = {
			Key: {
				"jobUniqueString": {
					S: getKey(job)
				},
			}, 
			TableName: INDEED_TABLE_NAME
		};
		dynamodb.getItem(params, function(err, data) {
			if(err) {
				reject(err);
			} else {
				if(Object.keys(data).length === 0){
					// If it's not in the DB add it and resolve it
					add(getKey(job), INDEED_TABLE_NAME)
						.then(() => resolve(job))
						.catch(reject);	
				} else {
					resolve(null);
				}
			}
		});
	});
}

function tableExists(tableName) {
	return new Promise((resolve, reject) => {
		const params = {
			TableName: tableName
		};
		dynamodb.describeTable(params, function(err, data) {
			if (err){
				if(err.statusCode === 400) {
					resolve(false);
				} else {
					reject(err);
				}
			} else {
				resolve(true);
			}
		});
	});
}

function createTable(tableName) {
	return new Promise((resolve, reject) => {
			const params = {
				TableName : tableName,
				AttributeDefinitions: [       
						{ AttributeName: "jobUniqueString", AttributeType: "S" }
				],
				KeySchema: [       
						{ AttributeName: "jobUniqueString", KeyType: "HASH"}
				],
				ProvisionedThroughput: {       
						ReadCapacityUnits: 1, 
						WriteCapacityUnits: 1
				}
		};

		dynamodb.createTable(params, function(err, data) {
				if (err) {
						reject(err);
				} else {
						resolve(data);
				}
		});
	});
}

function add(key, tableName) {
	// Adds a job to the DB
	return new Promise(function(resolve, reject) {
 		const params = {
  		Item: {
   			"jobUniqueString": {
     			S: key
    		}
  		}, 
  		ReturnConsumedCapacity: "NONE", 
  		TableName: tableName
		};
		dynamodb.putItem(params, function(err, data) {
			if (err) reject(err);
			else resolve(data);
		});
 });
}

function getKey(job) {
	// Gets the unique key for a job
		let key = '';
		key += lc(job.title);
		key += lc(job.company);
		key += hash(job.summary);
		return key;
}

function hash(string) {
	// Creates hash from a string
	// used to get some uniqueness from the summary
  var hash = 0, i, chr, len;
  if (string.length === 0) return hash;
  for (i = 0, len = string.length; i < len; i++) {
    chr   = string.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function lc(str){
  if(str) return str.toLowerCase();
  return '';
}
