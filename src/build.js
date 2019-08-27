const fs = require("fs-extra");
const marked = require("marked");
const colors = require("colors");
const hljs = require("highlight.js");
const cli = require("commander");
const path = require("path");

cli.option("-p --post <file>", "Transform a single post of the posts directory.");

cli.parse(process.argv);

marked.setOptions({
	highlight: function(code, lang) {
		if (!lang) {
			return code;
		}
		
		return hljs.highlight(lang, code).value;
	}
});


const ROOT = path.resolve(__dirname, "..");
const BLOGDIR = ROOT +"/posts";
const BLOGDIR_OUTDIR = ROOT +"/posts/json";
const POST_INDEX_FILE = BLOGDIR_OUTDIR +"/index.json";
const POST_FORMAT = /^\d{4}-\d{2}-\d{2}/;
const CODE_STYLESHEET = ROOT +"/node_modules/highlight.js/styles/vs2015.css";
const CODE_STYLESHEET_DEST = ROOT +"/assets/css/codestyle.css";

let startTime = new Date();
let index = {};

startTime = new Date();
console.log(`Started post transformation at ${startTime.toTimeString().slice(0,8)}.`);
if (cli.post) {
	/** load possible existing index */
	if (fs.pathExistsSync(POST_INDEX_FILE)) {
		index = fs.readJSONSync(POST_INDEX_FILE);
		console.log(`Loaded index in ${duration(startTime)}`)
	}

	const file = BLOGDIR +"/"+ cli.post;
	fs.pathExists(file, (err, exists) => {
		if (exists) {
			transformPost(file, processingFinished);
		}
	});
}
else {
	/** rebuild all posts, dont load index file */

	fs.readdir(BLOGDIR, (err, files) => {
		/** subtract default non-posts */
		const nrOfPosts = files.length - 2;
		var processedPosts = 0;
		console.log(`Found ${nrOfPosts} posts:`);

		files.forEach(file => {
			transformPost(file, (ok) => {
				processedPosts++;

				if (processedPosts === nrOfPosts) {
					processingFinished();
				}
			});
		});
	});
}

fs.copy(CODE_STYLESHEET, CODE_STYLESHEET_DEST, err => {
	if (err) {
		console.log(`[${"FAIL".red}] Copying code stylesheet: ${err.message}`);
	}
	else {
		console.log(`[${"OK".green}] Copying code stylesheet.`);
	}
});



function transformPost(file, cb) {
	if (!file.endsWith(".md") || !POST_FORMAT.test(file)) {
		return;
	}

	fs.readFile(BLOGDIR +"/"+ file, "utf8", (err, data) => {
		if (err) {
			console.log(`[${"FAIL".red}] ${file}: ${err.message}`);
			cb(false);
			return;
		}

		if (data === "" || data.length < 3) {
			console.log(`[${"FAIL".yellow}] ${file}: ${"Invalid post! Skipping...".yellow}`);
			cb(false);
			return;
		}
		
		const post = createPost(file, data);

		const postStr = JSON.stringify(post);
		const fileName = file.slice(0, -3) + ".json";
		const destination = BLOGDIR_OUTDIR +"/"+ fileName;
		fs.writeFile(destination, postStr, "utf8", (err) => {
			if (err) {
				console.log(`[${"FAIL".red}] ${file}: ${err.message}`);
				cb(false);
				return;
			}

			console.log(`[${"OK".green}] ${file}`);
			
			addToIndex(post);
			cb(true);
		});
	});
}

function processingFinished() {
	const endTime = new Date();
	console.log(`Finished post transformation at ${endTime.toTimeString().slice(0,8)}.`);
	console.log(`Time used: ${duration(startTime, endTime)}`)

	const indexStr = JSON.stringify(index);
	fs.writeFile(POST_INDEX_FILE, indexStr, "utf8", (err) => {
		if (err) {
			console.log(`[${"FAIL".red}] Writing index file: ${err.message}`);
			throw err;
		}

		console.log(`[${"OK".green}] Writing index file.`);
	});
}

function addToIndex(post) {
	if (!index[post.year]) {
		index[post.year] = {};
	}
	
	const indexObj = {};
	indexObj.id = post.id
	indexObj.title = post.title;
	index[post.year][post.id] = indexObj;
}

function createPost(file, data) {
	const post = {};
	post.id = file.slice(0, -3);
	post.title = data.slice(1, data.indexOf("\n")).trim();
	post.year = file.slice(0, 4);
	post.created = file.slice(0, 10);
	post.html = marked(data);
	post.lastUpdate = "";
	if (data.indexOf("*Update ") !== -1) {
		/** use natural sorting of updates: old -> new */
		const matches = [...data.matchAll(/^\*Update (\d{4}.\d{2}.\d{2}|\d{2}.\d{2}.\d{4}).*?\*/mg)];
		post.lastUpdate = matches[matches.length - 1][1];
	}

	return post;
}

function duration(start, end) {
	end = end || new Date();
	const durationMS = end - start;
	const ms = durationMS % 1000;
	const hhmmss = (new Date(durationMS)).toUTCString().slice(17,25);
	return hhmmss +"."+ ms;
}