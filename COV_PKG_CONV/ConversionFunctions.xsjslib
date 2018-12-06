// -------------------------------------------------------- // 
// Description                                              //
// -------------------------------------------------------- //
// Author: Jacques Otto                                     //
// Company: Covarius                                        //
// Date: 2018-12-05                                         //
// Description:Conversion Functions that are used during    //
// VAT mapping from incoming to outgoing payloads.          //
//----------------------------------------------------------//

// -------------------------------------------------------- // 
// LEFT Function-Returns the Left Number of Characters      //
// from a String                                            //
// -------------------------------------------------------- //    
function VAT_LEFT(pValue, pCharacters) {
	var lvResult = pValue.substring(0, pCharacters);
	return lvResult;
}

// -------------------------------------------------------- // 
// Right Function-Returns the Right Number of Characters    //
// from a String                                            //
// -------------------------------------------------------- //    
function VAT_RIGHT(pValue, pCharacters) {
	var lvResult = pValue.slice(pValue.length - pCharacters, pValue.length);
	return lvResult;
}

// -------------------------------------------------------- // 
// Mid Function-Returns the Number of Characters from the   //
// provided Start Position in a String                      //
// -------------------------------------------------------- //    
function VAT_MID(pValue, pStartPost, pCharacters) {
	var lvResult = pValue.substring(pStartPost, pCharacters);
	return lvResult;
}

// -------------------------------------------------------- // 
// Concatenate Function-Returns the Incoming Strings        //
// added together                                           //
// -------------------------------------------------------- //    
function VAT_CONCATENATE(pString1, pString2, pString3, pString4, pString5) {
	var lvResult;

	if (pString1) {
		lvResult = pString1;
	}

	if (pString2) {
		lvResult = lvResult + pString2;
	}

	if (pString3) {
		lvResult = lvResult + pString3;
	}

	if (pString4) {
		lvResult = lvResult + pString4;
	}

	if (pString5) {
		lvResult = lvResult + pString5;
	}

	return lvResult;
}

// ----------------------------------------------------------// 
// Lookup Function-Returns the second column in lookup table //
// using the first column as the lookup value                //
// ----------------------------------------------------------//    
function VAT_LOOKUP(pValue, pTable) {
	var lvLookupSchema = 'COV_SCH_LOOKUP',
		lvResult;
	try {
		//Variable to keep query statement 
		var lvQuery = 'SELECT * FROM "' + lvLookupSchema + '"."' + pTable + '"';

		//Check if ID is specified then restrict the selection
		if (pValue) {
			lvQuery = lvQuery + ' WHERE "KEY" = ' + "'" + pValue + "'";
		}

		//Connect to the Database and execute the query
		var oConnection = $.db.getConnection();
		var oStatement = oConnection.prepareStatement(lvQuery);
		oStatement.execute();
		var oResultSet = oStatement.getResultSet();
		var oResult = {
			records: []
		};
		while (oResultSet.next()) {

			var record = {
				KEY: oResultSet.getString(1),
				RESULT: oResultSet.getString(2)
			};
			oResult.records.push(record);
			lvResult = record.RESULT;
			record = "";
		}

		oResultSet.close();
		oStatement.close();
		oConnection.close();

	} catch (errorObj) {
		if (oStatement !== null) {
			oStatement.close();
		}
		if (oConnection !== null) {
			oConnection.close();
		}
	}

	return lvResult;
}