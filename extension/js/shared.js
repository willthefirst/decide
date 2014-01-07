var config = {
	debug: false,
	redirectUrl: chrome.extension.getURL('views/redirect.html'),
	default : {
		periods: 2,
		periodLength: 30,
		distractions: [],
		entries : []
	}
};

// Use local chrome storage for development to avoid hitting MAX_WRITES
var chromeStorage;
if(config.debug){
	chromeStorage = chrome.storage.local;
} else {
	chromeStorage = chrome.storage.sync;
}