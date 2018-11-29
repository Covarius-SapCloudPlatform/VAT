(function() {
	// -------------------------------------------------------- // 
	// Description                                              //
	// -------------------------------------------------------- //
	// Author: Jacques Otto                                     //
	// Company: Covarius                                        //
	// Date: 2018-09-14                                         //
	// Description:REST service to be able to create entries    //
	// in the Mapping Table. POST method is allowed             //
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
	var gvTableName = 'COV_VAT_MAPPING';

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
				Status: gvStatus
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
					IN_TABLE: oResultSet.getString(1),
					IN_FIELD: oResultSet.getString(2),
					IN_TABLE_ALIAS: oResultSet.getString(3),
					OUT_TABLE: oResultSet.getString(4),
					OUT_FIELD: oResultSet.getString(5),
					OUT_TABLE_ALIAS: oResultSet.getString(6),
					MANDATORY: oResultSet.getString(7),
					RULE: oResultSet.getString(8)
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

			//Build the Statement to insert the entries
			var oStatement = oConnection.prepareStatement('INSERT INTO "' + gvSchemaName + '"."' + gvTableName +
				'" VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

			//Populate the fields with values from the incoming payload
			//In Table
			oStatement.setString(1, oBody.IN_TABLE);
			//In Field
			oStatement.setString(2, oBody.IN_FIELD);
			//In Table Alias
			oStatement.setString(3, oBody.IN_TABLE_ALIAS);
			//Out Table
			oStatement.setString(4, oBody.OUT_TABLE);
			//Out Field
			oStatement.setString(5, oBody.OUT_FIELD);
			//Out Table Alias
			oStatement.setString(6, oBody.OUT_TABLE_ALIAS);
			//Mandatory
			if (oBody.MANDATORY) {
				oStatement.setString(7, oBody.MANDATORY.toString());
			} else {
				oStatement.setInt(7, 0);
			}
			//Rule
			oStatement.setString(8, oBody.RULE);

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
		try {
			//Get the Request Body
			var oBody = JSON.parse($.request.body.asString());

			//Get the Database connection
			var oConnection = $.db.getConnection();
			var oStatement;
			//Build the Statement to update the entries
			var oStatement = oConnection.prepareStatement(
				"UPDATE \"" + gvSchemaName + "\".\"" + gvTableName +
				"\" SET RULE = ? WHERE IN_TABLE = ? AND IN_FIELD = ? AND OUT_TABLE = ? AND OUT_FIELD = ?"
			);

			//Populate the fields with values from the incoming payload
			//Rule
			oStatement.setString(1, oBody.RULE);
			//In Table
			oStatement.setString(2, oBody.IN_TABLE);
			//In Field
			oStatement.setInt(3, oBody.IN_FIELD);
			//Out Table
			oStatement.setInt(4, oBody.OUT_TABLE);
			//Out Field
			oStatement.setInt(5, oBody.OUT_FIELD);

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
				"\" WHERE IN_TABLE = ? AND IN_FIELD = ? AND OUT_TABLE = ? AND OUT_FIELD = ?");

			//In Table
			oStatement.setString(1, oBody.IN_TABLE);
			//In Field
			oStatement.setString(2, oBody.IN_FIELD);
			//Out Table
			oStatement.setString(3, oBody.OUT_TABLE);
			//Out Field
			oStatement.setString(4, oBody.OUT_FIELD);

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