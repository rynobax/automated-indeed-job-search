const fs = require('fs');
const ini = require('ini');
const request = require('request');
const nodemailer = require('nodemailer');

const config = ini.parse(fs.readFileSync('./config/config.ini', 'utf-8'));
const emailConfig = ini.parse(fs.readFileSync('./config/email.ini', 'utf-8'));
const transporter = nodemailer.createTransport('smtps://'+emailConfig.from+':'+emailConfig.password+'@smtp.gmail.com');

module.exports = function(job){
  return getJobInfo(job).then(job => {
		const subject = 'Possible Job: ' + job.title;
		const msg = jobHtml(job);
		return sendEmail(subject, msg);
	});
}

function getJobInfo(job){
  return new Promise((resolve, reject) => {
    request({url: job.url, timeout: 1500}, (error, response, body) => {
      // If we can load the page add that to the info,
      // otherwise just use the title as the info
      if (!error) {
				job.body = body + job.summary;
        resolve(job);
      }else{
				job.body = job.summary;
        resolve(job);
      }
    });
  });
}

function sendEmail(subject, msg){
	console.log('sending email with subject: ', subject);
	return new Promise(function(resolve, reject) {
	  const from = emailConfig.from;
	  const pass = emailConfig.password;
	  const to = emailConfig.to;

		const mailOptions = {
			from: from, // sender address
			to: to, // list of receivers
			subject: subject, // Subject line
			html: msg // plaintext body
		};
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				reject(error);
			}else{
				resolve();
			}
		});
	});
}

function jobHtml(job){
	let html = '';
  html += '<a href="' + job.url + '">' + job.title + '</a>';
  html += ' | ' + job.score;
  html += '</h3>';
  html += '<h4>' + job.company + ' (' + job.location + ')' + '</h4>';
  html += '<p>' + job.summary + '</p>';
  html += '</p>';
	html += 'Posted ' + job.postDate;
	return html;
}

function lc(str){
	if(str != null) return str.toLowerCase();
	return '';
}
