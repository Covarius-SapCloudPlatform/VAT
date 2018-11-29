(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description:REST service to be able to create entries    //
	// in the Move Step Table. POST method is allowed          //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service. if a GET is performed, entries are  //
	// read from the table. Parameters include:                 //
	// - method - CREATE/DELETE/UPDATE                          //
	// - id - id of step information to be read                 //
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
	var gvTableName = 'COV_VAT_MOVE_STEP';

	//ID Number
	var gvId;
	var gvStepId;

	//Indicate if Service is to be updated or Deleted
	var gvMethod = $.request.parameters.get('method');
	var gvRefId = $.request.parameters.get('id');
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
				//Perform Table Entry to be deleted from Table
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
				StepId: gvStepId
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

			//Check if ID is specified then restrict the selection
			if (gvRefId) {
				lvQuery = lvQuery + ' WHERE "STEP_ID" = ' + "'" + gvRefId + "'";
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
					STEP_ID: oResultSet.getString(1),
					SOURCE_FIELD: oResultSet.getString(2),
					STRUCTURE: oResultSet.getString(3),
					FIELD: oResultSet.getString(4),
					TARGET_FIELD: oResultSet.getString(5),
					CONSTANT: oResultSet.getString(6),
					CONSTANT_VALUE: oResultSet.getString(7),
					ENTIRE_FIELD: oResultSet.getString(8),
					PART_FIELD: oResultSet.getString(9),
					FROM_CHARACTER: oResultSet.getString(10),
					NUMBER_OF_CHARACTERS: oResultSet.getString(11),
					CONDITION_ID: oResultSet.getString(12)
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

			//Get the Latest ID Number
			var lvId;
			if (!oBody.STEP_ID) {
				lvId = _getNextId();
			} else {
				lvId = oBody.STEP_ID;
			}

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//Id
			oStatement.setInt(1, parseFloat(lvId));
			//Source Field
			if (oBody.SOURCE_FIELD) {
				oStatement.setString(2, oBody.SOURCE_FIELD.toString());
			} else {
				oStatement.setInt(2, 0);
			}
			//Structure
			oStatement.setString(3, oBody.STRUCTURE);
			//Field
			oStatement.setString(4, oBody.FIELD);
			//Target Field
			oStatement.setString(5, oBody.TARGET_FIELD);
			//Constant
			if (oBody.CONSTANT) {
				oStatement.setString(6, oBody.CONSTANT.toString());
			} else {
				oStatement.setInt(6, 0);
			}
			//Constant Value
			oStatement.setString(7, oBody.CONSTANT_VALUE);
			//Entire Field Flag
			if (oBody.ENTIRE_FIELD) {
				oStatement.setString(8, oBody.ENTIRE_FIELD.toString());
			} else {
				oStatement.setInt(8, 0);
			}
			//Part Field Flag
			if (oBody.PART_FIELD) {
				oStatement.setString(9, oBody.PART_FIELD.toString());
			} else {
				oStatement.setInt(9, 0);
			}
			//From Character
			if (oBody.FROM_CHARACTER) {
				oStatement.setInt(10, parseFloat(oBody.FROM_CHARACTER));
			} else {
				oStatement.setInt(10, 0);
			}
			//Number of Characters
			if (oBody.NUMBER_OF_CHARACTERS) {
				oStatement.setInt(11, parseFloat(oBody.NUMBER_OF_CHARACTERS));
			} else {
				oStatement.setInt(11, 0);
			}
			//Condition Id
			if (oBody.CONDITION_ID) {
				oStatement.setInt(12, parseFloat(oBody.CONDITION_ID));
			} else {
				oStatement.setInt(12, 0);
			}
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
			gvStepId = lvId;
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
	function _getNextId() {
		var lvId;
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		//Prepare the SQL Statement to read the value
		var pstmtSrcKeys = conn.prepareStatement(
			"SELECT MAX(\"STEP_ID\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
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
	// Function to update entry                                        //
	// ----------------------------------------------------------------//
	function _updateEntry() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();
			var oStatement;

			//Build the Statement to update the entries
			var oStatement = oConnection.prepareStatement(
				"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" SET SOURCE_FIELD = ?, STRUCTURE = ?, FIELD = ?, TARGET_FIELD = ?, CONSTANT = ?, CONSTANT_VALUE = ?, ENTIRE_FIELD = ?, PART_FIELD = ?, FROM_CHARACTER = ?, NUMBER_OF_CHARACTERS = ?, CONDITION_ID = ? WHERE STEP_ID = ?"
			);

			//Populate the fields with values from the incoming payload
			//Source Field
			if (oBody.SOURCE_FIELD) {
				oStatement.setString(1, oBody.SOURCE_FIELD.toString());
			} else {
				oStatement.setInt(1, 0);
			}
			//Structure
			oStatement.setString(2, oBody.STRUCTURE);
			//Field
			oStatement.setString(3, oBody.FIELD);
			//Target Field
			oStatement.setString(4, oBody.TARGET_FIELD);
			//Constant
			if (oBody.CONSTANT) {
				oStatement.setString(5, oBody.CONSTANT.toString());
			} else {
				oStatement.setInt(5, 0);
			}
			//Constant Value
			oStatement.setString(6, oBody.CONSTANT_VALUE);
			//Entire Field Flag
			if (oBody.ENTIRE_FIELD) {
				oStatement.setString(7, oBody.ENTIRE_FIELD.toString());
			} else {
				oStatement.setInt(7, 0);
			}
			//Part Field Flag
			if (oBody.PART_FIELD) {
				oStatement.setString(8, oBody.PART_FIELD.toString());
			} else {
				oStatement.setInt(8, 0);
			}
			//From Character
			if (oBody.FROM_CHARACTER) {
				oStatement.setInt(9, parseFloat(oBody.FROM_CHARACTER));
			} else {
				oStatement.setInt(9, 0);
			}
			//Number of Characters
			if (oBody.NUMBER_OF_CHARACTERS) {
				oStatement.setInt(10, parseFloat(oBody.NUMBER_OF_CHARACTERS));
			} else {
				oStatement.setInt(10, 0);
			}
			//Condition Id
			if (oBody.CONDITION_ID) {
				oStatement.setInt(11, parseFloat(oBody.CONDITION_ID));
			} else {
				oStatement.setInt(11, 0);
			}

			//Step Id
			oStatement.setInt(12, parseFloat(oBody.STEP_ID));

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
				"\" WHERE STEP_ID = ?");

			//Step Sequence
			oStatement.setInt(1, parseInt(oBody.STEP_ID));

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