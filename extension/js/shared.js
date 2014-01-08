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

// Debug tools
var debug = {

	// Get alarms set
	getAllAlarms : function() {
		chrome.alarms.getAll(function(alarms){
			if (!alarms) {
				console.error('Alarm failed to set.')
			}
			else {
				var rings = new Date(alarms.scheduledTime);
				for (var i = 0; i<alarms.length;i++) {
					rings = new Date(alarms[i].scheduledTime);
					console.log(alarms[i].name, rings);
				}
			}
		});
	}
}
