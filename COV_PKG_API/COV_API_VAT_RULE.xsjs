(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-12-03                                         //
	// Description:REST service to be able to create entries    //
	// in the Rule Table. POST method is allowed                //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service. if a GET is performed, entries are  //
	// read from the table or validation is performed.          //
	// Parameters include:                                      //
	// - method - CREATE/DELETE/UPDATE/VALIDATE                 //
	// - rule - rule editor string for validate function        //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate,
		gvStatus,
		gvReturnId;
	//Variable to carry the conversion errors
	var gvConvError;
	//Variables declaring the table details
	var gvSchemaName = 'COV_SCH_VAT';
	var gvTableName = 'COV_VAT_RULE';
	var gvLogTableName = 'COV_VAT_RULE_LOG';

	//Indicate if Service is to be updated or Deleted
	var gvMethod = $.request.parameters.get('method');
	//Get the Rule String for Validation
	var gvRule = $.request.parameters.get('rule');
	//Get the Rule Id for Read
	var gvId = $.request.parameters.get('id');

	var gvErrorMessage;

	// -------------------------------------------------------- // 
	// Execute Main Function                                    //
	// -------------------------------------------------------- //
	main();

	// -------------------------------------------------------- // 
	// Main function to call methods as required                //
	// -------------------------------------------------------- //
	function main() {
		//Check the Method
		if ($.request.method === $.net.http.POST) {
			if (gvMethod === "DELETE") {
				//Perform Table Entry to be deleted from GL Routing Table
				try {
					_deleteEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table entry deletion:" + errorObj.message;
				}
			} else if (gvMethod === "UPDATE") {
				try {
					_updateEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table update:" + errorObj.message;
				}
			} else if (gvMethod === "CREATE" || gvMethod === "") {
				//Perform Table Entry to be created
				try {
					_createEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table insert:" + errorObj.message;
				}
			}

			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				TableUpdateStatus: gvTableUpdate,
				Status: gvStatus,
				ruleId: gvReturnId
			}));
		} else if ($.request.method === $.net.http.GET) {
			if (gvMethod === "VALIDATE") {
				_validateFunction();
			} else if (gvMethod === "CREATE") {
				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called"
				}));
			} else if (gvMethod === "LOG") {
				//Read Entries from the Table
				try {
					_getLogEntries();
				} catch (errorObj) {
					$.response.status = 200;
					$.response.setBody(JSON.stringify({
						message: "API Called",
						result: gvErrorMessage
					}));
				}
			} else {
				//Read Entries from the Table
				try {
					_getEntries();
				} catch (errorObj) {
					$.response.status = 200;
					$.response.setBody(JSON.stringify({
						message: "API Called",
						result: gvErrorMessage
					}));
				}
			}
		}
	}
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';

			//Check if ID is specified then restrict the selection
			if (gvId) {
				lvQuery = lvQuery + ' WHERE "ID" = ' + "'" + gvId + "'";
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
					ID: oResultSet.getString(1),
					LEVEL: oResultSet.getString(2),
					FUNCTION: oResultSet.getString(3),
					PARAMETER1: oResultSet.getString(4),
					PARAMETER2: oResultSet.getString(5),
					PARAMETER3: oResultSet.getString(6),
					PARAMETER4: oResultSet.getString(7),
					PARAMETER5: oResultSet.getString(8),
					// 	RESULT: oResultSet.getString(9),
					RULE_STRING: oResultSet.getString(9),
					FULL_RULE_STRING: oResultSet.getString(10)
				};
				oResult.records.push(record);
				record = "";
			}

			oResultSet.close();
			oStatement.close();
			oConnection.close();

			//Return the result
			$.response.contentType = "application/json; charset=UTF-8";
			$.response.setBody(JSON.stringify(oResult));
			$.response.status = $.net.http.OK;

		} catch (errorObj) {
			gvErrorMessage = errorObj.message;
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
		}
	}

	// -------------------------------------------------------- // 
	// Function to read entries from the log table 				    //
	// -------------------------------------------------------- //
	function _getLogEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvLogTableName + '"';

			//Check if ID is specified then restrict the selection
			if (gvId) {
				lvQuery = lvQuery + ' WHERE "ID" = ' + "'" + gvId + "'";
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
					MESSAGE_GUID: oResultSet.getString(1),
					ID: oResultSet.getString(2),
					LEVEL: oResultSet.getString(3),
					ITEMNO_ACC: oResultSet.getString(4),
					DATE: oResultSet.getString(5),
					FUNCTION: oResultSet.getString(6),
					PARAMETER1: oResultSet.getString(7),
					PARAMETER2: oResultSet.getString(8),
					PARAMETER3: oResultSet.getString(9),
					PARAMETER4: oResultSet.getString(10),
					PARAMETER5: oResultSet.getString(11),
					RESULT: oResultSet.getString(12)
				};
				oResult.records.push(record);
				record = "";
			}

			oResultSet.close();
			oStatement.close();
			oConnection.close();

			//Return the result
			$.response.contentType = "application/json; charset=UTF-8";
			$.response.setBody(JSON.stringify(oResult));
			$.response.status = $.net.http.OK;

		} catch (errorObj) {
			gvErrorMessage = errorObj.message;
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
		}
	}
	// ----------------------------------------------------------------// 
	// Function to insert entries into the table                       //
	// ----------------------------------------------------------------//
	function _createEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			var lvId = _getNextId();
			var lvLevel = 0;

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

			for (var i = 0; i < oBody.rules.length; i++) {

				//Populate the fields with values from the incoming payload
				//Id
				if (oBody.rules[i].ID) {
					oStatement.setInt(1, parseFloat(oBody.rules[i].ID));
				} else {
					oStatement.setInt(1, parseFloat(lvId));
				}
				//Level
				if (oBody.rules[i].LEVEL) {
					oStatement.setInt(2, parseFloat(oBody.rules[i].LEVEL));
				} else {
					lvLevel = lvLevel + 1;
					oStatement.setInt(2, parseFloat(lvLevel));
				}
				//Function
				oStatement.setString(3, oBody.rules[i].FUNCTION);
				//Parameter 1
				oStatement.setString(4, oBody.rules[i].PARAMETER1);
				//Parameter 2
				oStatement.setString(5, oBody.rules[i].PARAMETER2);
				//Parameter 3
				oStatement.setString(6, oBody.rules[i].PARAMETER3);
				//Parameter 4
				oStatement.setString(7, oBody.rules[i].PARAMETER4);
				//Parameter 5
				oStatement.setString(8, oBody.rules[i].PARAMETER5);
				// //Result
				// oStatement.setString(9, oBody.rules[i].RESULT);
				//Rule String
				oStatement.setString(9, oBody.rules[i].RULE_STRING);
				//Full Rule String
				oStatement.setString(10, oBody.rules[i].FULL_RULE_STRING);

				//Add Batch process to executed on the database
				oStatement.addBatch();

			}
			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully: " + gvTableName + ";";;
			gvStatus = "Success";
			gvReturnId = lvId;
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem inserting entries into the Table: " + gvTableName + ", Error: " + errorObj.message + ";";
			gvStatus = "Error";
		}
	}

	// ----------------------------------------------------------------// 
	// Function to update entry                                        //
	// ----------------------------------------------------------------//
	function _updateEntry() {
		// 		try {
		// 			//Get the Request Body
		// 			var oBody = JSON.parse($.request.body.asString());

		// 			//Get the Database connection
		// 			var oConnection = $.db.getConnection();
		// 			var oStatement;
		// 			//Build the Statement to update the entries
		// 			var oStatement = oConnection.prepareStatement(
		// 				"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
		// 				"\" SET RULE = ? WHERE IN_TABLE = ? AND IN_FIELD = ? AND OUT_TABLE = ? AND OUT_FIELD = ?"
		// 			);

		// 			//Populate the fields with values from the incoming payload
		// 			//Rule
		// 			oStatement.setString(1, oBody.RULE);
		// 			//In Table
		// 			oStatement.setString(2, oBody.IN_TABLE);
		// 			//In Field
		// 			oStatement.setInt(3, oBody.IN_FIELD);
		// 			//Out Table
		// 			oStatement.setInt(4, oBody.OUT_TABLE);
		// 			//Out Field
		// 			oStatement.setInt(5, oBody.OUT_FIELD);

		// 			oStatement.addBatch();

		// 			//Execute the Insert
		// 			oStatement.executeBatch();

		// 			//Close the connection
		// 			oStatement.close();
		// 			oConnection.commit();
		// 			oConnection.close();

		// 			gvTableUpdate = "Table entries updated successfully in Table:" + gvTableName + ";";
		// 			gvStatus = "Success";
		// 		} catch (errorObj) {
		// 			if (oStatement !== null) {
		// 				oStatement.close();
		// 			}
		// 			if (oConnection !== null) {
		// 				oConnection.close();
		// 			}
		// 			gvTableUpdate = "There was a problem updating entries in the Table: " + gvTableName + ", Error: " + errorObj.message + ";";
		// 			gvStatus = "Error";
		// 		}
	}

	// ----------------------------------------------------------------// 
	// Function to delete entry from the table                         //
	// ----------------------------------------------------------------//
	function _deleteEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" WHERE ID = ?");

			//Id
			oStatement.setInt(1, parseFloat(oBody.ID));

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries deleted successfully from Table:" + gvTableName + ";";
			gvStatus = "Success";

		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem deleting entries in the Table: " + gvTableName + ", Error: " + errorObj.message + ";";
			gvStatus = "Error";
		}
	}

	// ----------------------------------------------------------------// 
	// Function to validate a function and it's parameters             //
	// ----------------------------------------------------------------//
	function _validateFunction() {
		//Check if it is Nested Functions
		var lvFunctionCount = gvRule.split("(").length - 1;

		//Global Variables
		var lvFunctionIndex;
		var lvFunction;
		var lvTotalLength;
		var lvReturn;
		var oRules = [];
		var lvRules;

		//Single Function Logic
		if (lvFunctionCount < 2) {
			lvFunctionIndex = gvRule.indexOf("(");
			lvFunction = gvRule.substring(0, lvFunctionIndex);
			lvTotalLength = gvRule.length;

			lvRules = _buildRule(gvRule, lvFunctionIndex, lvTotalLength, lvFunction);

			if (lvRules) {
				lvReturn = "VALID";
				oRules.push(lvRules);
			} else {
				lvReturn = "ERROR";
			}
		}
		//Nested Functions
		else {
			lvFunctionIndex = gvRule.indexOf("(");
			lvFunction = gvRule.substring(0, lvFunctionIndex);
			lvTotalLength = gvRule.length;

			var oNestedFunctions = _buildFunctionlist(lvTotalLength, lvFunction);

			for (var i = 0; i < oNestedFunctions.length; i++) {
				lvFunctionIndex = oNestedFunctions[i].indexOf("(");
				lvFunction = oNestedFunctions[i].substring(0, lvFunctionIndex);
				lvTotalLength = oNestedFunctions[i].length;

				lvRules = _buildRule(oNestedFunctions[i], lvFunctionIndex, lvTotalLength, lvFunction);

				if (lvRules) {
					lvReturn = "VALID";
					oRules.push(lvRules);
				} else {
					lvReturn = "ERROR";
				}
			}

		}

		$.response.status = 200;
		$.response.setBody(JSON.stringify({
			status: lvReturn,
			message: gvErrorMessage,
			rules: oRules
		}));
	}

	// ----------------------------------------------------------------// 
	// Function to build the Rule                                      //
	// ----------------------------------------------------------------//
	function _buildRule(pRule, pFunctionIndex, pTotalLength, pFunction) {
		//Variables for Single Function
		var lvRule;

		var lvReturn;
		var lvParameterStartIndex = pFunctionIndex + 1;
		var lvParameterEndIndex = pTotalLength - 1;
		var oParameters = pRule.substring(lvParameterStartIndex, lvParameterEndIndex).split(",");

		//Validate Selected Function and build Payload for Creation
		switch (pFunction) {
			case "LEFT":
				if (oParameters.length < 1 || oParameters.length > 2 || oParameters.length != 2) {
					gvErrorMessage = "LEFT Function can only hold 2 parameters";
					lvReturn = "ERROR";
				} else {
					lvReturn = "VALID";

					lvRule = {
						ID: "",
						LEVEL: "",
						FUNCTION: pFunction,
						PARAMETER1: oParameters[0],
						PARAMETER2: oParameters[1],
						RULE_STRING: pRule,
						FULL_RULE_STRING: gvRule
					};

				}
				break;
			case "RIGHT":
				if (oParameters.length < 1 || oParameters.length > 2 || oParameters.length != 2) {
					gvErrorMessage = "RIGHT Function can only hold 2 parameters";
					lvReturn = "ERROR";
				} else {
					lvReturn = "VALID";

					lvRule = {
						ID: "",
						LEVEL: "",
						FUNCTION: pFunction,
						PARAMETER1: oParameters[0],
						PARAMETER2: oParameters[1],
						RULE_STRING: pRule,
						FULL_RULE_STRING: gvRule
					};

				}
				break;
			case "MID":
				if (oParameters.length < 1 || oParameters.length > 3 || oParameters.length != 3) {
					gvErrorMessage = "MID Function can only hold 3 parameters";
					lvReturn = "ERROR";
				} else {
					lvReturn = "VALID";

					lvRule = {
						ID: "",
						LEVEL: "",
						FUNCTION: pFunction,
						PARAMETER1: oParameters[0],
						PARAMETER2: oParameters[1],
						PARAMETER3: oParameters[2],
						RULE_STRING: gvRule,
						FULL_RULE_STRING: gvRule
					};

				}
				break;
			case "CONCATENATE":
				if (oParameters.length < 1 || oParameters.length > 5) {
					gvErrorMessage = "CONCATENATE Function can only hold 5 parameters";
					lvReturn = "ERROR";
				} else {
					lvReturn = "VALID";

					lvRule = {
						ID: "",
						LEVEL: "",
						FUNCTION: pFunction,
						PARAMETER1: oParameters[0],
						PARAMETER2: oParameters[1],
						PARAMETER3: oParameters[2],
						PARAMETER4: oParameters[3],
						PARAMETER5: oParameters[4],
						RULE_STRING: pRule,
						FULL_RULE_STRING: gvRule
					};

				}
				break;
			case "LOOKUP":
				if (oParameters.length < 1 || oParameters.length > 2 || oParameters.length != 2) {
					gvErrorMessage = "Lookup Function can only hold 2 parameters";
					lvReturn = "ERROR";
				} else {
					lvReturn = "VALID";

					lvRule = {
						ID: "",
						LEVEL: "",
						FUNCTION: pFunction,
						PARAMETER1: oParameters[0],
						PARAMETER2: oParameters[1],
						RULE_STRING: pRule,
						FULL_RULE_STRING: gvRule
					};

				}
				break;
			case "IF":
				if (oParameters.length < 1 || oParameters.length > 3 || oParameters.length != 3) {
					gvErrorMessage = "IF Function can only hold 3 parameters";
					lvReturn = "ERROR";
				} else {
					lvReturn = "VALID";

					lvRule = {
						ID: "",
						LEVEL: "",
						FUNCTION: pFunction,
						PARAMETER1: oParameters[0],
						PARAMETER2: oParameters[1],
						PARAMETER3: oParameters[2],
						RULE_STRING: gvRule,
						FULL_RULE_STRING: gvRule
					};

				}
				break;
		}

		if (lvReturn === "ERROR") {
			lvRule = "";
		}

		return lvRule;
	}

	// ----------------------------------------------------------------// 
	// Function to read the next available sequence number              //
	// ----------------------------------------------------------------//
	function _buildFunctionlist(pTotalLength, pFunction) {
		//Variables for Nested Functions
		var oNestedFunctions = [],
			lvNestedFunction = {},
			lvNestedFunctionStart,
			lvRemainingString,
			lvRemainingStringLength,
			lvNestedFunctionEnd;

		//Get all the Indexes of a specific character for Function Start
		var oStartIndices = [];
		for (var i = 0; i < gvRule.length; i++) {
			if (gvRule[i] === "(") {
				var lvIndex = i + 1;
				oStartIndices.push(lvIndex);
			}
		}

		//Get the Number of Functions used as parameters
		var lvLoopLength = oStartIndices.length - 1;

		//Determine Start Values
		lvNestedFunctionStart = gvRule.indexOf("(") + 1;
		lvRemainingString = gvRule.substring(lvNestedFunctionStart, pTotalLength);
		lvRemainingStringLength = lvRemainingString.length;
		lvNestedFunctionEnd = lvRemainingString.indexOf(")") + 1;

		//Algorithm to split out Nested Functions into Array
		for (var l = 0; l < lvLoopLength; l++) {
			lvNestedFunction = lvRemainingString.substring(0, lvNestedFunctionEnd);
			oNestedFunctions.push(lvNestedFunction);
			lvNestedFunctionEnd += 1;
			lvRemainingString = lvRemainingString.substring(lvNestedFunctionEnd, lvRemainingStringLength);
			lvNestedFunctionEnd = lvRemainingString.indexOf(")") + 1;
			lvRemainingStringLength = lvRemainingString.length;
		}

		//Add Outside function to reference results from Nested Functions
		lvNestedFunction = pFunction + "(";
		var lvLevel = 1;
		for (var m = 0; m < lvLoopLength; m++) {
			lvNestedFunction += "LEVEL." + lvLevel;

			if (m !== lvLoopLength - 1) {
				lvNestedFunction += ",";
			} else if (m === lvLoopLength - 1) {
				lvNestedFunction += ")";
			}

			lvLevel += 1;
		}

		oNestedFunctions.push(lvNestedFunction);

		return oNestedFunctions;
	}
	// ----------------------------------------------------------------// 
	// Function to read the next available sequence number              //
	// ----------------------------------------------------------------//
	function _getNextId() {
		var lvId;
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the value
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"ID\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvId = rs.getString(1);
			lvId = parseInt(lvId);
		}
		if (lvId) {
			lvId = lvId + 1;
		} else {
			lvId = parseInt(1);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		return lvId;
	}
	// ----------------------------------------------------------------// 
	// END OF PROGRAM                                                  //
	// ----------------------------------------------------------------//

})();