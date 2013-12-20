// Configuration
var config = {
	redirectUrl: chrome.extension.getURL('redirect/index.html')
};

// Utility variables
var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
var RedirectRequest = chrome.declarativeWebRequest.RedirectRequest;

// Register rules
var registerRules = function( domain_list ) {

	var rules = [];

	for (var i = 0; i < domain_list.length; i++ ) {
		var redirectRule = {
			conditions: [
				new RequestMatcher({
					url: {
						hostContains: domain_list[i]
					}
				})
			],
			actions: [
				new RedirectRequest({
					redirectUrl: ( config.redirectUrl + '?' + domain_list[i] )
				})
			]
		};
		rules.push(redirectRule);
	}

	var callback = function() {
		if (chrome.runtime.lastError) {
			console.error('Error adding rules: ' + chrome.runtime.lastError);
		} else {
			console.info('Rules successfully updated');
			chrome.declarativeWebRequest.onRequest.getRules(null,
				function(rules) {
					console.info('Now the following rules are registered: ' +
						JSON.stringify(rules, null, 2));
				}
			);
		}
	};

	chrome.declarativeWebRequest.onRequest.addRules(
		rules, callback);
};

// https://developer.chrome.com/extensions/examples/extensions/catifier/event_page.js
function setup() {
  // This function is also called when the extension has been updated.  Because
  // registered rules are persisted beyond browser restarts, we remove
  // previously registered rules before registering new ones.
  chrome.declarativeWebRequest.onRequest.removeRules(
	null,
	function() {
		if (chrome.runtime.lastError) {
			alert('Error clearing rules: ' + chrome.runtime.lastError);
		} else {
			var domain_list = [];
			chrome.storage.sync.get('entries', function( data ) {
				for ( var i = 0; i < data.entries.length; i++) {
					domain_list.push(data.entries[i].domain);
				}

				if (domain_list.length > 0) {
					registerRules(domain_list);
				}
				else {
					chrome.declarativeWebRequest.onRequest.removeRules(
						null,
						function() {
							if (chrome.runtime.lastError) {
								alert('Error clearing rules: ' + chrome.runtime.lastError);
							} else {
								console.log('Rules cleared.');
							}
						}
					);
				}
			});
		}
	});
}

// This is triggered when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(setup);

// Next: prompt and store user input
// https://gomockingbird.com/mockingbird/#gzb5vxa/sCsPR
