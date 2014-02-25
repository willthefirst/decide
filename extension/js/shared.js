var config = {
	debug: true,
	debug_fastAlarms: false,
	debug_fastDailyRefresh: false,
	redirectUrl: chrome.extension.getURL('views/redirect.html'),
	optionsUrl: chrome.extension.getURL('views/options.html'),
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

	full : function() {
		this.getAllAlarms();
		this.getAllEntries();
	},

	// Get alarms set
	getAllAlarms : function() {
		chrome.alarms.getAll(function(alarms){
			if (!alarms) {
				console.error('Alarm failed to set.')
			}
			else {
				var rings = new Date(alarms.scheduledTime);
				for (var i = 0; i < alarms.length;i++) {
					rings = new Date(alarms[i].scheduledTime);
					console.log(alarms[i].name, rings);
				}
			}
		});
	},

	getAllEntries : function() {
		chromeStorage.get(function(data){
			var entries = data.entries
			for (var i = 0; i < entries.length;i++) {
				console.log(entries[i].domain + " has " + entries[i].periodsLeft + " periods left." );
			}
		});
	},

	getRedirectRules : function() {
		chrome.declarativeWebRequest.onRequest.getRules(null,
			function(rules) {
				console.info('Now the following rules are registered: ' + JSON.stringify(rules, null, 2));
			}
		);
	}
}
