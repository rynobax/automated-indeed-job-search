const indeed = require('indeed-scraper');
const ini = require('ini');
const fs = require('fs');

const config = ini.parse(fs.readFileSync('./config/config.ini', 'utf-8'));
const keywords = require('./keywords.js')('./config/keywords.txt');
const queries = require('./queries.js')('./config/queries.txt');

const db = require('./db.js');
const notify = require('./notify.js');

module.exports.run = function(){
	// Make sure DB is initialized
	console.log('about to init db');
	db.init()
		.then(() => {
			console.log('done with db init');
			checkForJobs();
			setInterval(checkForJobs, 1000 * 60 * config.refreshTimeMinutes);
		})
		.catch(console.error);
}

function checkForJobs(){
	// Query indeed for new jobs
	console.log('Checking for jobs');
	Promise.all(queries.map(e => queryPromise(e.q, e.c, e.r, e.l, 1)))
		.then(res => {
			// Filter out duplicates
			const jobs = [].concat.apply(...res);
			return getUniqueJobs(jobs);
		})
		.then(filtered => {
			console.log('Found ' + filtered.length + ' unique jobs');
			// Check if the jobs are in the db
			return Promise.all(filtered.map(db.check));
		})
		.then(newJobsAndNull => {
			// Jobs that we have previously seen are returned as null
			return newJobsAndNull.filter(e => e != null);
		})
		.then(newJobs => { 
			return Promise.all(newJobs.map(getScore));
		})
		.then(scoredJobs => {
			return scoredJobs.filter(job => job.score >= config.minScore);
		})
		.then(goodJobs => {
			// Notify about the new jobs if necessary
			console.log('Found ' + goodJobs.length + ' good new jobs.');
			return Promise.all(goodJobs.map(notify));
		})
		.then(() => {
			console.log('Done');
		})
		.catch(err => {
			console.error('Got error in checkForJobs:\n', err);
		});
}

function getScore(job){
  // Adds score to job object
	return new Promise((resolve, reject) => {
		const haveTitleKeyword = keywords.titleKeywords.map(e => lc(e)).some(e => job.title.includes(e));
		if(!haveTitleKeyword) {
			job.score = -1;
		}else{
			const jobInfoLC = {
		    title: lc(job.title),
		    body: lc(job.body)
		  };
		  const score = keywords.bodyKeywords.reduce((s, e) => {
		    let v = 0;
		    if(jobInfoLC.title.includes(e.key)){
		      v += e.val * 3;
		    }
		    if(jobInfoLC.body.includes(e.key)){
		      v += e.val;
		    }
		    return s + v;
		  }, 0);
			job.score = score;
		}
		resolve(job);
	});
}

function getUniqueJobs(jobs){
	jobs.forEach(job => job.id = job.title + job.summary);
	const idMap = jobs.map(e => e.id);
	const filtered = jobs.filter((e, i) => idMap.indexOf(e.id) == i);
	return filtered;
}

function queryPromise(query, city, radius, level, maxAge){
  return new Promise((resolve, reject) => {
    indeed.query({query: query, city: city, radius: radius, level: level, maxAge: maxAge})
      .then(res => resolve(res))
      .catch(err => {
        console.error('Error for ' + city + ': ' + err);
        resolve([]);
      });
  });
}

function lc(str){
	if(str != null) return str.toLowerCase();
	return '';
}
