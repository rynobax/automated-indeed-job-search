module.exports = function(path){
	const title = [];
	const body = [];
	let array = null;
	require('fs')
		.readFileSync(path, 'utf-8')
		.split(/\r?\n/)
		.forEach(line => {
			if(line == '***title***'){
				array = title;
			}else if(line == '***body***'){
				array = body;
			}else if(line == '***'){
				array = null;
			}else{
				if(array) array.push(line);
			}
		});

	return {
		titleKeywords: title,
		bodyKeywords: body.map(e => {
			let s = e.split(' ');
			const val = Number(s.pop());
			const key = s.join(' ');
			return {
				key: key,
				val: val
			}
		})
	}
}
