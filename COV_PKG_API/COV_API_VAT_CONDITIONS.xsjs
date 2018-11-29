(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description:REST service to be able to create entries    //
	// in the Conditions Table. POST method is allowed          //
	// you would need to get the x-csrf-token before doing the  //
	// POST to the service. if a GET is performed, entries are  //
	// read from the table. Parameters include:                 //
	// - method - CREATE/DELETE/UPDATE/ADD/DELETE_CONDITION     //
	// - id - id of condition entries to be read                //
	//----------------------------------------------------------//

	// -------------------------------------------------------- // 
	// Global Variables                                         //
	// -------------------------------------------------------- //
	//Variable to carry the table update status
	var gvTableUpdate,
		gvStatus,
		gvConditionId;
	//Variable to carry the conversion errors
	var gvConvError;
	//Variables declaring the table details
	var gvSchemaName = 'COV_SCH_VAT';
	var gvTableName = 'COV_VAT_CONDITIONS';

	//ID Number
	var gvId;

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
			} else if (gvMethod === "CREATE") {
				//Perform Table Entry to be created
				try {
					_createEntry();
				} catch (errorObj) {
					gvTableUpdate = "Error during table insert:" + errorObj.message;
				}
			} else if (gvMethod === "ADD") {
				//Perform Table Entry to be created
				try {
					_addEntries();
				} catch (errorObj) {
					gvTableUpdate = "Error during table insert:" + errorObj.message;
				}
			} else if (gvMethod === "DELETE_CONDITION") {
				//Perform Table Entries to be deleted Table
				try {
					_deleteAll();
				} catch (errorObj) {
					gvTableUpdate = "Error during table entry deletion:" + errorObj.message;
				}
			}

			$.response.status = 200;
			$.response.setBody(JSON.stringify({
				message: "API Called",
				TableUpdateStatus: gvTableUpdate,
				Status: gvStatus,
				CONDITION_ID: gvConditionId
			}));

		} else if ($.request.method === $.net.http.GET) {
			//Read Entries from the Table
			try {
				_getEntries();
			} catch (errorObj) {
				$.response.status = 200;
				$.response.setBody(JSON.stringify({
					message: "API Called",
					result: gvErrorMessage,
					Status: gvStatus
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
				lvQuery = lvQuery + ' WHERE "CONDITION_ID" = ' + "'" + gvRefId + "'";
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
					CONDITION_ID: oResultSet.getString(1),
					ITEM: oResultSet.getString(2),
					STRUCTURE: oResultSet.getString(3),
					FIELD: oResultSet.getString(4),
					OPERATOR: oResultSet.getString(5),
					VALUE: oResultSet.getString(6)
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
			if (!oBody.CONDITION_ID) {
				lvId = _getNextId();
			} else {
				lvId = oBody.CONDITION_ID;
			}

			//Item Number
			var lvItem = 0;

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?)');

			//Loop through the items to be added to the database
			for (var i = 0; i < oBody.ITEMS.length; i++) {
				//Populate the fields with values from the incoming payload
				//Id
				oStatement.setInt(1, parseFloat(lvId));
				//Item
				lvItem = lvItem + 1;
				oStatement.setInt(2, lvItem);
				//Structure
				oStatement.setString(3, oBody.ITEMS[i].STRUCTURE);
				//Field
				oStatement.setString(4, oBody.ITEMS[i].FIELD);
				//Operator
				oStatement.setString(5, oBody.ITEMS[i].OPERATOR);
				//Value
				oStatement.setString(6, oBody.ITEMS[i].VALUE);
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
			gvConditionId = lvId;
			gvStatus = "Success";
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
			"SELECT MAX(\"CONDITION_ID\") FROM \"" + gvSchemaName + "\".\"" + gvTableName + "\""
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
	// Function to add entries into the table for existing condition   //
	// ----------------------------------------------------------------//
	function _addEntries() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Next Item Number available
			var lvItem;
			lvItem = _getNextItem(oBody.CONDITION_ID);

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?)');

			//Loop through the items to be added to the database
			for (var i = 0; i < oBody.ITEMS.length; i++) {
				//Populate the fields with values from the incoming payload
				//Id
				oStatement.setInt(1, parseFloat(oBody.CONDITION_ID));
				//Item
				lvItem = lvItem + 1;
				oStatement.setInt(2, lvItem);
				//Structure
				oStatement.setString(3, oBody.ITEMS[i].STRUCTURE);
				//Field
				oStatement.setString(4, oBody.ITEMS[i].FIELD);
				//Operator
				oStatement.setString(5, oBody.ITEMS[i].OPERATOR);
				//Value
				oStatement.setString(6, oBody.ITEMS[i].VALUE);
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
	// Function to read the next available sequence number for Item    //
	// ----------------------------------------------------------------//
	function _getNextItem(pConditionId) {
		var lvId;
		//Get the Connection to the Database
		var conn = $.db.getConnection();

		var lvQuery = 'SELECT MAX("ITEM") FROM "' + gvSchemaName + '"."' + gvTableName + '"';
		lvQuery = lvQuery + 'WHERE "CONDITION_ID" = ' + pConditionId;

		//Prepare the SQL Statement to read the value
		var pstmtSrcKeys = conn.prepareStatement(lvQuery);

		//Execute the Query
		var rs = pstmtSrcKeys.executeQuery();

		//Map and Save the results
		while (rs.next()) {
			lvId = rs.getString(1);
			lvId = parseInt(lvId);
		}
		if (lvId) {
			lvId = lvId;
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
				"\" SET STRUCTURE = ?, FIELD = ?, OPERATOR = ?, VALUE = ? WHERE CONDITION_ID = ? AND ITEM = ?"
			);

			//Populate the fields with values from the incoming payload
			//Structure
			oStatement.setString(1, oBody.STRUCTURE);
			//Field
			oStatement.setString(2, oBody.FIELD);
			//Value
			oStatement.setString(3, oBody.VALUE);

			//Condition Id
			oStatement.setInt(4, parseFloat(oBody.CONDITION_ID));
			//Item
			oStatement.setInt(5, parseFloat(oBody.ITEM));

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
				"\" WHERE CONDITION_ID = ? AND ITEM = ?");

			//Condition Id
			oStatement.setInt(1, parseInt(oBody.CONDITION_ID));
			oStatement.setInt(2, parseInt(oBody.ITEM));

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
	// Function to delete entries from the table                         //
	// ----------------------------------------------------------------//
	function _deleteAll() {
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();

			//Build the Statement to delete the entries
			var oStatement = oConnection.prepareStatement("DELETE FROM \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" WHERE CONDITION_ID = ?");

			//Condition Id
			oStatement.setInt(1, parseInt(oBody.CONDITION_ID));

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