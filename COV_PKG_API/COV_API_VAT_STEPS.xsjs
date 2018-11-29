(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description:REST service to be able to create entries    //
	// in the Derivation Steps Table. POST method is allowed    //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service. if a GET is performed, entries are  //
	// read from the table. Parameters include:                 //
	// - method - CREATE/DELETE/UPDATE                          //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate,
		gvStatus;
	//Variable to carry the conversion errors
	var gvConvError;
	//Variables declaring the table details
	var gvSchemaName = 'COV_SCH_VAT';
	var gvTableName = 'COV_VAT_STEPS';

	//Sequence Number
	var gvId;
	var gvStepId;

	//Indicate if Service is to be updated or Deleted
	var gvMethod = $.request.parameters.get('method');
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
			} else if (gvMethod === "UPMOVE") {
				try {
					_moveEntryUp();
				} catch (errorObj) {
					gvTableUpdate = "Error during moving entry up:" + errorObj.message;
				}
			} else if (gvMethod === "DOWNMOVE") {
				try {
					_moveEntryDown();
				} catch (errorObj) {
					gvTableUpdate = "Error during moving entry up:" + errorObj.message;
				}
			} else {
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
				Sequence: gvStepId
			}));

		} else if ($.request.method === $.net.http.GET) {
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
	// -------------------------------------------------------- // 
	// Function to read entries from the table 				    //
	// -------------------------------------------------------- //
	function _getEntries() {
		try {
			//Variable to keep query statement 
			var lvQuery = 'SELECT * FROM "' + gvSchemaName + '"."' + gvTableName + '"';
			lvQuery = lvQuery + 'ORDER BY "EXECUTION_ORDER"';

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
					STEP_SEQ: oResultSet.getString(1),
					STEP_TYPE: oResultSet.getString(2),
					STEP_NAME: oResultSet.getString(3),
					CONDITION: oResultSet.getString(4),
					DESCRIPTION: oResultSet.getString(5),
					REF_STEP_ID: oResultSet.getString(6),
					EXECUTION_ORDER: oResultSet.getString(7)
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

			//Get the Latest Sequence Number
			var lvSequence;
			if (!oBody.STEP_SEQ) {
				lvSequence = _getNextSequence();
			} else {
				lvSequence = oBody.STEP_SEQ;
			}

			//Get the latest execution order number
			var lvOrder;
			if (!oBody.EXECUTION_ORDER) {
				lvOrder = _getNextOrder();
			} else {
				lvOrder = oBody.EXECUTION_ORDER;
			}

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//Sequence
			oStatement.setInt(1, parseFloat(lvSequence));
			//Step Type
			oStatement.setString(2, oBody.STEP_TYPE);
			//Step Name
			oStatement.setString(3, oBody.STEP_NAME);
			//Condition
			if (oBody.CONDITION) {
				oStatement.setString(4, oBody.CONDITION.toString());
			} else {
				oStatement.setInt(4, 0);
			}
			//Description
			oStatement.setString(5, oBody.DESCRIPTION);
			//Reference Step ID
			if (oBody.REF_STEP_ID) {
				oStatement.setInt(6, parseFloat(oBody.REF_STEP_ID));
			} else {
				oStatement.setInt(6, 0);
			}
			//Execution Order
			oStatement.setInt(7, parseFloat(lvOrder));

			//Add Batch process to executed on the database
			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries created successfully: " + gvTableName + ";";;
			gvStatus = "Success";
			gvStepId = lvSequence;

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
	// Function to read the next available sequence number              //
	// ----------------------------------------------------------------//
	function _getNextSequence() {
		var lvSequence;
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the value
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"STEP_SEQ\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvSequence = rs.getString(1);
			lvSequence = parseInt(lvSequence);
		}
		if (lvSequence) {
			lvSequence = lvSequence + 1;
		} else {
			lvSequence = parseInt(1);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		return lvSequence;
	}

	// ----------------------------------------------------------------// 
	// Function to read the next available order number                //
	// ----------------------------------------------------------------//
	function _getNextOrder() {
		var lvOrder;
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the value
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"EXECUTION_ORDER\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
		);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvOrder = rs.getString(1);
			lvOrder = parseInt(lvOrder);
		}
		if (lvOrder) {
			lvOrder = lvOrder + 1;
		} else {
			lvOrder = parseInt(1);
		}

		//Close the DB Connection
		pstmtSrcKeys.close();
		conn.close();

		return lvOrder;
	}

	// ----------------------------------------------------------------// 
	// Function to update entry                                        //
	// ----------------------------------------------------------------//
	function _updateEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();
			var oStatement;
			var lvQuery = 'UPDATE "COV_SCH_VAT"."COV_VAT_STEPS" SET "REF_STEP_ID" = ?, "CONDITION" = ? where "STEP_SEQ" = ?';
			//Build the Statement to update the entries
			var oStatement = oConnection.prepareStatement(lvQuery);

			//Populate the fields with values from the incoming payload
			//Reference Step ID
			oStatement.setInt(1, parseFloat(oBody.REF_STEP_ID));
			//Condition
			if (oBody.CONDITION) {
				oStatement.setString(2, oBody.CONDITION.toString());
			} else {
				oStatement.setInt(2, 0);
			}
			//Step Sequence
			oStatement.setInt(3, parseFloat(oBody.STEP_SEQ));

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();

			gvTableUpdate = "Table entries updated successfully in Table:" + gvTableName + ";";
			gvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			gvTableUpdate = "There was a problem updating entries in the Table: " + gvTableName + ", Error: " + errorObj.message + ";";
			gvStatus = "Error";
		}
	}

	// ----------------------------------------------------------------// 
	// Function to move entry execution order up by one                //
	// ----------------------------------------------------------------//
	function _moveEntryUp() {

		//Get the Request Body
		var oBody = JSON.parse($.request.body.asString());

		//Get the Execution Order that is to be moved up
		var lvMoveUp = parseFloat(oBody.EXECUTION_ORDER);
		var lvOneAbove = lvMoveUp - 1;

		//Get the Step Sequence of the One to be moved down
		var lvOneAboveSeq = _getStepSequence(lvOneAbove);
		//Move One Above down
		var lvSuccess = _changeExecutionOrder(lvOneAboveSeq, lvMoveUp);

		if (lvSuccess === "Success") {
			_changeExecutionOrder(oBody.STEP_SEQ, lvOneAbove);
			if (lvSuccess === "Success") {
				gvStatus = "Success";
			} else {
				gvStatus = "Error";
			}
		} else {
			gvStatus = "Error";
		}
	}

	// ----------------------------------------------------------------// 
	// Function to move entry execution order down by one              //
	// ----------------------------------------------------------------//
	function _moveEntryDown() {

		//Get the Request Body
		var oBody = JSON.parse($.request.body.asString());

		//Get the Execution Order that is to be moved down
		var lvMoveDown = parseFloat(oBody.EXECUTION_ORDER);
		var lvOneBelow = lvMoveDown + 1;

		//Get the Step Sequence of the One to be moved down
		var lvOneBelowSeq = _getStepSequence(lvOneBelow);
		//Move One Below Up
		var lvSuccess = _changeExecutionOrder(lvOneBelowSeq, lvMoveDown);

		if (lvSuccess === "Success") {
			_changeExecutionOrder(oBody.STEP_SEQ, lvOneBelow);
			if (lvSuccess === "Success") {
				gvStatus = "Success";
			} else {
				gvStatus = "Error";
			}
		} else {
			gvStatus = "Error";
		}
	}
	// ----------------------------------------------------------------// 
	// Get the Step Sequence Number of a specific execution order entry//
	// ----------------------------------------------------------------//
	function _getStepSequence(pExecutionOrder) {
		var lvStepSequence;
		//Variable to keep query statement 
		var lvQuery = 'SELECT "STEP_SEQ" FROM "' + gvSchemaName + '"."' + gvTableName + '"';
		lvQuery = lvQuery + ' WHERE "EXECUTION_ORDER" = ' + "'" + pExecutionOrder + "'";

		//Connect to the Database and execute the query
		var oConnection = $.db.getConnection();
		var oStatement = oConnection.prepareStatement(lvQuery);
		oStatement.execute();
		var oResultSet = oStatement.getResultSet();

		while (oResultSet.next()) {
			lvStepSequence = oResultSet.getString(1);
		};

		return lvStepSequence;
	}
	// ----------------------------------------------------------------// 
	// Function to update the execution order of specific step         //
	// ----------------------------------------------------------------//
	function _changeExecutionOrder(pStepSeq, pExecutionOrder) {
		var lvStatus;

		try {
			//Get the Database connection
			var oConnection = $.db.getConnection();
			var oStatement;
			var lvQuery = 'UPDATE "COV_SCH_VAT"."COV_VAT_STEPS" SET "EXECUTION_ORDER" = ? WHERE "STEP_SEQ" = ?';

			//Build the Statement to update the entries
			var oStatement = oConnection.prepareStatement(lvQuery);

			//Populate the fields with values from the incoming parameters
			//Execution Order
			oStatement.setInt(1, parseFloat(pExecutionOrder));

			//Step Sequence
			oStatement.setInt(2, parseFloat(pStepSeq));

			oStatement.addBatch();

			//Execute the Insert
			oStatement.executeBatch();

			//Close the connection
			oStatement.close();
			oConnection.commit();
			oConnection.close();
			lvStatus = "Success";
		} catch (errorObj) {
			if (oStatement !== null) {
				oStatement.close();
			}
			if (oConnection !== null) {
				oConnection.close();
			}
			lvStatus = "Error";
		}

		return lvStatus;
	}
	// ----------------------------------------------------------------// 
	// Function to delete entry from the table for routing address     //
	// ----------------------------------------------------------------//
	function _deleteEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" WHERE STEP_SEQ = ?");

			//Step Sequence
			oStatement.setInt(1, parseInt(oBody.STEP_SEQ));

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
	// END OF PROGRAM                                                  //
	// ----------------------------------------------------------------//

})();