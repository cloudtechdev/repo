/* 
 * READ ME
 * 
 * NOTE: 1. BEFORE ANY MODIFICATIONS CREATE A BACKUP COPY
 * 		 2. DO NOT DELETE LINES WHEN EDITING A LIVE SCRIPT.
 * 		    Create a copy of the the section to be modified and comment out the original, see example below.
 * 		 3. IF YOU ARE NOT THE OWNER OF THE SCRIPT OR IF YOU ARE EDITING OTHER'S CHANGES -- CREATE A TAG, see example below:
 * 		 		/** START Marc Abaya 01/23/2017 
 * 		 				  Marc Abaya 01/24/2017 **
 * 		 		//var name = 'Cloudtech';
 * 		 		var name = '5 Corners';
 * 		 		/** END Marc Abaya 01/23/2017
 * 		 				Marc Abaya 01/24/2017 **
 * 		 4. BEFORE ANY MODIFICATIONS UPDATE THE DETAILS BELOW
 * 		 
 * Module Name: IMPORT REQUEST REPORT
 * Type: Report
 * Creator: Marc Abaya
 * Date Created: 1/23/2017
 * Last Modified by: Marc Abaya
 * Last Modified on: [MM/DD/YYYY]
 */

/** GLOBAL VARIABLES */
var FORM_NAME = 'Import Request Report'
var FORM_FIELDS = ['custpage_subsidiary', 'custpage_location', 'custpage_dateperiod'];
/**
 * Suitelet handler
 * @param  {[type]} request  [description]
 * @param  {[type]} response [description]
 * @return {[type]}          [description]
 */
function main(request, response) {
	var method = request.getMethod();
	/** @type {Object} Field attributes and value */
	var fields = {
		'custpage_subsidiary': {
			'type': 'select',
			'source': 'subsidiary',
			'value': null,
			'label': 'Subsidiary',
			'formElement': '',
		},
		'custpage_location': {
			'type': 'select',
			'source': null,
			'value': null,
			'label': 'Location',
			'formElement': '',
		},
		'custpage_dateperiod': {
			'type': 'date',
			'source': null,
			'value': null,
			'label': 'Date period',
			'formElement': '',
		},
	}

	var form = '';
	var params = getParams(fields, request);
	switch (method) {
		case 'GET':
			// Run methodGet
			var UI = methodGet(params, fields);
			form = UI[0];
			form.setScript('customscriptir_report_cs');
			form.addSubmitButton('Generate');
			fields = UI[1];
			fields = setDefaultValues(fields, params);
			break;
		case 'POST':
			// Run methodPost
			nlapiScheduleScript(
				'customscript_ir_report_sched',
				null, {
					"custscript_ir_location": params.custpage_location,
					"custscript_ir_period": params.custpage_dateperiod,
					"custscript_ir_subsidiary": params.custpage_subsidiary,
				}
			);
			form = nlapiCreateForm('');
			form.setTitle('An email will be sent to you containing the report once the generation is complete. <br/>You can check the generation status here: <a href="https://system.na2.netsuite.com/app/common/scripting/scriptstatus.nl?daterange=TODAY&scripttype=454&primarykey=2250&queueid=&runtimeversion=&sortcol=dcreated&sortdir=DESC&csv=HTML&OfficeXML=F&pdf=&size=50&datemodi=WITHIN&date=TODAY">click here</a>');
			break;
	}

	response.writePage(form);
};

/**
 * After submit processing of suitelet
 * @param  {Object} params [description]
 * @return {[type]}        [description]
 */
function methodPost(params) {
	var context = nlapiGetContext();
	var params = {
		'custpage_location': context.getSetting('script', 'custscript_ir_location'),
		'custpage_dateperiod': context.getSetting('script', 'custscript_ir_period'),
		'custpage_subsidiary': context.getSetting('script', 'custscript_ir_subsidiary'),
	}
	var month_names = {
		'1': 'January',
		'2': 'February',
		'3': 'March',
		'4': 'April',
		'5': 'May',
		'6': 'June',
		'7': 'July',
		'8': 'August',
		'9': 'September',
		'10': 'October',
		'11': 'November',
		'12': 'December'
	};

	var cols = 59;
	var json = {};
	var filters = [
		new nlobjSearchFilter('inventorylocation', null, 'is', params.custpage_location),
	];
	var search = loadSearch('customsearch_ir_item_child', filters);
	search = getResults(search.runSearch(), 0, 1000);
	search.forEach(function(result) {
		if (typeof json[result.getText('custitem_maincat')] === 'undefined') {
			json[result.getText('custitem_maincat')] = {};

			for (var i = 1; i <= cols; i++) {
				json[result.getText('custitem_maincat')][i] = 0;
			}
		}
		if (typeof json[result.getText('custitem_maincat')][result.getText('parent')] === 'undefined') {
			json[result.getText('custitem_maincat')][result.getText('parent')] = {};
			for (var i = 1; i <= cols; i++) {
				json[result.getText('custitem_maincat')][result.getText('parent')][i] = 0;
			}
		}
		if (typeof json[result.getText('custitem_maincat')][result.getText('parent')] === 'undefined') {
			json[result.getText('custitem_maincat')][result.getText('parent')][result.getValue('itemid').split(': ')[1]] = {};
		} else {
			json[result.getText('custitem_maincat')][result.getText('parent')][result.getValue('itemid').split(': ')[1]] = {};
		}
		for (var i = 1; i <= cols; i++) {
			json[result.getText('custitem_maincat')][result.getText('parent')][result.getValue('itemid').split(': ')[1]][i] = 0;
		}
	});

	var searches = {};
	var locs = getAllChildLocation(params.custpage_location);
	var filters = [
		new nlobjSearchFilter('custrecord_pmix_location', null, 'anyof', locs),
	];
	var pmix = loadSearch('customsearch_ir_pmix', filters);
	searches['customsearch_ir_pmix'] = getResults(pmix.runSearch(), 0, 1000);
	Object.keys(json).forEach(function(category) {
		searches['customsearch_ir_pmix'].forEach(function(result) {
			var type = result.getText('custrecord_pmix_item', null, 'GROUP');
			//nlapiLogExecution('DEBUG', 'TYPE', type);
			if (json[category].hasOwnProperty(type)) {
				json[category][type][1] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_pmix_qty', null, 'GROUP')));
			}
		});
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						Object.keys(json[category][type]).forEach(function(brandTotals) {
							if (Utilities.numOrZero(brandTotals) == 1) {
								json[category][type][brand][1] = json[category][type][1];
							}
						});
					}
				});
			}
		});
	});
	var filters = [
		new nlobjSearchFilter('location', null, 'anyof', locs),
		new nlobjSearchFilter('trandate', null, 'onorbefore', nlapiDateToString(nlapiAddDays(nlapiStringToDate(params.custpage_dateperiod), -1))),
		//new nlobjSearchFilter('item',null,'is',2650),
	];

	// Object.keys(json).forEach(function(category) {
	// 	Object.keys(json[category]).forEach(function(parent) {
	// 		if (parseFloatOrZero(parent) == 0) {
	// 			Object.keys(json[category][parent]).forEach(function(brand) {
	// 				if (parseFloatOrZero(brand) == 0) {
	// 					if(brand == item){

	// 					}
	// 				}
	// 			});
	// 		}
	// 	});
	// });
	var begInv = loadSearch('customsearch_ir_beginv', filters);
	searches['customsearch_ir_beginv'] = getResults(begInv.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_beginv'].forEach(function(result) {
		var itemResult = result.getText('item', null, 'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_beginv'].forEach(function(result) {
		var itemResult = result.getText('item', null, 'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity', null, 'SUM')));
	});

	nlapiLogExecution('DEBUG','BEG INV',searches['customsearch_ir_beginv'].length);
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(parent) {
			if (Utilities.numOrZero(parent) == 0) {
				Object.keys(json[category][parent]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][parent][brand][2] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var filters = [
		new nlobjSearchFilter('itemid', null, 'contains', ':'),
	];
	var alc = loadSearch('customsearch_ave_subitems', filters);
	searches['customsearch_ave_subitems'] = getResults(alc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ave_subitems'].forEach(function(result) {
		var itemResult = result.getValue('itemid', null, 'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ave_subitems'].forEach(function(result) {
		var itemResult = result.getValue('itemid', null, 'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('averagecost', null, 'AVG')));
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(parent) {
			if (Utilities.numOrZero(parent) == 0) {
				Object.keys(json[category][parent]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][parent][brand][3] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var monthCnt = 0; // 1st month
	var from = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), (monthCnt - 1)));
	from = from.split('/')[0] + '/' + 22 + '/' + from.split('/')[2];
	var to = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), monthCnt));
	to = to.split('/')[0] + '/' + 21 + '/' + to.split('/')[2];
	nlapiLogExecution('DEBUG', 'DATE', from + ' ' + to);
	var filters = [
		new nlobjSearchFilter('duedate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_incoming', filters);
	searches['customsearch_ir_incoming'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		var date = nlapiStringToDate(result.getValue('duedate'));
		if(date >= nlapiStringToDate(from) && date <= nlapiStringToDate(to)){
			item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity')));
		}
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][5] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var filters = [
		new nlobjSearchFilter('inventorylocation', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_allinv_item_2', filters);
	searches['customsearch_ir_allinv_item_2'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_allinv_item_2'].forEach(function(result) {
		var itemResult = result.getValue('itemid').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_allinv_item_2'].forEach(function(result) {
		var itemResult = result.getValue('itemid').split(': ')[1];
		var date = nlapiStringToDate(result.getValue('duedate'));
		if(date >= nlapiStringToDate(from) && date <= nlapiStringToDate(to)){
			item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity')));
		}
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][5] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var monthCnt = 1; // 2nd month
	var from = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), (monthCnt - 1)));
	from = from.split('/')[0] + '/' + 22 + '/' + from.split('/')[2];
	var to = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), monthCnt));
	to = to.split('/')[0] + '/' + 21 + '/' + to.split('/')[2];
	nlapiLogExecution('DEBUG', 'DATE', from + ' ' + to);
	var filters = [
		new nlobjSearchFilter('duedate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_incoming', filters);
	searches['customsearch_ir_incoming'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		var date = nlapiStringToDate(result.getValue('duedate'));
		if(date >= nlapiStringToDate(from) && date <= nlapiStringToDate(to)){
			item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity')));
		}
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][22] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var monthCnt = 2; // 3rd month
	var from = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), (monthCnt - 1)));
	from = from.split('/')[0] + '/' + 22 + '/' + from.split('/')[2];
	var to = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), monthCnt));
	to = to.split('/')[0] + '/' + 21 + '/' + to.split('/')[2];
	nlapiLogExecution('DEBUG', 'DATE', from + ' ' + to);
	var filters = [
		new nlobjSearchFilter('duedate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_incoming', filters);
	searches['customsearch_ir_incoming'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		var date = nlapiStringToDate(result.getValue('duedate'));
		if(date >= nlapiStringToDate(from) && date <= nlapiStringToDate(to)){
			item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity')));
		}
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][37] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var monthCnt = 3; // 4th month
	var from = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), (monthCnt - 1)));
	from = from.split('/')[0] + '/' + 22 + '/' + from.split('/')[2];
	var to = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), monthCnt));
	to = to.split('/')[0] + '/' + 21 + '/' + to.split('/')[2];
	nlapiLogExecution('DEBUG', 'DATE', from + ' ' + to);
	var filters = [
		new nlobjSearchFilter('duedate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_incoming', filters);
	searches['customsearch_ir_incoming'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		var date = nlapiStringToDate(result.getValue('duedate'));
		if(date >= nlapiStringToDate(from) && date <= nlapiStringToDate(to)){
			item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity')));
		}
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][51] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var monthCnt = 4; // 5th month
	var from = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), (monthCnt - 1)));
	from = from.split('/')[0] + '/' + 22 + '/' + from.split('/')[2];
	var to = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), monthCnt));
	to = to.split('/')[0] + '/' + 21 + '/' + to.split('/')[2];
	nlapiLogExecution('DEBUG', 'DATE', from + ' ' + to);
	var filters = [
		new nlobjSearchFilter('duedate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_incoming', filters);
	searches['customsearch_ir_incoming'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_incoming'].forEach(function(result) {
		var itemResult = result.getText('item').split(': ')[1];
		var date = nlapiStringToDate(result.getValue('duedate'));
		if(date >= nlapiStringToDate(from) && date <= nlapiStringToDate(to)){
			item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity')));
		}
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][56] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	//ELC
	var dates = Utilities.getStartEndMonthDate(params.custpage_dateperiod);
	from = dates.from;
	to = dates.to;
	var filters = [
		new nlobjSearchFilter('trandate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_importrequestincomingpo', filters);
	searches['customsearch_importrequestincomingpo'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custcol_alfa_total_elc',null,'AVG')));
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][6] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 0)));
	from = dates.from;
	to = dates.to;
	var filters = [
		new nlobjSearchFilter('startdate', null, 'on', from),
		new nlobjSearchFilter('enddate', null, 'on', to),
	];
	var posting = loadSearch('customsearch_pperiod', filters);
	searches['customsearch_pperiod'] = getResults(posting.runSearch(), 0, 1000);
	var postingperiod = searches['customsearch_pperiod'][0].id;
	nlapiLogExecution('DEBUG','POSTING PERIOD',postingperiod);
	var filters = [
		new nlobjSearchFilter('postingperiod', null, 'is', postingperiod),
	];
	var ir_inc = loadSearch('customsearch_ir_actualsales', filters);
	searches['customsearch_ir_actualsales'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_actualsales'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_actualsales'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('quantity',null,'SUM')));
	});
	nlapiLogExecution('DEBUG','IR ACTUAL SALES',searches['customsearch_ir_actualsales'].length);
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][16] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 1)));
	from = dates.from;
	to = dates.to;
	var filters = [
		new nlobjSearchFilter('trandate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_importrequestincomingpo', filters);
	searches['customsearch_importrequestincomingpo'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custcol_alfa_total_elc',null,'AVG')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][23] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 2)));
	from = dates.from;
	to = dates.to;
	var filters = [
		new nlobjSearchFilter('trandate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_importrequestincomingpo', filters);
	searches['customsearch_importrequestincomingpo'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custcol_alfa_total_elc',null,'AVG')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][38] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 3)));
	from = dates.from;
	to = dates.to;
	var filters = [
		new nlobjSearchFilter('trandate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_importrequestincomingpo', filters);
	searches['customsearch_importrequestincomingpo'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custcol_alfa_total_elc',null,'AVG')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][52] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 3)));
	from = dates.from;
	to = dates.to;
	var filters = [
		new nlobjSearchFilter('trandate', null, 'within', [from, to]),
		new nlobjSearchFilter('location', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_importrequestincomingpo', filters);
	searches['customsearch_importrequestincomingpo'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_importrequestincomingpo'].forEach(function(result) {
		var itemResult = result.getText('item',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custcol_alfa_total_elc',null,'AVG')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][57] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	//Sales foreast
	//1st month
	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 0)));
	from = dates.from;
	to = dates.to;

	var filters = [
		new nlobjSearchFilter('custrecord_salesfcst_period', null, 'within', [from, to]),
		new nlobjSearchFilter('custrecord_salesfcst_loc', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_salesforecast', filters);
	searches['customsearch_ir_salesforecast'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_qty',null,'SUM')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][10] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_avesrp',null,'AVG')));
	});


	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][11] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});
	//2nd month
	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 1)));
	from = dates.from;
	to = dates.to;

	var filters = [
		new nlobjSearchFilter('custrecord_salesfcst_period', null, 'within', [from, to]),
		new nlobjSearchFilter('custrecord_salesfcst_loc', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_salesforecast', filters);
	searches['customsearch_ir_salesforecast'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_qty',null,'SUM')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][27] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_avesrp',null,'AVG')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][28] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});

	//3rd
	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 2)));
	from = dates.from;
	to = dates.to;

	var filters = [
		new nlobjSearchFilter('custrecord_salesfcst_period', null, 'within', [from, to]),
		new nlobjSearchFilter('custrecord_salesfcst_loc', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_salesforecast', filters);
	searches['customsearch_ir_salesforecast'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_qty',null,'SUM')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][42] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_avesrp',null,'AVG')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][43] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});
	//4th
	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 3)));
	from = dates.from;
	to = dates.to;

	var filters = [
		new nlobjSearchFilter('custrecord_salesfcst_period', null, 'within', [from, to]),
		new nlobjSearchFilter('custrecord_salesfcst_loc', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_salesforecast', filters);
	searches['customsearch_ir_salesforecast'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_qty',null,'SUM')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][50] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});
	//5th
	var dates = Utilities.getStartEndMonthDate(nlapiDateToString(nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), 4)));
	from = dates.from;
	to = dates.to;

	var filters = [
		new nlobjSearchFilter('custrecord_salesfcst_period', null, 'within', [from, to]),
		new nlobjSearchFilter('custrecord_salesfcst_loc', null, 'anyof', locs),
	];
	var ir_inc = loadSearch('customsearch_ir_salesforecast', filters);
	searches['customsearch_ir_salesforecast'] = getResults(ir_inc.runSearch(), 0, 1000);
	var item = {};
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] = 0;
	});
	searches['customsearch_ir_salesforecast'].forEach(function(result) {
		var itemResult = result.getText('custrecord_salesfct_prefbrand',null,'GROUP').split(': ')[1];
		item[itemResult] += Utilities.roundUp(Utilities.numOrZero(result.getValue('custrecord_salesfcst_qty',null,'SUM')));
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						json[category][type][brand][55] = Utilities.numOrZero(item[brand]);
					}
				});
			}
		});
	});
	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						Object.keys(json[category][type]).forEach(function(brand) {
							if (Utilities.numOrZero(brand) == 0) {
								json[category][type][brand][4] = Utilities.roundUp(json[category][type][brand][2] * json[category][type][brand][3]);
								json[category][type][brand][7] = Utilities.roundUp(json[category][type][brand][4] * json[category][type][brand][5]);
								json[category][type][brand][8] = Utilities.roundUp(json[category][type][brand][2] + json[category][type][brand][5]);
								//json[category][type][brand][9] = Utilities.roundUp(((Utilities.roundUp(isFinite(json[category][type][brand][2] / json[category][type][brand][8]) ? json[category][type][brand][2] / json[category][type][brand][8] : 0)) * json[category][type][brand][3]) + ((Utilities.roundUp(isFinite(json[category][type][brand][5] / json[category][type][brand][8]) ? json[category][type][brand][5] / json[category][type][brand][8] : 0)) * json[category][type][brand][6]));
								if (Utilities.numOrZero(json[category][type][brand][8]) > 0) {
									var first = (Utilities.numOrZero(json[category][type][brand][2]) / Utilities.numOrZero(json[category][type][brand][8])) * Utilities.numOrZero(json[category][type][brand][3]);
									var second = (Utilities.numOrZero(json[category][type][brand][5]) / Utilities.numOrZero(json[category][type][brand][8])) * Utilities.numOrZero(json[category][type][brand][6]);
									json[category][type][brand][9] = Utilities.roundUp(first + second);
								} else {
									json[category][type][brand][9] = 0;
								}
								json[category][type][brand][12] = Utilities.roundUp(json[category][type][brand][10] * json[category][type][brand][11]);
								json[category][type][brand][13] = Utilities.roundUp(json[category][type][brand][9] * json[category][type][brand][10]);
								json[category][type][brand][14] = Utilities.roundUp(json[category][type][brand][12] - json[category][type][brand][13]);
								//json[category][type][brand][15] = isFinite(Utilities.roundUp(json[category][type][brand][14] / json[category][type][brand][10])) ? Utilities.roundUp(json[category][type][brand][14] / json[category][type][brand][10]) : 0;
								if (Utilities.numOrZero(json[category][type][brand][10]) > 0) {
									var first = Utilities.numOrZero(json[category][type][brand][14]) / Utilities.numOrZero(json[category][type][brand][10]);
									json[category][type][brand][15] = Utilities.roundUp(first);
								} else {
									json[category][type][brand][15] = 0;
								}
								json[category][type][brand][17] = Utilities.roundUp(json[category][type][brand][10] - json[category][type][brand][16]);
								json[category][type][brand][18] = Utilities.roundUp(json[category][type][brand][8] - json[category][type][brand][16] - json[category][type][brand][17]);
								json[category][type][brand][19] = Utilities.roundUp(json[category][type][brand][8] - json[category][type][brand][17]) > 0 ? Utilities.roundUp(json[category][type][brand][8] - json[category][type][brand][17]) : 0;
								json[category][type][brand][20] = Utilities.numOrZero(json[category][type][brand][9]);
								json[category][type][brand][21] = Utilities.roundUp(json[category][type][brand][19] * json[category][type][brand][20]);
								json[category][type][brand][24] = Utilities.roundUp(json[category][type][brand][22] * json[category][type][brand][23]);
								json[category][type][brand][25] = Utilities.roundUp(Utilities.numOrZero(json[category][type][brand][19]) + Utilities.numOrZero(json[category][type][brand][23]));
								if (Utilities.numOrZero(json[category][type][brand][25]) > 0) {
									var first = (Utilities.numOrZero(json[category][type][brand][19]) / Utilities.numOrZero(json[category][type][brand][25])) * Utilities.numOrZero(json[category][type][brand][20]);
									var second = (Utilities.numOrZero(json[category][type][brand][22]) / Utilities.numOrZero(json[category][type][brand][25])) * Utilities.numOrZero(json[category][type][brand][23]);
									json[category][type][brand][26] = Utilities.roundUp(first + second);
								} else {
									json[category][type][brand][26] = 0;
								}
								json[category][type][brand][29] = Utilities.roundUp(json[category][type][brand][27] * json[category][type][brand][28]);
								json[category][type][brand][30] = Utilities.roundUp(json[category][type][brand][26] * json[category][type][brand][27]);
								json[category][type][brand][31] = Utilities.roundUp(json[category][type][brand][29] - json[category][type][brand][30]);
								//json[category][type][brand][32] = isFinite(Utilities.roundUp(json[category][type][brand][31] / json[category][type][brand][27])) ? Utilities.roundUp(json[category][type][brand][31] / json[category][type][brand][27]) : 0;
								
								if (Utilities.numOrZero(json[category][type][brand][27]) > 0) {
									var first = Utilities.numOrZero(json[category][type][brand][31]) / Utilities.numOrZero(json[category][type][brand][27]);
									json[category][type][brand][32] = Utilities.roundUp(first);
								} else {
									json[category][type][brand][32] = 0;
								}
								json[category][type][brand][33] = Utilities.roundUp(json[category][type][brand][25] - json[category][type][brand][27]);
								json[category][type][brand][34] = Utilities.roundUp(json[category][type][brand][25] - json[category][type][brand][27]) > 0 ? Utilities.roundUp(json[category][type][brand][25] - json[category][type][brand][27]) : 0;
								json[category][type][brand][35] = json[category][type][brand][26];
								json[category][type][brand][36] = Utilities.roundUp(json[category][type][brand][34] * json[category][type][brand][35]);
								json[category][type][brand][39] = Utilities.roundUp(json[category][type][brand][37] * json[category][type][brand][38]);
								json[category][type][brand][40] = Utilities.roundUp(json[category][type][brand][34] + json[category][type][brand][37]);
								//json[category][type][brand][41] = Utilities.roundUp(((Utilities.roundUp(isFinite(json[category][type][brand][34] / json[category][type][brand][40]) ? json[category][type][brand][34] / json[category][type][brand][40] : 0))) * json[category][type][brand][35]) + (((Utilities.roundUp(isFinite(json[category][type][brand][37] / json[category][type][brand][40]) ? json[category][type][brand][37] / json[category][type][brand][40] : 0))) * json[category][type][brand][38]);
								if (Utilities.numOrZero(json[category][type][brand][25]) > 0) {
									var first = (Utilities.numOrZero(json[category][type][brand][34]) / Utilities.numOrZero(json[category][type][brand][40])) * Utilities.numOrZero(json[category][type][brand][35]);
									var second = (Utilities.numOrZero(json[category][type][brand][37]) / Utilities.numOrZero(json[category][type][brand][40])) * Utilities.numOrZero(json[category][type][brand][38]);
									json[category][type][brand][41] = Utilities.roundUp(first + second);
								} else {
									json[category][type][brand][41] = 0;
								}
								json[category][type][brand][44] = Utilities.roundUp(json[category][type][brand][42] * json[category][type][brand][43]);
								json[category][type][brand][45] = Utilities.roundUp(json[category][type][brand][42] * json[category][type][brand][41]);
								json[category][type][brand][46] = Utilities.roundUp(json[category][type][brand][44] - json[category][type][brand][45]);
								//json[category][type][brand][47] = isFinite(Utilities.roundUp(json[category][type][brand][46] / json[category][type][brand][42])) ? Utilities.roundUp(json[category][type][brand][46] / json[category][type][brand][42]) : 0;
								if (Utilities.numOrZero(json[category][type][brand][42]) > 0) {
									var first = Utilities.numOrZero(json[category][type][brand][46]) / Utilities.numOrZero(json[category][type][brand][42]);
									json[category][type][brand][47] = Utilities.roundUp(first);
								} else {
									json[category][type][brand][47] = 0;
								}
								json[category][type][brand][48] = Utilities.roundUp(json[category][type][brand][40] - json[category][type][brand][42]);
								json[category][type][brand][53] = Utilities.roundUp(json[category][type][brand][51] * json[category][type][brand][52]);
								json[category][type][brand][54] = Utilities.roundUp(json[category][type][brand][53] - json[category][type][brand][50]);
								json[category][type][brand][58] = Utilities.roundUp(json[category][type][brand][56] * json[category][type][brand][57]);
								json[category][type][brand][59] = Utilities.roundUp(json[category][type][brand][58] - json[category][type][brand][55]);
							}
						});
					}
				});
			}
		});
	});

	Object.keys(json).forEach(function(category) {
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						Object.keys(json[category][type][brand]).forEach(function(brandTotals) {
							if (Utilities.numOrZero(brandTotals) > 1) {
								//nlapiLogExecution('DEBUG','ADD',category+' '+type+ ' '+brandTotals);
								json[category][type][brandTotals] += json[category][type][brand][brandTotals];
								json[category][brandTotals] += json[category][type][brand][brandTotals];
							}
						});
					}else {
						json[category][brand] += json[category][type][brand];
					}
				});
			}
		});
	});


	var tr = '';
	Object.keys(json).forEach(function(category) {
		tr += '<tr style="background-color:#e64848" id="' + category.replace(/ /g, "") + '"><td>' + category + '</td>';
		Object.keys(json[category]).forEach(function(categoryTotals) {
			if (Utilities.numOrZero(categoryTotals) > 0) {
				tr += '<td class="right">' + Utilities.addCommas(Utilities.roundUp(json[category][categoryTotals])) + '</td>';
			}
		});
		tr += '</tr>';
		Object.keys(json[category]).forEach(function(type) {
			if (Utilities.numOrZero(type) == 0) {
				tr += '<tr style="background-color:#6f6f6f;display:none;" id="' + type.replace(/ /g, "") + '" class="' + category.replace(/ /g, "") + '"><td>&nbsp;&nbsp;&nbsp;&nbsp;' + type + '</td>';
				//nlapiLogExecution('DEBUG', 'TYPE OF ' + category, type);
				Object.keys(json[category][type]).forEach(function(typeTotals) {
					if (Utilities.numOrZero(typeTotals) > 0) {
						tr += '<td class="right">' + Utilities.addCommas(Utilities.roundUp(json[category][type][typeTotals])) + '</td>';
					}
				});
				tr += '</tr>';
				Object.keys(json[category][type]).forEach(function(brand) {
					if (Utilities.numOrZero(brand) == 0) {
						tr += '<tr style="background-color:##e4e4e4;display:none;" class="' + category.replace(/ /g, "") + ' ' + type.replace(/ /g, "") + '"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + brand + '</td>';

						Object.keys(json[category][type]).forEach(function(brandTotals) {
							if (Utilities.numOrZero(brandTotals) > 0) {
								if(brandTotals == 17){
									if(Utilities.roundUp(json[category][type][brand][brandTotals]) != 0){
										tr += '<td class="red right">' + Utilities.addCommas(Utilities.roundUp(json[category][type][brand][brandTotals])) + '</td>';
									}else{
										tr += '<td class="right">' + Utilities.addCommas(Utilities.roundUp(json[category][type][brand][brandTotals])) + '</td>';
									}
								}else{
									tr += '<td class="right">' + Utilities.addCommas(Utilities.roundUp(json[category][type][brand][brandTotals])) + '</td>';
								}
							}
						});
						tr += '</tr>';
					}
				});
			}
		});
	});

	var html = nlapiLoadFile(28122).getValue();
	html = html.replace('{lines}', tr);
	for (var i = 0; i < 5; i++) {
		var date = month_names[nlapiAddMonths(nlapiStringToDate(params.custpage_dateperiod), i).getMonth() + 1];
		html = html.replace('{' + (i + 1) + '}', date);
	}
	html = html.replace('{subsi}', nlapiLookupField('subsidiary', params.custpage_subsidiary, 'name').split(': ')[1]);
	html = html.replace('{loca}', nlapiLookupField('location', params.custpage_location, 'name'));
	html = html.replace('{dateper}', params.custpage_dateperiod);

	var body = 'Greetings from NetSuite,<br/><br/>Please see attached file.<br/><br/>Thank you for using the Netsuite Import Request Report Generation.<br/><br/>Sincerely,<br/>The NetSuite Staff<br/><br/>***<b>PLEASE DO NOT RESPOND TO THIS MESSAGE</b>***';
	var newAttachment = nlapiCreateFile('import_request_report.htm', 'HTMLDOC', html);
	var newEmail = nlapiSendEmail(nlapiGetContext().user, nlapiGetContext().user, 'Import Request Report', body, null, null, null, newAttachment);
};

function irSchedule(type) {

}

/**
 * Before load processing of suitelet
 * @param  {Object} params [description]
 * @param  {Object} fields [description]
 * @return {Object} UI     [description]
 */
function methodGet(params, fields) {
	var UI = buildInterface(fields);
	return UI;
};

/**
 * Get all values from the UI
 * @return {Object} Values in the UI fields
 */
function getParams(fields, request) {
	/** @type {Object} Initialize params */
	var params = {};

	/** Loop through each field and get the value */
	Object.keys(fields).forEach(function(key) {
		params[key] = request.getParameter(key);
	});

	return params;
};

/**
 * Builds the interface of the Suitelet
 * @param  {[type]} fields [description]
 * @return {[type]}        [description]
 */
function buildInterface(fields) {
	var form = nlapiCreateForm('');
	form.setTitle(FORM_NAME);

	Object.keys(fields).forEach(function(key) {
		fields[key]['formElement'] = form.addField(key, fields[key]['type'], fields[key]['label'], fields[key]['source']);
	});

	return [form, fields];
}

/**
 * Client script field change event
 * @param  {String} type    The sublist name
 * @param  {String} name    The column name or field name
 * @param  {Integer} linenum The current sublist line/row number
 */
function clientFieldChange(type, name, linenum) {
	if (name == 'custpage_subsidiary') {
		var url = nlapiResolveURL('SUITELET', 'customscript_ir_report', 'customdeploy_ir_report');
		FORM_FIELDS.forEach(function(fieldname) {
			url += '&' + fieldname + '=' + nlapiGetFieldValue(fieldname);
		});
		window.open(url, '_self');
	}
}

/**
 * Set default values of fields on page load
 * Filters the list of locations based on Subsidiary selected
 * @param {Object} fields [description]
 * @param {Object} params [description]
 * @return {Object} fields [description]
 */
function setDefaultValues(fields, params) {
	Object.keys(fields).forEach(function(key) {
		if (params[key]) {
			if (key == 'custpage_subsidiary') {
				var filter = [new nlobjSearchFilter('subsidiary', null, 'is', params[key])];
				var column = [new nlobjSearchColumn('name')];
				var search_location = nlapiSearchRecord('location', null, filter, column);
				if (search_location) {
					fields['custpage_location']['formElement'].addSelectOption(184, nlapiLookupField('location', 184, 'name'));
					search_location.forEach(function(result) {
						fields['custpage_location']['formElement'].addSelectOption(result.id, result.getValue('name'));
					});
				}
			}
			fields[key]['formElement'].setDefaultValue(params[key]);
		}
	});
	return fields;
}

function loadSearch(id, filters) {
	var search = nlapiLoadSearch(null, id);
	if (filters) {
		search.addFilters(filters);
	}
	return search;
};

function getResults(search, start, end) {
	var results = [];
	var temp = search;
	if (search) {
		do {
			temp = search.getResults(start, end);
			results = results.concat(temp);
			start += 1000;
			end += 1000;
		}
		while (temp.length == 1000);
	}
	return results;
};

function getAllChildLocation(parent) {
	var selected = nlapiLookupField('location', parent, 'name');
	//console.log(selected);
	var filter = [];
	filter.push(new nlobjSearchFilter('name', null, 'contains', selected));
	var search = nlapiSearchRecord(null, 'customsearch_location_filter', filter);
	var children = [];
	if (search) {
		//console.log(search.length);
		search.forEach(function(result) {
			var count_1 = (selected.match(/:/g) || []).length;
			var count_2 = (result.getValue('name').match(/:/g) || []).length;
			//console.log(count_1 + ' ' + count_2);
			if (count_1 == count_2) {
				//console.log('equal');
				var selected_end = selected.split(' : ');
				selected_end = selected_end[selected_end.length - 1];
				var result_end = result.getValue('name').split(' : ');
				result_end = result_end[result_end.length - 1];
				//console.log(result_end + ' ' + selected_end);
				if (result_end.length == selected_end.length) {
					children.push(result.id);
				}
			} else {
				children.push(result.id);
			}
		});
	} else {
		children.push(parent);
	}

	return children;
};