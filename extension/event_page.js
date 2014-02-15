/* 	Browser action functions
	------------------------------------------------------- */

function listenForBrowserActionUpdates(details) {
	var old_request;
	var domain_info = JSON.parse(details.message);
	var requestId = details.requestId;
	if (domain_info.type === 'update_badge'
		&& requestId !== old_request) {
		old_request = requestId;
		manageBrowserActionForPeriod( domain_info.domain , details.tabId );
	}
	else if (domain_info.type === 'reset_badge') {
		resetBrowserAction( details.tabId );
	}
}

chrome.declarativeWebRequest.onMessage.addListener(listenForBrowserActionUpdates);

function manageBrowserActionForPeriod( domain , tab ) {
	// Set popup for badge
	// Make sure the rule is still true (case where user removes domain from options page during a session)
	getAllLocalInfo(function(localData) {
		var domain_exists = localDomainInfo( domain, localData, 'object' );
		if (domain_exists) {
			setBrowserActionToPeriod(tab);
		}
		else {
			resetBrowserAction(tab);
		}
	});
}

// If entry is removed on options page, reset the browser action and popup
chrome.runtime.onMessage.addListener(function ( request, sender, sendReponse ) {
	if (request.type === "entry_removed" ) {
		getTabsWithDomain(request.domain, function(tabs){
			for(var i = 0; i < tabs.length; i++) {
				resetBrowserAction( tabs[i] );
			}
		});
	}
});

function entryRemovedForThisTab ( tab ) {
	return function entryRemoved ( request, sender, sendReponse ) {
		if (request.type === "entry_removed" && request.domain === domain ) {
			resetBrowserAction( tab );
			// Clear this listener.
			chrome.runtime.onMessage.removeListener(entryRemoved);
		}
	}
}

// Disable browser action for specified urls
function tabUrlContains( array, tab_url ) {
	if (Object.prototype.toString.call( array ) !== '[object Array]') {
		console.error('tabUrlContains expects an array as the 1st parameter, but received a ' + typeof array);
		return false;
	}
	for (var i = 0; i < array.length; i++) {
		if(tab_url.indexOf(array[i]) !== -1) {
			return array[i];
		}
	}
	return false;
}

// Disable browser action for urls that should never be blocked
chrome.webNavigation.onDOMContentLoaded.addListener(function(details){
	chrome.browserAction.disable( details.tabId )
}, {
	url: [
	 	{ urlContains: 'chrome://'},
     	{ urlContains: 'newtab'},
    ]
});

// Disable any chrome-extension:// url
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	if (changeInfo.status === "complete") {
		if (tabUrlContains(['chrome-extension://'], tab.url)) {
			chrome.browserAction.disable( tabId );
		}
	}
});

function setBrowserActionToPeriod( tab ) {

	// Add this listener to avoid weird bug of popup getting set then unset (only occurs sometimes)
	chrome.tabs.onUpdated.addListener(function setPeriod( tabId, changeInfo, tabObject ) {

		if ( tabId === tab ) {
			chrome.browserAction.setBadgeText({
				text: ' ',
				tabId: tab
			});

			// Set info popup
			chrome.browserAction.setPopup({
				popup: '/views/popup/period-info.html',
				tabId: tab
			});
		}

		chrome.tabs.onUpdated.removeListener(setPeriod);

	})
}

function resetBrowserAction( tab ) {
	chrome.browserAction.setBadgeText({
		text: '',
		tabId: tab
	});
	// Set info popup
	chrome.browserAction.setPopup({
		popup: '/views/popup/add.html',
		tabId: tab
	});
}

function getTabsWithDomain( domain , callback ) {
	chrome.tabs.query({
		url: '*://*.' + domain + '/*'
	}, function(array) {
		if (array.length !== 0) {
			var tabs_to_close = [];
			for (var i = 0; i < array.length; i++) {
				tabs_to_close.push(array[i].id);
			}
		}
		callback(tabs_to_close);
	});
}

/* 	Alarm functions
	------------------------------------------------------- */
function listenForAlarms(alarm) {
	var name = alarm.name;
	// If alarm is the daily refresh alarm, fill up periodsLeft for all domains
	if(alarm.name === "daily_refresh") {
		chrome.alarms.clearAll();
		resetAllPeriods();
		// reset alarm
		setDailyRefresh();
	}

	// Else, end period and clear the alarm
	else {
		// Close any open tabs matching the domain to the redirect page.
		getTabsWithDomain(alarm.name, function(tabs){
			chrome.tabs.remove(tabs);
		})

		getAllLocalInfo(function(localData){
			var periodsLeft = localDomainInfo( alarm.name, localData, 'object' ).periodsLeft;
			var msg;
			var title;

			if (periodsLeft > 1) {
				msg = "You can use it " + periodsLeft + " more times today.";
				title = 'Done checking ' + alarm.name;
			}
			else if (periodsLeft === 1) {
				msg = "You can use it one last time today.";
				title = 'Done checking ' + alarm.name;
			}
			else {
				msg = "You can check " + alarm.name + " tomorrow.";
				title = "Finished for today.";
			}

			// Notify that period is over
			var notify_period_over = webkitNotifications.createNotification(
			 'img/heron_48.png', // icon url
			  title,  // notification title
			  msg  // notification body text
			);

			notify_period_over.show();
		});

		// Update local storage
		updateDomainInfo(alarm.name, {
			periodBeingUsed: false
		}, function() {
			refreshFromLocal();
		});

		// Remove alarm
		chrome.alarms.clear(alarm.name);
	}
};

// Create alarm that refreshes all periodsLeft every day
function setDailyRefresh() {
	var midnight = new Date();
	midnight.setHours(24,0,0,0);

	midnight = midnight.getTime();
	// midnight = ((midnight.getTime()) + 1000*60) ;

	chrome.alarms.create('daily_refresh', {
		when: midnight
	});
};

// Initialize functions

var resetAllPeriods = function() {
	getAllLocalInfo(function(data) {
		if(!data.entries) {
			return;
		}
		var entries = data.entries;
		for (var i = 0; i < entries.length; i++) {
			entries[i].periodsLeft = entries[i].periods;
			entries[i].periodBeingUsed = false;
		}
		chromeStorage.set( { 'entries': entries } , function() {
			if(chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError.message);
				return;
			}
			refreshFromLocal();
		});
	});
};

function showIntroduction() {
	chrome.tabs.create({url: chrome.extension.getURL('views/options.html')})
}

// Because registered rules are persisted beyond browser restarts, we remove
// previously registered rules before registering new ones.
function setup() {

	// Clear old alarms and period counters
	chrome.alarms.clearAll();
	resetAllPeriods();

	// Set up new listeners.
	setDailyRefresh();

	// Badge managment
	chrome.browserAction.setBadgeBackgroundColor({color: "#5fff99"});

	// Display options page
	showIntroduction();
};

// This is triggered when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(setup);
chrome.alarms.onAlarm.addListener(listenForAlarms);


/* 	########### DUPLICATES FROM FACTORIES.JS ###########
	------------------------------------------------------- */

// Gets object or index for specified domain (domain) from all entries (localData)
function localDomainInfo( domain, localData, returnType ) {
	if (!localData.entries) {
		return;
	} else {
		var found = false;
		for (var i = 0; i < localData.entries.length; i++) {
			if (localData.entries[i].domain === domain) {
				found = true;
				switch (returnType) {
					case 'object':
						return localData.entries[i];
					break
					case 'index':
						return i;
					break
				}
			}
		}
		if (!found) {
			// console.error('Entry not found!');
			return false;
		}
	}
};

function getAllLocalInfo(callback) {
	chromeStorage.get( null, function( data ) {
		callback(data);
	});
};

function updateDomainInfo( redirectedDomain, propsToUpdate, callback ) {
	getAllLocalInfo(function(data) {

		// Note: there is a very strange bug when console.log(data), at least in the chrome web inspector.
		// console.log(data) -> data.entries[0].periodBeingUsed is true. (this is wrong)
		// console.log(data.entries[0].periodBeingUsed) -> data.entries[0].periodBeingUsed is false. (this is right)

		// Create the new entry
		var new_entry = localDomainInfo( redirectedDomain, data, 'object' );
		var i = 0;
		for (i in propsToUpdate) {
			new_entry[i] = propsToUpdate[i];
		};

		// Find the index of correct entry and update
		var new_entry_index = localDomainInfo( redirectedDomain, data, 'index' );
		data.entries[new_entry_index] = new_entry;

		// Update the whole entries object in local storage.

		chromeStorage.set( { 'entries' : data.entries }, function() {
			if(chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError.message);
				return;
			}
			callback();
		});

	});
};

/* 	Redirect Rules
	------------------------------------------------------- */

// Utility variables
var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
var RedirectByRegEx = chrome.declarativeWebRequest.RedirectByRegEx;
var SendMessageToExtension = chrome.declarativeWebRequest.SendMessageToExtension;
var IgnoreRules = chrome.declarativeWebRequest.IgnoreRules;

var registerRules = function( data ) {

	var rules = [];
	var check_for_redirects = [];
	var entries = data.entries;
	var rule;
	var message = {};
	for ( var i = 0; i < entries.length; i++) {
		// If period is in use, alert event_page to update badge
		if (entries[i].periodBeingUsed) {
			message = {
				'type' : 'update_badge',
				'domain' : entries[i].domain,
				'periodEnd' : entries[i].periodEnd
			};
			message = JSON.stringify(message);
			rule = {
				priority: 500,
				conditions: [
					new RequestMatcher({
						url: {
							hostContains: entries[i].domain
						},
						stages: ['onHeadersReceived'],
						resourceType: ['main_frame']
					})
				],
				actions: [
					new IgnoreRules({
						lowerPriorityThan: 500
					}),
					new SendMessageToExtension({message : message})
				]
			};
		}
		// If period is not being used, redirect
		else {
			rule = {
				priority: 500,
				conditions: [
					new RequestMatcher({
						url: {
							hostContains: entries[i].domain
						}
					})
				],
				actions: [
					new IgnoreRules({
						lowerPriorityThan: 500
					}),
					new RedirectByRegEx({
						from: '(.*)',
						to: ([config.redirectUrl] + '?' + 'domain=' + entries[i].domain + '&original=' + '$1')
					})
				]
			};
		}
		rules.push(rule);
	}

	// Reset badge to normal for any url, overrided by redirect rules.
	var default_message = {
		type : 'reset_badge'
	};
	default_message = JSON.stringify(default_message);
	var all_urls_rule = {
		priority: 100,
		conditions: [
			new RequestMatcher({
				url: {
					schemes: ['http','https']
				},
				stages: ['onHeadersReceived'],
				resourceType: ['main_frame']
			})
		],
		actions: [
			new SendMessageToExtension({message : default_message})
		]
	};

	rules.push(all_urls_rule);

	// Callback after rules are accepted
	var callback = function() {
		if (chrome.runtime.lastError) {
			console.log('Error adding rules: ');
			console.dir(chrome.runtime.lastError.message);
		}
		// else {
		// 	chrome.declarativeWebRequest.onRequest.getRules(null,
		// 		function(rules) {
		// 			console.info('Now the following rules are registered: ' + JSON.stringify(rules, null, 2));
		// 		}
		// 	);
		// }
	};

	chrome.declarativeWebRequest.onRequest.addRules(rules, callback);

};

function refreshFromLocal() {
	chrome.declarativeWebRequest.onRequest.removeRules(
		null,
		function() {
			if (chrome.runtime.lastError) {
				console.error('Error clearing rules: ' + chrome.runtime.lastError);
			} else {
				getAllLocalInfo(function(data){
					registerRules(data);
				});
				chrome.declarativeWebRequest.onRequest.getRules(
					null,
					function(stuff) {
						if(stuff && stuff.length > 0) {
							console.error('Refresh the extension. Failed to clear redirect rules before setting new ones. This is probably due to old rules from chrome.storage.sync/storage being left over.');
						}
					}
				);
			}
		}
	);
};

function cleanDomainString( string ) {
	if (!string) {
		return;
	}

	// parseUri 1.2.2
	// (c) Steven Levithan <stevenlevithan.com>
	// MIT License

	parseUri.options = {
		strictMode: false,
		key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		q:   {
			name:   "queryKey",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
		},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
		}
	};

	function parseUri (str) {
		var	o   = parseUri.options,
			m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
			uri = {},
			i   = 14;

		while (i--) uri[o.key[i]] = m[i] || "";

		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});

		return uri;
	};

	return parseUri(string);
}