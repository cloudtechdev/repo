function suitelet(request, response) {
	FORM.request = request;
	FORM.response = response;
	FORM.method = request.getMethod();
	FORM.schedule = 'customscript451';
	FORM.scriptId = '451';
	var params = [
		// field_id, field_type, field_value, field_label
		['custpage_startdate', 'date', null, 'Start Date'],
		['custpage_ardays', 'integer', null, 'AR Days Level'],
		['custpage_bankbal', 'currency', null, 'Bank Balance'],
		['custpage_idealbal', 'currency', null, 'Ideal Balance'],
		['custpage_submit', 'submit', null, 'Generate']
	];
	var form = '';
	var fields = '';
	if (FORM.method == 'GET') {
		FORM.title = 'Cashflow Projection';
		fields = createFieldObject(params);
		fields = createForm(fields);
		form = fields['form'];
	} else if (FORM.method == 'POST') {
		FORM.title = 'An email will be sent to you containing the report once the generation is complete. <br/>You can check the generation status here: <a href="https://system.na2.netsuite.com/app/common/scripting/scriptstatus.nl?daterange=TODAY&scripttype=' + FORM.scriptId + '&date=TODAY">click here</a>';
		fields = createFieldObject(params);
		fields = createForm(fields);
		params = setParams(fields);
		var status = nlapiScheduleScript(FORM.schedule, null, params);
		fields = [];
		fields = createForm(fields);
		form = fields['form'];
	}
	response.writePage(form);
}

function schedule(type) {
	var context = nlapiGetContext();
	var params = [
		// field_id, field_type, field_value, field_label
		['custpage_startdate', 'date', null, 'Start Date'],
		['custpage_ardays', 'integer', null, 'AR Days Level'],
		['custpage_bankbal', 'currency', null, 'Bank Balance'],
		['custpage_idealbal', 'currency', null, 'Ideal Balance'],
		['custpage_submit', 'submit', null, 'Generate']
	];

	params = getSettings('script', context, params);
	nlapiLogExecution('DEBUG', 'PARAMS', JSON.stringify(params));
	var searches = {};
	searches['customsearch_cash_vendordetails'] = loadSearch('customsearch_cash_vendordetails', null, 0, 1000);
	var creditLine = 0;
	var currentBalance = 0;
	var availableLine = 0;
	searches['customsearch_cash_vendordetails'].forEach(function(result) {
		creditLine += Utilities.numOrZero(result.getValue('creditlimit'));
		currentBalance += Utilities.numOrZero(result.getValue('fxbalance'));
	});
	availableLine = Utilities.roundUp(creditLine - currentBalance);

	var credit = {
		'creditline': creditLine,
		'currentbalance': currentBalance,
		'availableline': availableLine,
	};

	nlapiLogExecution('DEBUG', 'CREDIT', JSON.stringify(credit));
	var schedule = {
		'1': {
			'1': {},
			'2': {},
			'3': {},
			'4': {},
		},
		'2': {
			'1': {},
		},
		'3': {
			'1': {},
			'2': {},
			'3': {},
			'4': {},
		},
		'4': {
			'1': {},
			'2': {},
			'3': {},
			'4': {},
			'5': {},
		},
	}
}