module.exports = function(path){
	return require('fs')
		.readFileSync(path, 'utf-8')
		.split(/\r?\n\r?\n/)
		.map(e => {
			const s= e.split(/\r?\n/);
			return {
				q: s[0],
				c: s[1],
				r: s[2],
				l: s[3]
			}
		});
}
