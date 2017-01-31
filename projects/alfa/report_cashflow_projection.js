function suitelet(request,response){
	FORM.request = request;
	FORM.response = response;
	FORM.title = 'Cashflow Projection';
	FORM.method = request.getMethod();
	var form = '';
	var params = [
		// field_id, field_type, field_value, field_label
		['custpage_startdate','date',null,'Start Date'],
		['custpage_ardays','integer',null,'AR Days Level'],
		['custpage_bankbal','currency',null,'Bank Balance'],
		['custpage_idealbal','currency',null,'Ideal Balance'],
		['custpage_submit','submit',null,'Generate']
	];

	if(FORM.method == 'GET'){
		var fields = createFieldObject(params);
		fields = createForm(fields);
		form = fields['form'];
	}else if(FORM.method == 'POST'){

	}
	response.writePage(form);
}